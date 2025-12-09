"""Fetch model configuration files from HuggingFace."""

import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional

import httpx
from rich.console import Console
from tqdm import tqdm

from .config import CONFIG_FILES, HF_BASE_URL, TEMP_DIR

console = Console()

# HuggingFace Model API endpoint
HF_API_URL = "https://huggingface.co/api/models"

# Concurrent settings
MAX_WORKERS = 4
MAX_RETRIES = 3


class ModelFetcher:
    """Fetches model configuration files from HuggingFace."""

    def __init__(self, timeout: int = 30):
        self.timeout = timeout
        self.client = httpx.Client(timeout=timeout, follow_redirects=True)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.client.close()

    def get_model_dir(self, model_id: str) -> Path:
        """Get the local directory for a model.

        Format: data/temp/[org]/[model_name]/
        Example: Qwen/Qwen3-8B -> data/temp/Qwen/Qwen3-8B/
        """
        parts = model_id.split("/")
        if len(parts) != 2:
            raise ValueError(f"Invalid model_id format: {model_id}. Expected: org/model")

        org, model_name = parts
        model_dir = TEMP_DIR / org / model_name
        model_dir.mkdir(parents=True, exist_ok=True)
        return model_dir

    def fetch_model_metadata(self, model_id: str) -> Optional[dict]:
        """Fetch model metadata from HuggingFace API.

        Args:
            model_id: Model ID in format "org/model"

        Returns:
            Metadata dict with createdAt, lastModified, downloads, likes, etc.
        """
        url = f"{HF_API_URL}/{model_id}"

        try:
            resp = self.client.get(url)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                console.print(f"[yellow]  WARN metadata: Model not found[/yellow]")
                return None
            console.print(f"[yellow]  WARN metadata: HTTP {e.response.status_code}[/yellow]")
            return None
        except Exception as e:
            console.print(f"[yellow]  WARN metadata: {str(e)}[/yellow]")
            return None

    def fetch_file(self, model_id: str, filename: str) -> Optional[dict]:
        """Fetch a single configuration file from HuggingFace.

        Args:
            model_id: Model ID in format "org/model"
            filename: Name of the config file

        Returns:
            JSON content if successful, None if 404 or error
        """
        url = f"{HF_BASE_URL}/{model_id}/resolve/main/{filename}"

        try:
            resp = self.client.get(url)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None
            console.print(f"[yellow]  WARN {filename}: HTTP {e.response.status_code}[/yellow]")
            return None
        except json.JSONDecodeError:
            console.print(f"[yellow]  WARN {filename}: Invalid JSON[/yellow]")
            return None
        except Exception as e:
            console.print(f"[yellow]  WARN {filename}: {str(e)}[/yellow]")
            return None

    def save_config(self, model_dir: Path, filename: str, content: dict):
        """Save configuration to local file."""
        filepath = model_dir / filename
        filepath.write_text(
            json.dumps(content, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )

    def fetch_model(self, model_id: str, show_details: bool = False) -> dict:
        """Fetch all configuration files for a model.

        Always downloads and overwrites existing files.

        Args:
            model_id: Model ID in format "org/model"
            show_details: Whether to show detailed output (for error reporting)

        Returns:
            Dictionary of fetched configs: {filename: content, '_metadata': {createdAt: ...}}
        """
        model_dir = self.get_model_dir(model_id)
        result = {}

        # Fetch metadata from HuggingFace API (extract createdAt, params, pipeline_tag)
        metadata_response = self.fetch_model_metadata(model_id)
        if metadata_response:
            metadata = {}

            # Extract creation time
            created_at = metadata_response.get('createdAt')
            if created_at:
                metadata['createdAt'] = created_at

            # Extract accurate parameter count from safetensors
            safetensors = metadata_response.get('safetensors', {})
            total_params = safetensors.get('total')
            if total_params:
                metadata['totalParameters'] = total_params

            # Extract pipeline_tag for modality detection
            pipeline_tag = metadata_response.get('pipeline_tag')
            if pipeline_tag:
                metadata['pipelineTag'] = pipeline_tag

            # Extract tags for additional info
            tags = metadata_response.get('tags', [])
            if tags:
                metadata['tags'] = tags

            if metadata:
                result["_metadata"] = metadata

        # Fetch config files
        for filename in CONFIG_FILES:
            content = self.fetch_file(model_id, filename)

            if content:
                self.save_config(model_dir, filename, content)
                result[filename] = content

        return result

    def fetch_models(self, model_ids: list[str]) -> dict[str, dict]:
        """Fetch configurations for multiple models with concurrent execution and retry.

        Args:
            model_ids: List of model IDs

        Returns:
            Dictionary: {model_id: {filename: content}}
        """
        results = {}
        failed_models = []

        # Phase 1: Concurrent fetching with progress bar
        print()  # Add newline before progress bar
        with tqdm(total=len(model_ids), desc="Fetching models", unit="model") as pbar:
            with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
                # Submit all tasks
                future_to_model = {
                    executor.submit(self._fetch_with_error_handling, model_id): model_id
                    for model_id in model_ids
                }

                # Collect results as they complete
                for future in as_completed(future_to_model):
                    model_id = future_to_model[future]
                    configs, error = future.result()

                    if configs:
                        results[model_id] = configs
                    else:
                        failed_models.append((model_id, error))

                    pbar.update(1)

        # Phase 2: Retry failed models (up to MAX_RETRIES times)
        retry_count = 0
        while failed_models and retry_count < MAX_RETRIES:
            retry_count += 1
            console.print(f"\n[yellow]Retrying {len(failed_models)} failed model(s) (attempt {retry_count}/{MAX_RETRIES})...[/yellow]")

            current_failures = failed_models
            failed_models = []

            with tqdm(total=len(current_failures), desc=f"Retry {retry_count}", unit="model") as pbar:
                with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
                    future_to_model = {
                        executor.submit(self._fetch_with_error_handling, model_id): model_id
                        for model_id, _ in current_failures
                    }

                    for future in as_completed(future_to_model):
                        model_id = future_to_model[future]
                        configs, error = future.result()

                        if configs:
                            results[model_id] = configs
                        else:
                            failed_models.append((model_id, error))

                        pbar.update(1)

        # Summary
        success_count = sum(1 for configs in results.values() if configs)
        console.print(f"\n[bold green]Done![/bold green] {success_count}/{len(model_ids)} models fetched successfully.")

        # Report final failures
        if failed_models:
            console.print(f"\n[red]Failed to fetch {len(failed_models)} model(s) after {MAX_RETRIES} retries:[/red]")
            for model_id, error in failed_models:
                console.print(f"  - {model_id}: {error}")
                results[model_id] = {}  # Add empty entry for failed models

        return results

    def _fetch_with_error_handling(self, model_id: str) -> tuple[dict, Optional[str]]:
        """Fetch a model with error handling.

        Args:
            model_id: Model ID to fetch

        Returns:
            Tuple of (configs dict, error message or None)
        """
        try:
            configs = self.fetch_model(model_id)
            if not configs:
                return {}, "No configs found"
            return configs, None
        except Exception as e:
            return {}, str(e)

    def load_cached_configs(self, model_id: str) -> dict:
        """Load cached configuration files for a model.

        Args:
            model_id: Model ID in format "org/model"

        Returns:
            Dictionary of cached configs: {filename: content}
            Note: _metadata is NOT cached, must fetch fresh from API
        """
        model_dir = self.get_model_dir(model_id)
        result = {}

        # Load config files (no metadata caching)
        for filename in CONFIG_FILES:
            filepath = model_dir / filename
            if filepath.exists():
                try:
                    result[filename] = json.loads(filepath.read_text())
                except Exception as e:
                    console.print(f"[yellow]Warning: Failed to load {filepath}: {e}[/yellow]")

        return result
