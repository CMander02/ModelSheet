"""Configuration and constants."""

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

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
TEMP_DIR.mkdir(exist_ok=True)
