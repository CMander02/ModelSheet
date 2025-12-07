"""Utility functions for reading model lists."""

from pathlib import Path

import yaml
from rich.console import Console

console = Console()


def read_model_list(filepath: Path) -> list[str]:
    """Read model IDs from a configuration file.

    Supports:
    - .txt: One model ID per line
    - .yaml/.yml: YAML file with 'models' key containing list of model IDs or dicts

    Args:
        filepath: Path to configuration file

    Returns:
        List of model IDs in format "org/model"
    """
    if not filepath.exists():
        console.print(f"[red]Error: File not found: {filepath}[/red]")
        return []

    suffix = filepath.suffix.lower()

    if suffix == ".txt":
        return _read_txt(filepath)
    elif suffix in [".yaml", ".yml"]:
        return _read_yaml(filepath)
    else:
        console.print(f"[red]Error: Unsupported file format: {suffix}[/red]")
        console.print("Supported formats: .txt, .yaml, .yml")
        return []


def _read_txt(filepath: Path) -> list[str]:
    """Read model IDs from a text file.

    Each line should contain one model ID.
    Empty lines and lines starting with # are ignored.
    """
    model_ids = []
    lines = filepath.read_text(encoding="utf-8").splitlines()

    for line in lines:
        line = line.strip()
        # Skip empty lines and comments
        if not line or line.startswith("#"):
            continue
        model_ids.append(line)

    return model_ids


def _read_yaml(filepath: Path) -> list[str]:
    """Read model IDs from a YAML file.

    Expected format:
    ```yaml
    models:
      - Qwen/Qwen3-8B
      - meta-llama/Llama-3.2-1B
    ```

    Or with additional metadata (will be ignored):
    ```yaml
    models:
      - id: Qwen/Qwen3-8B
        tags: [qwen, medium]
      - id: meta-llama/Llama-3.2-1B
        tags: [llama, small]
    ```
    """
    try:
        content = yaml.safe_load(filepath.read_text(encoding="utf-8"))
    except yaml.YAMLError as e:
        console.print(f"[red]Error parsing YAML: {e}[/red]")
        return []

    if not isinstance(content, dict):
        console.print("[red]Error: YAML root must be a dictionary[/red]")
        return []

    models = content.get("models", [])
    if not isinstance(models, list):
        console.print("[red]Error: 'models' must be a list[/red]")
        return []

    model_ids = []
    for item in models:
        if isinstance(item, str):
            # Simple string format
            model_ids.append(item)
        elif isinstance(item, dict) and "id" in item:
            # Dict format with 'id' key
            model_ids.append(item["id"])
        else:
            console.print(f"[yellow]Warning: Skipping invalid entry: {item}[/yellow]")

    return model_ids


def validate_model_id(model_id: str) -> bool:
    """Validate model ID format.

    Args:
        model_id: Model ID to validate

    Returns:
        True if valid, False otherwise
    """
    parts = model_id.split("/")
    if len(parts) != 2:
        return False
    org, model = parts
    return bool(org) and bool(model)
