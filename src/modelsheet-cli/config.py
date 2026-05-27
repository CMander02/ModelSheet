"""Configuration and constants."""

import json
from pathlib import Path

# HuggingFace
HF_BASE_URL = "https://huggingface.co"
HF_MIRROR_URL = "https://hf-mirror.com"
HF_API_URL = "https://huggingface.co/api/models"
HF_MIRROR_API_URL = "https://hf-mirror.com/api/models"

# ModelScope
MS_BASE_URL = "https://modelscope.cn"
MS_API_URL = "https://modelscope.cn/api/v1/models"

# Files to fetch from HuggingFace / ModelScope
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
WATCHLIST_FILE = DATA_DIR / "watchlist.json"

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)


def load_providers_data() -> dict:
    """Load the full providers.json dict."""
    if not PROVIDERS_FILE.exists():
        return {}
    with open(PROVIDERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def build_org_region_map() -> dict[str, str]:
    """Return {hf_org: region} map, e.g. {"Qwen": "cn", "meta-llama": "global"}."""
    data = load_providers_data()
    result = {}
    for cfg in data.get("providers", {}).values():
        region = cfg.get("region", "global")
        for org in cfg.get("orgs", []):
            result[org] = region
        # also map scan.hf orgs
        for org in cfg.get("scan", {}).get("hf", []):
            result[org] = region
    return result


def build_hf_org_to_ms_org_map() -> dict[str, list[str]]:
    """Return {hf_org: [ms_org, ...]} map for CN providers that have ModelScope."""
    data = load_providers_data()
    result: dict[str, list[str]] = {}
    for cfg in data.get("providers", {}).values():
        if cfg.get("region") != "cn":
            continue
        ms_orgs = cfg.get("scan", {}).get("ms", [])
        if not ms_orgs:
            continue
        for hf_org in cfg.get("orgs", []) + cfg.get("scan", {}).get("hf", []):
            result[hf_org] = ms_orgs
    return result


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
