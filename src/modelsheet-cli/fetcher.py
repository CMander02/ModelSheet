"""Fetch model configuration files.

Strategy:
  - CN providers (region=cn in providers.json):
      1. Config files   → ModelScope API
      2. Metadata       → HuggingFace API (releasedAt, safetensors total)
      3. HF URL         → always constructed as https://huggingface.co/{org}/{model}
      4. Fallback       → HF Mirror if MS fails

  - Global providers:
      1. Config files   → HF Mirror (hf-mirror.com)
      2. Metadata       → HuggingFace API
"""

import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv
from rich.console import Console
from tqdm import tqdm

from .config import (
    CONFIG_FILES, TEMP_DIR, PROJECT_ROOT,
    HF_BASE_URL, HF_MIRROR_URL, HF_API_URL, HF_MIRROR_API_URL,
    MS_BASE_URL, MS_API_URL,
    build_org_region_map, build_hf_org_to_ms_org_map,
)

console = Console()

load_dotenv(PROJECT_ROOT / ".env")

MAX_WORKERS = 4
MAX_RETRIES = 3

# ModelScope uses different filenames for the same configs
MS_FILENAME_MAP = {
    "config.json": "config.json",
    "tokenizer_config.json": "tokenizer_config.json",
    "generation_config.json": "generation_config.json",
    "adapter_config.json": "adapter_config.json",
    "model.safetensors.index.json": "model.safetensors.index.json",
}


def get_hf_token() -> Optional[str]:
    return os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")


def is_valid_model_id(model_id: str) -> bool:
    if not model_id or not isinstance(model_id, str):
        return False
    parts = model_id.strip().split("/")
    return len(parts) == 2 and all(part.strip() for part in parts)


def _org_from_id(model_id: str) -> str:
    return model_id.split("/")[0] if "/" in model_id else ""


class ModelFetcher:
    """Fetches model configuration files from HuggingFace Mirror or ModelScope."""

    def __init__(self, timeout: int = 30, token: Optional[str] = None):
        self.timeout = timeout
        self.token = token or get_hf_token()

        hf_headers = {}
        if self.token:
            hf_headers["Authorization"] = f"Bearer {self.token}"
            console.print("[dim]Using HuggingFace token for authentication[/dim]")

        self.hf_client = httpx.Client(
            timeout=timeout, follow_redirects=True, headers=hf_headers
        )
        self.ms_client = httpx.Client(
            timeout=timeout, follow_redirects=True,
            headers={"User-Agent": "modelsheet-cli/1.0"}
        )

        # Build lookup tables once
        self._org_region = build_org_region_map()
        self._hf_to_ms   = build_hf_org_to_ms_org_map()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.hf_client.close()
        self.ms_client.close()

    # ── helpers ────────────────────────────────────────────────────────────

    def _is_cn(self, model_id: str) -> bool:
        return self._org_region.get(_org_from_id(model_id), "global") == "cn"

    def _ms_org(self, hf_org: str) -> Optional[str]:
        """Return the primary ModelScope org for a HF org, or None."""
        orgs = self._hf_to_ms.get(hf_org, [])
        return orgs[0] if orgs else None

    def get_model_dir(self, model_id: str) -> Path:
        parts = model_id.split("/")
        if len(parts) != 2:
            raise ValueError(f"Invalid model_id: {model_id}")
        return TEMP_DIR / parts[0] / parts[1]

    # ── HuggingFace ────────────────────────────────────────────────────────

    def fetch_hf_metadata(self, model_id: str) -> Optional[dict]:
        """Fetch model metadata from HuggingFace API (release date, safetensors, tags)."""
        urls = [f"{HF_API_URL}/{model_id}", f"{HF_MIRROR_API_URL}/{model_id}"]
        last_error = None
        for i, url in enumerate(urls):
            try:
                resp = self.hf_client.get(url)
                resp.raise_for_status()
                if i == 1:
                    console.print("[dim]  HF metadata fallback → hf-mirror[/dim]")
                return resp.json()
            except httpx.HTTPStatusError as e:
                last_error = e
                if e.response.status_code == 404:
                    return None
                continue
            except Exception as e:
                last_error = e
                continue

        if isinstance(last_error, httpx.HTTPStatusError):
            console.print(f"[yellow]  WARN HF metadata: HTTP {last_error.response.status_code}[/yellow]")
        elif last_error is not None:
            console.print(f"[yellow]  WARN HF metadata: {last_error}[/yellow]")
        return None

    def _fetch_hf_file(self, model_id: str, filename: str,
                       use_mirror: bool = True) -> Optional[dict]:
        """Fetch a single config file from HF or HF Mirror."""
        base = HF_MIRROR_URL if use_mirror else HF_BASE_URL
        url = f"{base}/{model_id}/resolve/main/{filename}"
        try:
            resp = self.hf_client.get(url)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None
            if e.response.status_code in (401, 403):
                return {"_error": "gated"}
            console.print(f"[yellow]  WARN HF {filename}: HTTP {e.response.status_code}[/yellow]")
            return None
        except json.JSONDecodeError:
            return None
        except Exception as e:
            console.print(f"[yellow]  WARN HF {filename}: {e}[/yellow]")
            return None

    def _fetch_hf_readme(self, model_id: str, use_mirror: bool = True) -> Optional[str]:
        base = HF_MIRROR_URL if use_mirror else HF_BASE_URL
        url = f"{base}/{model_id}/resolve/main/README.md"
        try:
            resp = self.hf_client.get(url)
            resp.raise_for_status()
            return resp.text
        except Exception:
            return None

    # ── ModelScope ─────────────────────────────────────────────────────────

    def _ms_model_id(self, hf_model_id: str) -> Optional[str]:
        """Convert HF model ID to ModelScope model ID.

        Tries same model name under the MS org.
        E.g. Qwen/Qwen3-8B → qwen-bot/Qwen3-8B
        """
        hf_org, model_name = hf_model_id.split("/", 1)
        ms_org = self._ms_org(hf_org)
        if not ms_org:
            return None
        return f"{ms_org}/{model_name}"

    def fetch_ms_metadata(self, ms_model_id: str) -> Optional[dict]:
        """Fetch model metadata from ModelScope API."""
        url = f"{MS_API_URL}/{ms_model_id}"
        try:
            resp = self.ms_client.get(url)
            resp.raise_for_status()
            data = resp.json()
            return data.get("Data", data)
        except Exception:
            return None

    def _fetch_ms_file(self, ms_model_id: str, filename: str) -> Optional[dict]:
        """Fetch a single config file from ModelScope."""
        url = f"{MS_BASE_URL}/models/{ms_model_id}/resolve/master/{filename}"
        try:
            resp = self.ms_client.get(url)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None
            console.print(f"[yellow]  WARN MS {filename}: HTTP {e.response.status_code}[/yellow]")
            return None
        except json.JSONDecodeError:
            return None
        except Exception as e:
            console.print(f"[yellow]  WARN MS {filename}: {e}[/yellow]")
            return None

    def _fetch_ms_readme(self, ms_model_id: str) -> Optional[str]:
        url = f"{MS_BASE_URL}/models/{ms_model_id}/resolve/master/README.md"
        try:
            resp = self.ms_client.get(url)
            resp.raise_for_status()
            return resp.text
        except Exception:
            return None

    # ── metadata extraction ────────────────────────────────────────────────

    def _extract_hf_metadata(self, raw: dict) -> dict:
        meta: dict = {}
        if released_at := raw.get("createdAt"):
            meta["releasedAt"] = released_at
        if sf := raw.get("safetensors", {}):
            if total := sf.get("total"):
                meta["totalParameters"] = total
        if tag := raw.get("pipeline_tag"):
            meta["pipelineTag"] = tag
        if tags := raw.get("tags", []):
            meta["tags"] = tags
        return meta

    # ── main fetch logic ───────────────────────────────────────────────────

    def fetch_model(self, model_id: str, use_cache: bool = True) -> dict:
        """Fetch all configuration files for a model.

        Returns dict of {filename: content, '_metadata': {...}}.
        """
        model_dir = self.get_model_dir(model_id)
        result: dict = {}
        is_cn = self._is_cn(model_id)

        # Cache hit
        if use_cache:
            cached = self._load_cached(model_id)
            if cached:
                result = cached
                result["_metadata"] = self._build_metadata(model_id, is_cn, result)
                return result

        # Fetch config files
        if is_cn:
            result = self._fetch_cn_model(model_id, model_dir)
        else:
            result = self._fetch_global_model(model_id, model_dir)

        # Always attach metadata (HF API is more reliable for params/dates)
        result["_metadata"] = self._build_metadata(model_id, is_cn, result)

        return result

    def _build_metadata(self, model_id: str, is_cn: bool, configs: dict) -> dict:
        """Build _metadata dict: try HF API first, MS as fallback for CN."""
        meta: dict = {}

        # HF API (primary source for releasedAt and totalParameters)
        hf_raw = self.fetch_hf_metadata(model_id)
        if hf_raw:
            meta.update(self._extract_hf_metadata(hf_raw))

        # Fallback to ModelScope release metadata when HF has no date.
        if is_cn and not meta.get("releasedAt"):
            ms_id = self._ms_model_id(model_id)
            if ms_id:
                ms_raw = self.fetch_ms_metadata(ms_id)
                if ms_raw and (released := ms_raw.get("CreatedAt") or ms_raw.get("created_at")):
                    meta["releasedAt"] = released

        # README from whichever source has configs
        readme = None
        if is_cn:
            ms_id = self._ms_model_id(model_id)
            if ms_id:
                readme = self._fetch_ms_readme(ms_id)
            if not readme:
                readme = self._fetch_hf_readme(model_id)
        else:
            readme = self._fetch_hf_readme(model_id)

        if readme:
            meta["readme"] = readme

        return meta

    def _fetch_cn_model(self, model_id: str, model_dir: Path) -> dict:
        """Fetch config files for a CN model: MS primary, HF Mirror fallback."""
        result: dict = {}
        ms_id = self._ms_model_id(model_id)

        if ms_id:
            for filename in CONFIG_FILES:
                content = self._fetch_ms_file(ms_id, filename)
                if content and "_error" not in content:
                    self._save(model_dir, filename, content)
                    result[filename] = content

        # Fallback: fetch any missing files from HF Mirror
        missing = [f for f in CONFIG_FILES if f not in result]
        for filename in missing:
            content = self._fetch_hf_file(model_id, filename, use_mirror=True)
            if content and "_error" not in content:
                self._save(model_dir, filename, content)
                result[filename] = content

        return result

    def _fetch_global_model(self, model_id: str, model_dir: Path) -> dict:
        """Fetch config files for a global model from HF Mirror."""
        result: dict = {}
        for filename in CONFIG_FILES:
            content = self._fetch_hf_file(model_id, filename, use_mirror=True)
            if content and "_error" not in content:
                self._save(model_dir, filename, content)
                result[filename] = content
        return result

    # ── cache ──────────────────────────────────────────────────────────────

    def _save(self, model_dir: Path, filename: str, content: dict):
        # No-op: config data flows in-memory from fetch → parse.
        # models.json / SQLite are the canonical store; disk cache is unnecessary.
        pass

    def _load_cached(self, model_id: str) -> dict:
        # Cache disabled — always fetch fresh. models.json is the single source of truth.
        return {}

    # ── batch fetch ────────────────────────────────────────────────────────

    def fetch_models(self, model_ids: list[str]) -> dict[str, dict]:
        results: dict = {}
        failed: list = []

        valid_ids = [m for m in model_ids if is_valid_model_id(m)]
        invalid_ids = [m for m in model_ids if not is_valid_model_id(m)]

        if invalid_ids:
            console.print(f"\n[yellow]Skipping {len(invalid_ids)} invalid model ID(s):[/yellow]")
            for mid in invalid_ids:
                console.print(f"  [dim]- {mid}[/dim]")

        if not valid_ids:
            console.print("[red]No valid model IDs to fetch.[/red]")
            return results

        print()
        with tqdm(total=len(valid_ids), desc="Fetching models", unit="model") as pbar:
            with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
                future_to_model = {
                    executor.submit(self._fetch_with_error_handling, mid): mid
                    for mid in valid_ids
                }
                for future in as_completed(future_to_model):
                    mid = future_to_model[future]
                    configs, error = future.result()
                    if configs:
                        results[mid] = configs
                    else:
                        failed.append((mid, error))
                    pbar.update(1)

        retry_count = 0
        while failed and retry_count < MAX_RETRIES:
            retry_count += 1
            console.print(f"\n[yellow]Retrying {len(failed)} failed model(s) (attempt {retry_count}/{MAX_RETRIES})...[/yellow]")
            current = failed
            failed = []
            with tqdm(total=len(current), desc=f"Retry {retry_count}", unit="model") as pbar:
                with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
                    future_to_model = {
                        executor.submit(self._fetch_with_error_handling, mid): mid
                        for mid, _ in current
                    }
                    for future in as_completed(future_to_model):
                        mid = future_to_model[future]
                        configs, error = future.result()
                        if configs:
                            results[mid] = configs
                        else:
                            failed.append((mid, error))
                        pbar.update(1)

        success = sum(1 for c in results.values() if c)
        console.print(f"\n[bold green]Done![/bold green] {success}/{len(valid_ids)} models fetched successfully.")

        if failed:
            console.print(f"\n[red]Failed to fetch {len(failed)} model(s) after {MAX_RETRIES} retries:[/red]")
            for mid, err in failed:
                console.print(f"  - {mid}: {err}")
                results[mid] = {}

        return results

    def _fetch_with_error_handling(self, model_id: str) -> tuple[dict, Optional[str]]:
        try:
            configs = self.fetch_model(model_id)
            return (configs, None) if configs else ({}, "No configs found")
        except Exception as e:
            return {}, str(e)
