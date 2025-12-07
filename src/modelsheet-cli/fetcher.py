"""Fetch model configuration files from HuggingFace."""

import json
from pathlib import Path
from typing import Optional

import httpx
from rich.console import Console

from .config import CONFIG_FILES, HF_BASE_URL, TEMP_DIR

console = Console()


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
        filepath.write_text(json.dumps(content, indent=2, ensure_ascii=False))

    def fetch_model(self, model_id: str) -> dict:
        """Fetch all configuration files for a model.

        Always downloads and overwrites existing files.

        Args:
            model_id: Model ID in format "org/model"

        Returns:
            Dictionary of fetched configs: {filename: content}
        """
        model_dir = self.get_model_dir(model_id)
        result = {}

        console.print(f"\n[bold cyan]Fetching {model_id}[/bold cyan]")

        for filename in CONFIG_FILES:
            content = self.fetch_file(model_id, filename)

            if content:
                self.save_config(model_dir, filename, content)
                result[filename] = content
                console.print(f"  [green]OK[/green] {filename}")
            else:
                console.print(f"  [white]--[/white] {filename} (not found)")

        return result

    def fetch_models(self, model_ids: list[str]) -> dict[str, dict]:
        """Fetch configurations for multiple models.

        Args:
            model_ids: List of model IDs

        Returns:
            Dictionary: {model_id: {filename: content}}
        """
        results = {}

        console.print(f"\n[bold]Fetching {len(model_ids)} models...[/bold]\n")

        for i, model_id in enumerate(model_ids, 1):
            console.print(f"[{i}/{len(model_ids)}]", end=" ")
            try:
                configs = self.fetch_model(model_id)
                results[model_id] = configs
            except Exception as e:
                console.print(f"[red]FAILED: {str(e)}[/red]")
                results[model_id] = {}

        # Summary
        success_count = sum(1 for configs in results.values() if configs)
        console.print(f"\n[bold green]Done![/bold green] {success_count}/{len(model_ids)} models fetched successfully.")

        return results

    def load_cached_configs(self, model_id: str) -> dict:
        """Load cached configuration files for a model.

        Args:
            model_id: Model ID in format "org/model"

        Returns:
            Dictionary of cached configs: {filename: content}
        """
        model_dir = self.get_model_dir(model_id)
        result = {}

        for filename in CONFIG_FILES:
            filepath = model_dir / filename
            if filepath.exists():
                try:
                    result[filename] = json.loads(filepath.read_text())
                except Exception as e:
                    console.print(f"[yellow]Warning: Failed to load {filepath}: {e}[/yellow]")

        return result
