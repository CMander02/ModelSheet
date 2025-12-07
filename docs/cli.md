# CLI 数据处理设计文档

## 1. 概述

CLI 工具负责从 HuggingFace 获取模型配置文件，解析提取关键参数，并导出为前端可用的 JSON 格式。

## 2. 技术选型

| 选项 | 选择 | 原因 |
|------|------|------|
| 语言 | Python 3.13+ | 生态丰富，易于理解 |
| HTTP | httpx | 异步支持，现代 API |
| CLI 框架 | typer | 类型提示，自动补全 |
| 配置 | YAML | 人类可读，易于编辑 |
| 输出 | JSON | 前端直接消费 |

## 3. 命令设计

### 3.1 命令总览

```bash
# 查看帮助
modelsheet --help

# 添加模型到列表
modelsheet add meta-llama/Llama-3.2-1B

# 从列表移除模型
modelsheet remove meta-llama/Llama-3.2-1B

# 列出所有模型
modelsheet list

# 获取所有模型的配置文件
modelsheet fetch [--model MODEL_ID] [--force]

# 解析配置文件，生成数据
modelsheet parse [--model MODEL_ID]

# 导出为前端 JSON
modelsheet export [--output PATH]

# 一键执行: fetch + parse + export
modelsheet update [--force]

# 验证数据完整性
modelsheet validate
```

### 3.2 命令详解

#### `modelsheet add <model_id>`

添加模型到监控列表。

```bash
$ modelsheet add Qwen/Qwen2.5-72B-Instruct
✓ Added: Qwen/Qwen2.5-72B-Instruct
  Total models: 15
```

#### `modelsheet fetch`

从 HuggingFace 下载配置文件。

```bash
$ modelsheet fetch
Fetching 15 models...
[1/15] meta-llama/Llama-3.2-1B
  ✓ config.json
  ✓ tokenizer_config.json
  ✓ generation_config.json
  ✗ adapter_config.json (404)
[2/15] Qwen/Qwen2.5-72B-Instruct
  ...
Done! 14 succeeded, 1 failed.
```

选项:
- `--model MODEL_ID`: 仅获取指定模型
- `--force`: 强制重新下载（忽略缓存）
- `--timeout`: 请求超时时间（默认 30s）

#### `modelsheet parse`

解析配置文件，提取结构化数据。

```bash
$ modelsheet parse
Parsing 15 models...
[1/15] meta-llama/Llama-3.2-1B
  ✓ Parsed: 1.24B params, 131072 ctx, RoPE
[2/15] Qwen/Qwen2.5-72B-Instruct
  ✓ Parsed: 72.7B params, 131072 ctx, RoPE
...
Done! 15 parsed.
```

#### `modelsheet export`

导出为前端使用的 JSON 文件。

```bash
$ modelsheet export
Exporting to web/public/data/models.json...
✓ Exported 15 models (24.5 KB)
```

选项:
- `--output PATH`: 自定义输出路径
- `--pretty`: 格式化 JSON（默认压缩）

#### `modelsheet update`

一键执行完整流程。

```bash
$ modelsheet update
[Step 1/3] Fetching models...
[Step 2/3] Parsing configs...
[Step 3/3] Exporting JSON...
✓ All done! 15 models updated.
```

## 4. 数据流设计

### 4.1 文件结构

```
cli/
├── models.yaml              # 模型列表配置
├── cache/                   # 配置文件缓存
│   ├── meta-llama/
│   │   └── Llama-3.2-1B/
│   │       ├── config.json
│   │       ├── tokenizer_config.json
│   │       └── generation_config.json
│   └── Qwen/
│       └── Qwen2.5-72B-Instruct/
│           └── ...
└── output/
    └── models.json          # 解析后的数据
```

### 4.2 models.yaml 格式

```yaml
# 模型列表配置
models:
  # Llama 系列
  - id: meta-llama/Llama-3.2-1B
    tags: [llama, meta, small]
  - id: meta-llama/Llama-3.2-3B
    tags: [llama, meta, small]
  - id: meta-llama/Llama-3.1-8B-Instruct
    tags: [llama, meta, medium, instruct]
  - id: meta-llama/Llama-3.1-70B-Instruct
    tags: [llama, meta, large, instruct]
  - id: meta-llama/Llama-3.1-405B
    tags: [llama, meta, xlarge]

  # Qwen 系列
  - id: Qwen/Qwen2.5-0.5B
    tags: [qwen, alibaba, tiny]
  - id: Qwen/Qwen2.5-72B-Instruct
    tags: [qwen, alibaba, large, instruct]

  # Mistral 系列
  - id: mistralai/Mistral-7B-Instruct-v0.3
    tags: [mistral, medium, instruct]
  - id: mistralai/Mixtral-8x7B-Instruct-v0.1
    tags: [mistral, moe, large]

# 获取配置
fetch:
  files:
    - config.json              # 必须
    - tokenizer_config.json    # 重要
    - generation_config.json   # 可选
    - adapter_config.json      # 检测 LoRA
  timeout: 30
  retry: 3
```

## 5. 核心模块设计

### 5.1 模块结构

```
modelsheet/
├── __init__.py
├── cli.py              # 命令行入口
├── config.py           # 配置管理
├── fetcher.py          # 数据获取
├── parser.py           # 数据解析
├── exporter.py         # 数据导出
└── utils.py            # 工具函数
```

### 5.2 fetcher.py - 数据获取模块

```python
"""从 HuggingFace 获取模型配置文件"""

import httpx
from pathlib import Path
from typing import Optional

HF_BASE_URL = "https://huggingface.co"
FILES_TO_FETCH = [
    "config.json",
    "tokenizer_config.json",
    "generation_config.json",
    "adapter_config.json",
]

class ModelFetcher:
    def __init__(self, cache_dir: Path, timeout: int = 30):
        self.cache_dir = cache_dir
        self.timeout = timeout
        self.client = httpx.Client(timeout=timeout)

    def fetch_file(self, model_id: str, filename: str) -> Optional[dict]:
        """获取单个配置文件"""
        url = f"{HF_BASE_URL}/{model_id}/resolve/main/{filename}"
        try:
            resp = self.client.get(url)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None
            raise

    def fetch_model(self, model_id: str, force: bool = False) -> dict:
        """获取模型的所有配置文件"""
        cache_path = self.cache_dir / model_id.replace("/", "_")

        # 检查缓存
        if not force and cache_path.exists():
            return self._load_cache(cache_path)

        result = {}
        for filename in FILES_TO_FETCH:
            data = self.fetch_file(model_id, filename)
            if data:
                result[filename] = data

        # 保存缓存
        self._save_cache(cache_path, result)
        return result

    def _load_cache(self, path: Path) -> dict:
        """加载缓存"""
        result = {}
        for f in path.glob("*.json"):
            result[f.name] = json.loads(f.read_text())
        return result

    def _save_cache(self, path: Path, data: dict):
        """保存缓存"""
        path.mkdir(parents=True, exist_ok=True)
        for filename, content in data.items():
            (path / filename).write_text(json.dumps(content, indent=2))
```

### 5.3 parser.py - 数据解析模块

```python
"""解析配置文件，提取结构化数据"""

from typing import Optional
from dataclasses import dataclass

@dataclass
class ParsedModel:
    id: str
    name: str

    # 基础信息
    total_parameters: Optional[int] = None
    context_length: Optional[int] = None
    embedding_dim: Optional[int] = None
    vocab_size: Optional[int] = None

    # 架构信息
    architecture: Optional[str] = None
    num_layers: Optional[int] = None
    num_heads: Optional[int] = None
    num_kv_heads: Optional[int] = None
    hidden_size: Optional[int] = None
    intermediate_size: Optional[int] = None
    position_encoding: Optional[str] = None
    is_moe: bool = False
    num_experts: Optional[int] = None

    # Tokenizer 信息
    chat_template: Optional[str] = None
    bos_token: Optional[str] = None
    eos_token: Optional[str] = None

    # 类型判断
    is_adapter: bool = False
    base_model: Optional[str] = None


class ModelParser:
    def parse(self, model_id: str, configs: dict) -> ParsedModel:
        """解析模型配置"""
        config = configs.get("config.json", {})
        tokenizer_config = configs.get("tokenizer_config.json", {})
        generation_config = configs.get("generation_config.json", {})
        adapter_config = configs.get("adapter_config.json")

        return ParsedModel(
            id=model_id,
            name=self._extract_name(model_id),

            # 基础信息
            total_parameters=self._calc_parameters(config),
            context_length=self._get_context_length(config),
            embedding_dim=config.get("hidden_size"),
            vocab_size=config.get("vocab_size"),

            # 架构信息
            architecture=config.get("model_type"),
            num_layers=config.get("num_hidden_layers"),
            num_heads=config.get("num_attention_heads"),
            num_kv_heads=config.get("num_key_value_heads"),
            hidden_size=config.get("hidden_size"),
            intermediate_size=config.get("intermediate_size"),
            position_encoding=self._detect_position_encoding(config),
            is_moe=self._is_moe(config),
            num_experts=config.get("num_local_experts"),

            # Tokenizer 信息
            chat_template=tokenizer_config.get("chat_template"),
            bos_token=self._get_token(tokenizer_config, "bos_token"),
            eos_token=self._get_token(tokenizer_config, "eos_token"),

            # 类型判断
            is_adapter=adapter_config is not None,
            base_model=adapter_config.get("base_model_name_or_path") if adapter_config else None,
        )

    def _extract_name(self, model_id: str) -> str:
        """从 model_id 提取显示名称"""
        return model_id.split("/")[-1]

    def _calc_parameters(self, config: dict) -> Optional[int]:
        """估算参数量"""
        # 优先使用 config 中的数值
        if "num_parameters" in config:
            return config["num_parameters"]

        # 尝试从架构参数计算
        h = config.get("hidden_size")
        l = config.get("num_hidden_layers")
        v = config.get("vocab_size")
        i = config.get("intermediate_size")

        if all([h, l, v, i]):
            # 简化估算: embedding + attention + ffn
            embedding = v * h
            attention = l * (4 * h * h)  # Q, K, V, O
            ffn = l * (2 * h * i)        # up, down
            return embedding + attention + ffn

        return None

    def _get_context_length(self, config: dict) -> Optional[int]:
        """获取上下文长度"""
        keys = [
            "max_position_embeddings",
            "n_positions",
            "max_sequence_length",
            "seq_length",
        ]
        for key in keys:
            if key in config:
                return config[key]
        return None

    def _detect_position_encoding(self, config: dict) -> Optional[str]:
        """检测位置编码类型"""
        if config.get("rope_scaling"):
            return "RoPE"
        if config.get("alibi"):
            return "ALiBi"
        if config.get("rotary_pct"):
            return "RoPE"
        return None

    def _is_moe(self, config: dict) -> bool:
        """判断是否为 MoE 模型"""
        return (
            config.get("num_local_experts", 0) > 1 or
            config.get("num_experts", 0) > 1 or
            "moe" in config.get("model_type", "").lower()
        )

    def _get_token(self, config: dict, key: str) -> Optional[str]:
        """获取 token 值"""
        token = config.get(key)
        if isinstance(token, dict):
            return token.get("content")
        return token
```

### 5.4 exporter.py - 数据导出模块

```python
"""导出为前端使用的 JSON 格式"""

import json
from pathlib import Path
from typing import List
from dataclasses import asdict

class ModelExporter:
    def export(
        self,
        models: List[ParsedModel],
        output_path: Path,
        pretty: bool = False
    ):
        """导出模型数据"""
        data = [self._to_frontend_format(m) for m in models]

        indent = 2 if pretty else None
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            json.dumps(data, indent=indent, ensure_ascii=False)
        )

    def _to_frontend_format(self, model: ParsedModel) -> dict:
        """转换为前端格式"""
        return {
            "id": model.id,
            "name": model.name,
            "provider": self._extract_provider(model.id),
            "totalParameters": model.total_parameters,
            "contextLength": model.context_length,
            "embeddingDim": model.embedding_dim,
            "vocabSize": model.vocab_size,
            "architecture": model.architecture,
            "numLayers": model.num_layers,
            "numHeads": model.num_heads,
            "numKvHeads": model.num_kv_heads,
            "hiddenSize": model.hidden_size,
            "intermediateSize": model.intermediate_size,
            "positionEncoding": model.position_encoding,
            "isMoe": model.is_moe,
            "numExperts": model.num_experts,
            "hasChatTemplate": model.chat_template is not None,
            "isAdapter": model.is_adapter,
            "baseModel": model.base_model,
        }

    def _extract_provider(self, model_id: str) -> str:
        """提取提供商"""
        org = model_id.split("/")[0]
        provider_map = {
            "meta-llama": "Meta",
            "Qwen": "Alibaba",
            "mistralai": "Mistral AI",
            "google": "Google",
            "microsoft": "Microsoft",
            "01-ai": "01.AI",
            "deepseek-ai": "DeepSeek",
            "THUDM": "Tsinghua",
        }
        return provider_map.get(org, org)
```

## 6. 错误处理

### 6.1 常见错误

| 错误 | 原因 | 处理 |
|------|------|------|
| 404 Not Found | 文件不存在 | 跳过，记录日志 |
| 403 Forbidden | 需要认证 | 提示配置 HF_TOKEN |
| 429 Rate Limit | 请求过快 | 指数退避重试 |
| Timeout | 网络超时 | 重试 3 次 |
| JSONDecodeError | 非 JSON 响应 | 跳过，记录警告 |

### 6.2 重试策略

```python
import time
from functools import wraps

def retry(max_retries=3, backoff_factor=2):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except (httpx.TimeoutException, httpx.HTTPStatusError) as e:
                    if attempt == max_retries - 1:
                        raise
                    wait = backoff_factor ** attempt
                    time.sleep(wait)
            return None
        return wrapper
    return decorator
```

## 7. 配置与环境

### 7.1 环境变量

```bash
# HuggingFace Token (可选，访问私有模型)
export HF_TOKEN=hf_xxxxx

# 代理设置 (可选)
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890
```

### 7.2 pyproject.toml

```toml
[project]
name = "modelsheet"
version = "0.1.0"
description = "CLI tool for fetching and parsing LLM model configs"
requires-python = ">=3.13"
dependencies = [
    "httpx>=0.27.0",
    "typer>=0.12.0",
    "pyyaml>=6.0",
    "rich>=13.0",
]

[project.scripts]
modelsheet = "modelsheet.cli:app"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

## 8. 使用示例

### 8.1 初始化项目

```bash
# 安装依赖
uv sync

# 添加模型
modelsheet add meta-llama/Llama-3.2-1B
modelsheet add Qwen/Qwen2.5-7B-Instruct
modelsheet add mistralai/Mistral-7B-v0.3

# 查看列表
modelsheet list
```

### 8.2 更新数据

```bash
# 一键更新
modelsheet update

# 或分步执行
modelsheet fetch
modelsheet parse
modelsheet export --output ../web/public/data/models.json
```

### 8.3 验证数据

```bash
# 检查数据完整性
modelsheet validate

# 输出:
# Validating 15 models...
# ✓ All models have required fields
# ⚠ 2 models missing context_length
# ⚠ 1 model is an adapter (LoRA)
```
