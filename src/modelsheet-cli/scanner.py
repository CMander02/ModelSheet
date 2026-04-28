"""Scan HuggingFace and ModelScope orgs for new models and diff against database."""

import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional

import httpx
from rich.console import Console

from .config import DATA_DIR, OUTPUT_FILE, load_provider_map
from .filters import skip_reason

console = Console()

HF_API_URL = "https://huggingface.co/api"
MS_API_URL = "https://modelscope.cn/api/v1"

# Snapshot file stores org→[model_ids] from last scan
SNAPSHOT_FILE = DATA_DIR / "scan_snapshot.json"

MAX_WORKERS = 4


def _get_hf_token() -> Optional[str]:
    return os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")


def _get_ms_token() -> Optional[str]:
    return os.environ.get("MS_TOKEN") or os.environ.get("MODELSCOPE_API_TOKEN")


# ---------------------------------------------------------------------------
# HuggingFace scanning
# ---------------------------------------------------------------------------

def fetch_hf_org_models(
    org: str,
    client: httpx.Client,
    limit: int = 500,
) -> list[dict]:
    """Fetch all model cards for an org from HuggingFace API.

    Returns list of dicts with keys: id, pipeline_tag, tags, createdAt.
    """
    models = []
    url = f"{HF_API_URL}/models"
    params = {
        "author": org,
        "limit": limit,
        "full": "false",
        "cardData": "false",
        "sort": "createdAt",
        "direction": -1,
    }

    try:
        resp = client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
        for m in data:
            models.append({
                "id": m.get("id", ""),
                "pipeline_tag": m.get("pipeline_tag"),
                "tags": m.get("tags", []),
                "created_at": m.get("createdAt"),
                "source": "huggingface",
            })
    except Exception as e:
        console.print(f"[yellow]  WARN HF {org}: {e}[/yellow]")

    return models


# ---------------------------------------------------------------------------
# ModelScope scanning
# ---------------------------------------------------------------------------

def fetch_ms_org_models(
    org: str,
    client: httpx.Client,
    limit: int = 200,
) -> list[dict]:
    """Fetch all models for an org from ModelScope API.

    Returns list of dicts compatible with HF format.
    """
    models = []
    url = f"{MS_API_URL}/models"
    params = {
        "owner": org,
        "page_size": limit,
        "page_number": 1,
    }
    headers = {}
    token = _get_ms_token()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        resp = client.get(url, params=params, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        items = data.get("Data", {}).get("Models", []) or data.get("data", {}).get("models", []) or []
        for m in items:
            ms_id = m.get("Path") or m.get("Name") or ""
            models.append({
                "id": ms_id,
                "pipeline_tag": m.get("Tasks", [None])[0] if m.get("Tasks") else None,
                "tags": m.get("Tags", []),
                "created_at": m.get("CreatedAt") or m.get("created_at"),
                "source": "modelscope",
            })
    except Exception as e:
        console.print(f"[yellow]  WARN MS {org}: {e}[/yellow]")

    return models


# ---------------------------------------------------------------------------
# Snapshot management
# ---------------------------------------------------------------------------

def load_snapshot() -> dict:
    """Load previous scan snapshot. Keys: hf/<org> or ms/<org> → [model_ids]."""
    if not SNAPSHOT_FILE.exists():
        return {}
    try:
        return json.loads(SNAPSHOT_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_snapshot(snapshot: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    SNAPSHOT_FILE.write_text(
        json.dumps(snapshot, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


# ---------------------------------------------------------------------------
# Filtering helpers
# ---------------------------------------------------------------------------

def _apply_filters(models: list[dict]) -> tuple[list[dict], list[tuple[str, str]]]:
    """Split models into (keep, skipped) based on filter rules.

    Returns:
        kept: models that pass all filters
        skipped: list of (model_id, reason) tuples
    """
    kept = []
    skipped = []
    for m in models:
        reason = skip_reason(
            model_id=m["id"],
            pipeline_tag=m.get("pipeline_tag"),
            tags=m.get("tags"),
        )
        if reason:
            skipped.append((m["id"], reason))
        else:
            kept.append(m)
    return kept, skipped


# ---------------------------------------------------------------------------
# Main scan logic
# ---------------------------------------------------------------------------

def scan_orgs(
    orgs: list[tuple[str, str]],   # list of (source, org) — source: "hf" or "ms"
    apply_filters: bool = True,
    show_skipped: bool = False,
) -> dict:
    """Scan orgs, diff against snapshot, and return new model candidates.

    Args:
        orgs: list of (source, org_name) pairs
        apply_filters: whether to apply skip filters
        show_skipped: whether to print skipped model details

    Returns:
        dict with keys:
            new_models: list of model dicts that are new since last snapshot
            all_models: full list of models found (after filtering)
            skipped: list of (model_id, reason) tuples
            snapshot_updated: new snapshot dict (call save_snapshot to persist)
    """
    snapshot = load_snapshot()
    all_fetched: list[dict] = []
    all_skipped: list[tuple[str, str]] = []

    # Build HTTP client
    headers = {}
    token = _get_hf_token()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    with httpx.Client(timeout=30, follow_redirects=True) as hf_client:
        with httpx.Client(timeout=30, follow_redirects=True) as ms_client:

            def fetch_org(source_org):
                source, org = source_org
                if source == "hf":
                    models = fetch_hf_org_models(org, hf_client)
                else:
                    models = fetch_ms_org_models(org, ms_client)
                return source, org, models

            with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
                futures = {executor.submit(fetch_org, so): so for so in orgs}
                for future in as_completed(futures):
                    source, org, models = future.result()
                    console.print(f"  {source}/{org}: {len(models)} models found")
                    all_fetched.extend(models)

    # Apply filters
    if apply_filters:
        kept, skipped = _apply_filters(all_fetched)
        all_skipped.extend(skipped)
    else:
        kept = all_fetched

    if show_skipped and all_skipped:
        console.print(f"\n[dim]Filtered out {len(all_skipped)} models:[/dim]")
        for mid, reason in all_skipped[:20]:
            console.print(f"  [dim]- {mid}: {reason}[/dim]")
        if len(all_skipped) > 20:
            console.print(f"  [dim]... and {len(all_skipped) - 20} more[/dim]")

    # Load database to find already-tracked models
    known_ids: set[str] = set()
    if OUTPUT_FILE.exists():
        try:
            db = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
            known_ids = {m["id"] for m in db}
        except Exception:
            pass

    # Build new snapshot
    new_snapshot = dict(snapshot)
    for source, org in orgs:
        key = f"{source}/{org}"
        org_models = [m["id"] for m in kept if m.get("source") == source
                      and m["id"].split("/")[0].lower() == org.lower()]
        new_snapshot[key] = org_models

    # Compute diff: models in new snapshot but not in previous snapshot AND not in DB
    prev_all_ids: set[str] = set()
    for key, ids in snapshot.items():
        prev_all_ids.update(ids)

    new_model_candidates = [
        m for m in kept
        if m["id"] not in known_ids and m["id"] not in prev_all_ids
    ]

    # Also find models in DB that now appear on source (for cross-reference)
    return {
        "new_models": new_model_candidates,
        "all_models": kept,
        "skipped": all_skipped,
        "snapshot_updated": new_snapshot,
    }


def get_scan_orgs_from_providers(source_filter: Optional[str] = None) -> list[tuple[str, str]]:
    """Build (source, org) list from providers.json.

    providers.json entries may have a "scan" field:
        "scan": {
            "hf": ["Qwen"],
            "ms": ["qwen-bot"]
        }
    If no "scan" field, falls back to using the "orgs" list for HF.

    Args:
        source_filter: if "hf" or "ms", only return that source

    Returns:
        List of (source, org) tuples
    """
    try:
        from .config import PROVIDERS_FILE
        data = json.loads(PROVIDERS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []

    hf_entries = []
    ms_entries = []
    for _display_name, info in data.get("providers", {}).items():
        scan = info.get("scan", {})
        hf_orgs = scan.get("hf", info.get("orgs", []))
        ms_orgs = scan.get("ms", [])
        is_cn = info.get("region") == "cn"

        if source_filter != "ms":
            for org in hf_orgs:
                hf_entries.append(("hf", org, is_cn))
        if source_filter != "hf":
            for org in ms_orgs:
                ms_entries.append(("ms", org, is_cn))

    # CN providers: ms first, then hf. Global providers: hf only (no ms entries).
    # Within each source, cn orgs appear before global orgs.
    result = []
    for source, org, _ in sorted(ms_entries, key=lambda x: (not x[2],)):
        result.append((source, org))
    for source, org, is_cn in sorted(hf_entries, key=lambda x: (not x[2],)):
        result.append((source, org))

    return result
