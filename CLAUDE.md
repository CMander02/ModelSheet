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

# Scan for new models (diff against snapshot + database)
modelsheet scan                          # scan all tracked orgs (HF + MS)
modelsheet scan --source hf              # HuggingFace only
modelsheet scan --source hf --org Qwen  # specific org
modelsheet scan --show-skipped           # show filtered-out models
modelsheet scan --commit                 # save snapshot after review
modelsheet scan --commit --add           # scan + immediately add new models
```

### Running CLI directly with uv
```bash
uv run modelsheet add Qwen/Qwen2.5-7B
```

## Architecture

### CLI Tool Structure

The CLI is located in `src/modelsheet-cli/` with the following modules:

**Model Filtering** (`filters.py`):
- Applied during `add` and `scan` to exclude models that should not be recorded
- Skipped: quantized variants (AWQ, GPTQ, GGUF, Q4_K, Q8, INT4, FP8, etc.)
- Skipped: ASR / TTS models (pipeline_tag or model_type)
- Skipped: embedding, rerank, sentence-similarity models
- Skipped: ORM / PRM / reward models
- Skipped: diffusion image models (text-to-image, unconditional-image-generation)
- **Kept**: diffusion LMs (model with text-generation pipeline_tag), Mamba, RWKV, Jamba

**Org Scanner** (`scanner.py`):
- `modelsheet scan` fetches model lists from HuggingFace and/or ModelScope
- Diffs against `data/scan_snapshot.json` and the local database
- Reports new model candidates, with filter breakdown
- `--commit` saves the new snapshot; `--add` immediately ingests new HF models
- ModelScope org slugs configured per-provider via `"scan": {"ms": [...]}` in providers.json

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

### Parsed Fields

The CLI extracts the following fields from HuggingFace model configs:

#### Metadata Fields
| Python Name | JSON Name | Source | Description |
|-------------|-----------|--------|-------------|
| `id` | `id` | API modelId | HuggingFace model ID (e.g., "Qwen/Qwen2.5-7B") |
| `name` | `name` | modelId split | Display name (e.g., "Qwen2.5-7B") |
| `provider` | `provider` | modelId + PROVIDER_MAP | Mapped provider name |
| `huggingface_url` | `huggingfaceUrl` | String format | HuggingFace page URL |
| `tech_report` | `techReport` | (TODO) | Technical report URL |
| `arxiv_url` | `arxivUrl` | API tags (arxiv:XXXX.XXXXX) | arXiv paper URL |
| `created_at` | `createdAt` | API metadata | Model creation timestamp |
| `architecture_family` | `architectureFamily` | Post-processed from `architecture` via `scripts/add_architecture_family.py` | High-level family grouping (e.g. `Qwen2` covers `qwen2`/`qwen2_moe`/`qwen2_vl`/`qwen2_5_vl`/`qwen2_5_omni`) |

#### Parameter Fields
| Python Name | JSON Name | Source | Description |
|-------------|-----------|--------|-------------|
| `total_parameters` | `totalParameters` | API safetensors.total / calculated | Total parameter count |
| `active_parameters` | `activeParameters` | Calculated | Active parameters per token (MoE) |
| `embedding_parameters` | `embeddingParameters` | Calculated: vocab_size * hidden_size | Embedding layer parameter count |
| `non_embedding_parameters` | `nonEmbeddingParameters` | Calculated: total_parameters - embedding_parameters | Non-embedding layer parameters (Transformer layers) |
| `context_length` | `contextLength` | config.json max_position_embeddings | Max context length |
| `embedding_dim` | `embeddingDim` | config.json hidden_size | Embedding dimension |
| `vocab_size` | `vocabSize` | config.json vocab_size | Vocabulary size |

#### Architecture Fields
| Python Name | JSON Name | Source | Description |
|-------------|-----------|--------|-------------|
| `architecture` | `architecture` | config.json model_type | Architecture type (llama, qwen2, etc.) |
| `num_layers` | `numLayers` | config.json num_hidden_layers | Transformer layer count |
| `num_heads` | `numHeads` | config.json num_attention_heads | Attention head count |
| `num_kv_heads` | `numKvHeads` | config.json num_key_value_heads | KV head count (GQA) |
| `hidden_size` | `hiddenSize` | config.json hidden_size | Hidden layer dimension |
| `intermediate_size` | `intermediateSize` | config.json intermediate_size | FFN intermediate size |
| `position_encoding` | `positionEncoding` | Inferred (rope_theta/rope_scaling) | RoPE, ALiBi, etc. |
| `activation` | `activation` | config.json hidden_act | Activation function (silu, gelu) |
| `norm_type` | `normType` | Inferred (rms_norm_eps/layer_norm_eps) | RMSNorm or LayerNorm |
| `norm_eps` | `normEps` | config.json rms_norm_eps | Normalization epsilon |
| `attention_dropout` | `attentionDropout` | config.json attention_dropout | Attention dropout rate |
| `mlp_factor` | `mlpFactor` | Calculated: intermediate_size/hidden_size | MLP expansion factor |
| `gqa_ratio` | `gqaRatio` | Calculated: num_heads/num_kv_heads | GQA ratio |
| `torch_dtype` | `torchDtype` | config.json torch_dtype | Model data type (float16, bfloat16, float32, etc.) |

#### MoE Fields
| Python Name | JSON Name | Source | Description |
|-------------|-----------|--------|-------------|
| `is_moe` | `isMoe` | Inferred (num_experts > 1) | Whether MoE architecture |
| `num_experts` | `numExperts` | config.json n_routed_experts/num_local_experts | Routed expert count |
| `num_shared_experts` | `numSharedExperts` | config.json n_shared_experts | Shared expert count |
| `num_experts_per_token` | `numExpertsPerToken` | config.json num_experts_per_tok | Activated experts per token |
| `num_activated_experts` | `numActivatedExperts` | Calculated: routed + shared | Total activated experts |
| `moe_intermediate_size` | `moeIntermediateSize` | config.json moe_intermediate_size | Expert FFN size |

#### Parameter Provenance Fields (optional — for closed / rumored models)

Applied manually via `scripts/backfill_param_confidence.py` to placeholder entries
whose parameter counts are not observable from a real `config.json`.

| Python Name | JSON Name | Values | Description |
|-------------|-----------|--------|-------------|
| `parameter_confidence` | `parameterConfidence` | `"official"` / `"reported"` / `"rumored"` | Trustworthiness of `totalParameters` / `activeParameters`. Omitted ⇒ treated as `"official"`. |
| `parameter_source` | `parameterSource` | free-form string | Short human-readable attribution (e.g. `"SemiAnalysis (2023)"`, `"Brown et al. 2020"`) |
| `parameter_source_url` | `parameterSourceUrl` | URL | Optional link to the source |

Semantics:
- **official** — derived from the model's own `config.json`, safetensors index, or an official paper/spec sheet. All parser-produced entries are implicitly official; no explicit field needed.
- **reported** — acknowledged third-party disclosure that the model provider has not officially confirmed, but is treated as reliable by the community.
- **rumored** — unverified community estimate. Frontend renders with a `~` prefix and help icon, in muted style.
- When `totalParameters` is `null`, the frontend renders an em-dash and still shows `parameterSource` as a hover tooltip if present.

### Extractor Modules

The field extraction logic is modularized in `src/modelsheet-cli/extractors/`:
- `base.py`: ConfigContext and helper functions
- `metadata.py`: ID, name, provider, URLs, timestamps
- `architecture.py`: Architecture-related fields with fallback keys
- `moe.py`: MoE-specific fields
- `parameters.py`: Parameter calculation (dense and MoE)

### MoE Parameter Calculation

The parser handles MoE (Mixture of Experts) models specially:

1. **Total Parameters**: Sum of all experts across all layers
2. **Active Parameters**: Only the experts activated per token
3. **Shared Experts**: Always active, counted separately from routed experts

Formula in `parameters.py:_calc_moe_params()`:
```python
# Each expert: gate_proj + up_proj + down_proj (3 matrices for SwiGLU)
params_per_routed_expert = 3 * hidden_size * moe_intermediate_size

# Total = embedding + attention + all_routed_experts + all_shared_experts
# Active = embedding + attention + activated_routed_experts + all_shared_experts
```

### Provider Mapping

Provider mapping is configured in `data/providers.json` - a single source of truth for both CLI and frontend:

```json
{
  "providers": {
    "Qwen Team": {
      "orgs": ["Qwen", "alibaba-PAI", "Alibaba-NLP"],
      "i18n": { "en": "Qwen Team", "zh": "通义千问团队" }
    }
  }
}
```

- **CLI** (`config.py:load_provider_map()`): Reads JSON and builds org → display name mapping
- **Frontend** (`i18n.ts`): Imports JSON and builds display name → localized name mapping

Example flow:
1. HuggingFace org: `Qwen`
2. CLI maps to display name: `Qwen Team` (stored in models.json)
3. Frontend translates: `通义千问团队` (zh) or `Qwen Team` (en)

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

## Git Policy

**重要**: Git 操作（commit、checkout、reset、push 等）只能在用户明确要求时执行。Claude 不得在未经用户要求的情况下自行执行 Git 命令。

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
