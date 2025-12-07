# ModelSheet

开源 LLM 模型参数速查与对比工具。

## 项目简介

ModelSheet 通过获取 HuggingFace 上模型的配置文件，自动解析并展示模型的核心参数，帮助用户快速了解和比较不同的大语言模型。

## 特性

- ✅ 自动从 HuggingFace 下载模型配置文件
- ✅ 解析提取丰富的模型参数：
  - 基本信息：参数量、上下文长度、架构类型
  - 详细配置：层数、注意力头、隐藏层大小
  - 高级特性：位置编码、激活函数、归一化类型
  - 计算指标：MLP 扩展倍数、GQA 比例
  - MoE 支持：专家数量、每 token 激活数
- ✅ 支持 `.txt` 和 `.yaml` 格式的模型列表配置
- ✅ 导出为 JSON 格式供前端使用
- ✅ 自动清理临时缓存
- ✅ 识别 MoE 架构和 LoRA Adapter
- ✅ 彩色终端输出，界面友好

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
│   └── modelsheet-cli/            # Python CLI 工具
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

**添加单个模型**（推荐）
```bash
# 添加单个模型（最简洁的方式）
modelsheet add Qwen/Qwen2.5-7B-Instruct

# 查看模型详情
modelsheet show Qwen/Qwen2.5-7B-Instruct

# 列出所有已添加的模型
modelsheet list
```

**从文件批量添加**
```bash
# 从 txt 或 yaml 文件批量添加
modelsheet add --file models.txt
modelsheet add -f models.yaml

# 自定义超时时间（默认 60 秒）
modelsheet add Qwen/Qwen3-8B --timeout 120
```

**管理模型**
```bash
# 移除单个模型
modelsheet remove --model Qwen/Qwen2.5-0.5B

# 从文件批量移除
modelsheet remove --file models_to_remove.txt

# 列出所有模型
modelsheet list

# 查看模型详细信息
modelsheet show Qwen/Qwen2.5-7B-Instruct
```

**查看帮助**
```bash
# 主帮助
modelsheet --help

# 命令帮助
modelsheet add --help
modelsheet show --help
```

## 数据格式

生成的 `data/models.json` 示例：

```json
[
  {
    "id": "Qwen/Qwen2.5-7B-Instruct",
    "name": "Qwen2.5-7B-Instruct",
    "provider": "Alibaba",
    "huggingfaceUrl": "https://huggingface.co/Qwen/Qwen2.5-7B-Instruct",
    "totalParameters": 5785780224,
    "contextLength": 32768,
    "embeddingDim": 3584,
    "vocabSize": 152064,
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
    "attentionDropout": 0.0,
    "mlpFactor": 5.29,
    "gqaRatio": 7.0,
    "eosToken": "<|im_end|>",
    "isMoe": false,
    "hasChatTemplate": true,
    "isAdapter": false,
    "updatedAt": "2025-12-07T05:41:45.173166Z"
  }
]
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 模型 ID（格式：org/model） |
| `name` | string | 模型名称 |
| `provider` | string | 提供商（如 Alibaba, Meta, Mistral AI） |
| `totalParameters` | number | 总参数量 |
| `contextLength` | number | 上下文长度 |
| `architecture` | string | 架构类型（如 qwen2, llama, mixtral） |
| `numLayers` | number | 层数 |
| `numHeads` | number | 注意力头数量 |
| `numKvHeads` | number | KV 注意力头数量（GQA） |
| `hiddenSize` | number | 隐藏层大小 |
| `intermediateSize` | number | 中间层大小 |
| `positionEncoding` | string | 位置编码类型（RoPE, ALiBi） |
| `activation` | string | 激活函数（如 silu, gelu） |
| `normType` | string | 归一化类型（RMSNorm, LayerNorm） |
| `normEps` | number | 归一化 epsilon 值 |
| `attentionDropout` | number | 注意力 dropout 率 |
| `mlpFactor` | number | MLP 扩展倍数 |
| `gqaRatio` | number | GQA 比例（num_heads / num_kv_heads） |
| `isMoe` | boolean | 是否为 MoE 架构 |
| `numExperts` | number | 专家数量（MoE） |
| `hasChatTemplate` | boolean | 是否包含对话模板 |
| `isAdapter` | boolean | 是否为 Adapter（如 LoRA） |

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
