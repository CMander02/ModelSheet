# ModelSheet CLI

CLI tool for fetching and parsing LLM model configurations from HuggingFace.

## Installation

```bash
# Install dependencies
uv sync

# Install in editable mode (recommended - enables 'modelsheet' command)
uv pip install -e .
```

## Quick Start

```bash
# 1. Create a model list file
cat > models.txt << EOF
Qwen/Qwen2.5-7B-Instruct
mistralai/Mistral-7B-Instruct-v0.3
EOF

# 2. One-stop update
modelsheet update --file models.txt

# 3. Check output
cat data/models.json
```

## Usage

### Method 1: Direct Command (Recommended)

After installing with `uv pip install -e .`:

```bash
# One-stop update (recommended)
modelsheet update --file models.txt

# View model details
modelsheet info Qwen/Qwen2.5-7B-Instruct

# List cached models
modelsheet list-cache

# Get help
modelsheet --help
modelsheet fetch --help
```

### Method 2: Run as Module

Without installation:

```bash
python -m modelsheet_cli update --file models.txt
python -m modelsheet_cli info Qwen/Qwen2.5-7B-Instruct
```

## Commands

### `update` - One-Stop Update (Recommended)

```bash
# Basic usage
modelsheet update --file models.txt

# Custom output path
modelsheet update -f models.yaml -o web/public/data/models.json

# With timeout for slow networks
modelsheet update -f models.txt --timeout 60
```

Performs all steps: fetch → parse → export

### `fetch` - Download Configurations

```bash
# From file
modelsheet fetch --file models.txt
modelsheet fetch -f models.yaml

# Single model
modelsheet fetch --model Qwen/Qwen2.5-7B-Instruct
modelsheet fetch -m mistralai/Mistral-7B-v0.3

# Custom timeout
modelsheet fetch -f models.txt --timeout 60
```

Downloads config files to `data/temp/[org]/[model]/`

### `parse` - Parse Configurations

```bash
# Parse all from file
modelsheet parse --file models.txt

# Parse single model
modelsheet parse --model Qwen/Qwen2.5-7B-Instruct
```

Extracts structured information from cached configs.

### `export` - Export to JSON

```bash
# Default output (data/models.json)
modelsheet export --file models.txt

# Custom output path
modelsheet export -f models.yaml -o custom.json

# Compact format
modelsheet export -f models.txt --compact
```

### `list-cache` - List Cached Models

```bash
modelsheet list-cache
```

Shows all models in cache with file counts.

### `info` - Show Model Details

```bash
modelsheet info Qwen/Qwen2.5-7B-Instruct
modelsheet info mistralai/Mixtral-8x7B-Instruct-v0.1
```

Displays detailed parsed information for a model.

## Model List Formats

### Text Format (.txt)

```txt
# Comments start with #
Qwen/Qwen2.5-7B-Instruct
mistralai/Mistral-7B-Instruct-v0.3

# Empty lines are ignored
deepseek-ai/DeepSeek-V3
```

### YAML Format (.yaml)

```yaml
models:
  # Simple list
  - Qwen/Qwen2.5-7B-Instruct
  - mistralai/Mistral-7B-Instruct-v0.3

  # With metadata (metadata is ignored)
  - id: deepseek-ai/DeepSeek-V3
    tags: [moe, large]
```

## Directory Structure

```
data/
├── temp/                    # Downloaded config files
│   ├── Qwen/
│   │   └── Qwen2.5-7B-Instruct/
│   │       ├── config.json
│   │       ├── tokenizer_config.json
│   │       └── ...
│   └── meta-llama/
│       └── Llama-3.2-1B/
│           └── ...
└── models.json              # Final exported data
```

## Features

- ✅ Download model configs from HuggingFace
- ✅ Support `.txt` and `.yaml` config files
- ✅ Parse and extract key parameters
- ✅ Export to JSON for frontend consumption
- ✅ Cache downloaded files (always overwrite on re-fetch)
- ✅ Rich terminal output with colors
