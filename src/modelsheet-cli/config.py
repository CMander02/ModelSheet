"""Configuration and constants."""

import json
from pathlib import Path

# HuggingFace API
HF_BASE_URL = "https://huggingface.co"

# Files to fetch from HuggingFace
CONFIG_FILES = [
    "config.json",
    "tokenizer_config.json",
    "generation_config.json",
    "adapter_config.json",
    "model.safetensors.index.json",
]

# Project paths
PROJECT_ROOT = Path(__file__).parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
TEMP_DIR = DATA_DIR / "temp"
OUTPUT_FILE = DATA_DIR / "models.json"
PROVIDERS_FILE = DATA_DIR / "providers.json"

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
TEMP_DIR.mkdir(exist_ok=True)


def load_provider_map() -> dict[str, str]:
    """Load provider mapping from providers.json.

    Returns:
        Dictionary mapping HuggingFace org name to display name.
        Example: {"Qwen": "Qwen Team", "meta-llama": "Llama Team"}
    """
    if not PROVIDERS_FILE.exists():
        return {}

    with open(PROVIDERS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    provider_map = {}
    for display_name, config in data.get("providers", {}).items():
        for org in config.get("orgs", []):
            provider_map[org] = display_name

    return provider_map
