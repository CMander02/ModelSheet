# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ModelSheet 是一个开源 LLM 模型参数速查与对比工具。通过获取 HuggingFace 上模型的配置文件，解析并展示模型的核心参数。

**核心特点**：
- CLI 工具从 HuggingFace 抓取模型配置并解析为结构化 JSON
- 数据本地生成，人工校验后推送（不在 CI 中调用 LLM，避免幻觉）
- 前端（计划中）为纯静态 SPA，部署在 GitHub Pages

## Development Commands

### Setup
```bash
# Install dependencies (使用 uv，推荐)
uv sync

# Install in editable mode (安装后可直接使用 modelsheet 命令)
uv pip install -e .

# Or with pip
pip install -e .
```

### CLI Usage
```bash
# Add single model
modelsheet add Qwen/Qwen2.5-7B

# Add multiple models (like pip install)
modelsheet add Qwen/Qwen2.5-7B mistralai/Mistral-7B-v0.3 google/gemma-2-9b

# Add from file
modelsheet add --file models.txt

# View model details
modelsheet show Qwen/Qwen2.5-7B

# List all models
modelsheet list

# Remove models
modelsheet remove --model Qwen/Qwen2.5-0.5B
modelsheet remove --file models_to_remove.txt
```

### Running CLI directly with uv
```bash
uv run modelsheet add Qwen/Qwen2.5-7B
```

## Architecture

### CLI Tool Structure

The CLI is located in `src/modelsheet-cli/` with the following modules:

**Data Pipeline (3-stage)**:
1. **Fetcher** (`fetcher.py`): Downloads config files from HuggingFace
   - Concurrent fetching (ThreadPoolExecutor, max_workers=4)
   - Automatic retry (up to 3 attempts)
   - Downloads to `data/temp/{org}/{model}/`
   - Fetches: config.json, tokenizer_config.json, generation_config.json, adapter_config.json, model.safetensors.index.json
   - Also fetches metadata from HuggingFace API for accurate parameter counts and createdAt timestamp

2. **Parser** (`parser.py`): Extracts structured data from configs
   - Handles dense and MoE architectures differently
   - Calculates parameters, MLP factors, GQA ratios
   - MoE parameter calculation includes handling of `first_k_dense_replace` (DeepSeek models)
   - Uses API metadata (`totalParameters`) when available for accuracy
   - Returns `ParsedModel` dataclass instances

3. **Exporter** (`exporter.py`): Converts to frontend JSON format
   - snake_case (Python) → camelCase (JSON/TypeScript)
   - Adds `updatedAt` timestamp
   - Outputs to `data/models.json`

**Key Classes**:
- `ModelFetcher`: HTTP client wrapper for HuggingFace API
- `ModelParser`: Config file parser with architecture detection
- `ParsedModel`: Dataclass for structured model information
- `ModelExporter`: JSON serializer with field name conversion

### Configuration

`config.py` contains all paths and constants:
- `HF_BASE_URL`: HuggingFace base URL
- `CONFIG_FILES`: List of config files to fetch
- `DATA_DIR`, `TEMP_DIR`, `OUTPUT_FILE`: File system paths

### CLI Commands

`cli.py` uses Typer with Rich theme customization:
- `add`: Add models (supports single, multiple, or file input)
- `remove`: Remove models from database
- `list`: List all models
- `show`: Display detailed model information

**Note**: All commands now use tqdm progress bars and concurrent operations by default.

## Important Implementation Details

### MoE Parameter Calculation

The parser handles MoE (Mixture of Experts) models specially:

1. **Total Parameters**: Sum of all experts across all layers
2. **Active Parameters**: Only the experts activated per token
3. **Dense Layers**: Some models (DeepSeek) have initial dense layers (`first_k_dense_replace`)
4. **Shared Experts**: Always active, counted separately from routed experts

Formula in `_calc_moe_params()`:
```python
# Each routed expert: gate_proj + up_proj + down_proj (3 weight matrices)
params_per_routed_expert = 3 * hidden_size * moe_intermediate_size

# Total = embedding + attention + dense_ffn + routed_experts + shared_experts
# Active = embedding + attention + dense_ffn + active_experts + shared_experts
```

### Provider Mapping

`PROVIDER_MAP` in `parser.py` maps HuggingFace org names to display names:
- `meta-llama` → Meta
- `Qwen` → Alibaba
- `mistralai` → Mistral AI
- etc.

### Field Name Conversion

Python uses snake_case, JSON uses camelCase:
- `total_parameters` → `totalParameters`
- `context_length` → `contextLength`
- `num_layers` → `numLayers`

This conversion happens in `exporter.py:_to_frontend_format()`.

### Concurrent Fetching

Since the recent update, fetching is concurrent by default:
- Uses `ThreadPoolExecutor` with `max_workers=4`
- Thread-safe: each model writes to separate directory in `data/temp/`
- Final merge to `models.json` is serial (no race conditions)
- Failed models are retried up to 3 times automatically

### Progress Display

- Uses `tqdm` for progress bars during fetch and parse stages
- Simplified output: only shows progress bars and final summary
- Detailed errors only shown when failures occur

## Data Format

### Input: HuggingFace Config Files

Expected config.json structure (example):
```json
{
  "model_type": "qwen2",
  "hidden_size": 3584,
  "num_hidden_layers": 28,
  "num_attention_heads": 28,
  "num_key_value_heads": 4,
  "intermediate_size": 18944,
  "vocab_size": 152064,
  "max_position_embeddings": 32768,
  "rope_theta": 1000000.0,
  "hidden_act": "silu",
  "rms_norm_eps": 1e-06
}
```

### Output: models.json

Exported JSON structure:
```json
{
  "id": "Qwen/Qwen2.5-7B",
  "name": "Qwen2.5-7B",
  "provider": "Alibaba",
  "huggingfaceUrl": "https://huggingface.co/Qwen/Qwen2.5-7B",
  "totalParameters": 7615616000,
  "contextLength": 32768,
  "architecture": "qwen2",
  "numLayers": 28,
  "numHeads": 28,
  "numKvHeads": 4,
  "hiddenSize": 3584,
  "intermediateSize": 18944,
  "positionEncoding": "RoPE",
  "activation": "silu",
  "normType": "RMSNorm",
  "normEps": 1e-06,
  "mlpFactor": 5.29,
  "gqaRatio": 7.0,
  "isMoe": false,
  "hasChatTemplate": true,
  "isAdapter": false,
  "createdAt": "2024-09-18T09:53:43.000Z",
  "updatedAt": "2025-12-07T05:41:45.173166Z"
}
```

## Workflow

### Adding New Models

1. 运行 CLI 获取和解析模型配置：
   ```bash
   modelsheet add Qwen/Qwen2.5-7B mistralai/Mistral-7B-v0.3
   ```

2. 人工检查 `data/models.json` 的准确性

3. 提交更改：
   ```bash
   git add data/models.json
   git commit -m "feat: add Qwen2.5-7B and Mistral-7B-v0.3"
   git push
   ```

### Code Modifications

When modifying the CLI:
- **Fetcher changes**: Impact how data is downloaded (HTTP requests, caching)
- **Parser changes**: Impact how configs are interpreted (field extraction, calculations)
- **Exporter changes**: Impact JSON output format (field names, structure)
- **CLI changes**: Impact user interface (commands, arguments, help text)

Always test with a small sample of models first:
```bash
modelsheet add Qwen/Qwen2.5-0.5B  # Small model for testing
```

## Project Structure Notes

### Actual Structure (as of now)
```
ModelSheet/
├── src/                   # source code
│   ├── modelsheet-cli/             # CLI tool (实际实现)
│   └── modelsheet-web/       # Web Frontend
├── data/                  # Generated data
│   ├── temp/             # Downloaded configs cache
│   └── models.json       # Exported model data
├── docs/                  # Design docs
└── pyproject.toml
```


### Package Configuration

- Package name: `modelsheet`
- Entry point: `modelsheet_cli.cli:app`
- Module directory mapping: `{"modelsheet_cli": "src/modelsheet-cli"}`

This unusual mapping means imports use `modelsheet_cli` but files are in `src/modelsheet-cli/`.

## Key Dependencies

- **httpx**: HTTP client for fetching from HuggingFace (supports async, though currently using sync)
- **typer**: CLI framework with automatic help generation
- **rich**: Terminal formatting and theming
- **tqdm**: Progress bars for concurrent operations
- **pyyaml**: YAML file parsing for model lists

## Design Principles

1. **数据准确性优先**: 本地生成数据，人工校验后推送（不在 CI 中调用 LLM）
2. **纯静态部署**: 前端为纯静态 SPA，无后端依赖
3. **简单可维护**: Python CLI + React 前端，主流技术栈

## Common Issues

### Path Issues
The project root detection uses `Path(__file__).parent.parent.parent` in config.py. If imports fail, check that the package structure matches expectations.

### MoE Models
When adding MoE models, verify both `totalParameters` and `activeParameters` are calculated. The parser should detect:
- `num_local_experts` or `num_experts` or `n_routed_experts`
- `num_experts_per_tok` or `num_experts_per_token`
- `first_k_dense_replace` for DeepSeek-style models

### Concurrent Safety
File writes are safe because:
- Temp files go to `data/temp/{org}/{model}/` (isolated paths)
- Final `models.json` write happens after all fetching completes
- Only one CLI instance should run at a time (no multi-process locking)
- use uv to manage the cli environment
