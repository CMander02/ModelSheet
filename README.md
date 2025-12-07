# ModelSheet

开源 LLM 模型参数速查与对比工具。

## 项目简介

ModelSheet 通过获取 HuggingFace 上模型的配置文件，自动解析并展示模型的核心参数，帮助用户快速了解和比较不同的大语言模型。

## 特性

- ✅ 自动从 HuggingFace 下载模型配置文件
- ✅ 解析提取关键参数（参数量、上下文长度、架构等）
- ✅ 支持 `.txt` 和 `.yaml` 格式的模型列表配置
- ✅ 导出为 JSON 格式供前端使用
- ✅ 本地缓存配置文件（支持覆盖更新）
- ✅ 识别 MoE 架构和 LoRA Adapter
- ✅ 彩色终端输出

## 项目结构

```
ModelSheet/
├── docs/                          # 设计文档
│   ├── architecture.md            # 架构设计
│   ├── frontend.md                # 前端设计
│   ├── cli.md                     # CLI 设计
│   ├── schema.md                  # 字段定义
│   └── deployment.md              # 部署方案
├── src/
│   └── modelsheet_cli/            # Python CLI 工具
├── data/                          # 数据目录
│   ├── temp/                      # 下载的配置文件缓存
│   └── models.json                # 导出的模型数据
├── models.txt                     # 模型列表 (txt 格式)
├── models.yaml                    # 模型列表 (yaml 格式)
└── pyproject.toml
```

## 快速开始

### 安装

使用 `uv` (推荐):
```bash
# 安装依赖
uv sync

# 可编辑模式安装（安装后可直接使用 modelsheet 命令）
uv pip install -e .
```

或使用 `pip`:
```bash
pip install -e .
```

### 使用 CLI

#### 1. 准备模型列表

创建 `models.txt`:
```txt
Qwen/Qwen2.5-7B-Instruct
mistralai/Mistral-7B-Instruct-v0.3
deepseek-ai/DeepSeek-V3
```

或 `models.yaml`:
```yaml
models:
  - Qwen/Qwen2.5-7B-Instruct
  - mistralai/Mistral-7B-Instruct-v0.3
```

#### 2. 运行命令

**方式一：安装后直接使用命令**（推荐）
```bash
# 一键更新
modelsheet update --file models.txt

# 查看缓存
modelsheet list-cache

# 查看模型详情
modelsheet info Qwen/Qwen2.5-7B-Instruct
```

**方式二：作为模块运行**
```bash
python -m modelsheet_cli update --file models.txt
```

#### 命令说明

```bash
# 一键更新（下载 + 解析 + 导出）
modelsheet update --file models.txt

# 分步执行
modelsheet fetch --file models.txt    # 下载配置文件
modelsheet parse --file models.txt    # 解析配置
modelsheet export --file models.txt   # 导出 JSON

# 单个模型操作
modelsheet fetch --model Qwen/Qwen3-8B
modelsheet info Qwen/Qwen3-8B

# 查看帮助
modelsheet --help
modelsheet fetch --help
```

## 数据格式

生成的 `data/models.json` 示例：

```json
[
  {
    "id": "Qwen/Qwen2.5-7B-Instruct",
    "name": "Qwen2.5-7B-Instruct",
    "provider": "Alibaba",
    "totalParameters": 5785780224,
    "contextLength": 32768,
    "architecture": "qwen2",
    "numLayers": 28,
    "numHeads": 28,
    "numKvHeads": 4,
    "hiddenSize": 3584,
    "intermediateSize": 18944,
    "positionEncoding": "RoPE",
    "isMoe": false,
    "hasChatTemplate": true,
    "isAdapter": false,
    "eosToken": "<|im_end|>",
    "huggingfaceUrl": "https://huggingface.co/Qwen/Qwen2.5-7B-Instruct",
    "updatedAt": "2025-12-07T05:04:11.058620Z"
  }
]
```

## 技术栈

- **CLI**: Python 3.13+ + typer + httpx + rich
- **前端** (计划中): React + Vite + shadcn/ui
- **部署** (计划中): GitHub Pages

## 文档

详细设计和实现请参考 [docs/](docs/) 目录：

- [架构设计](docs/architecture.md)
- [CLI 设计](docs/cli.md)
- [字段定义](docs/schema.md)
- [前端设计](docs/frontend.md)
- [部署方案](docs/deployment.md)

## License

MIT
