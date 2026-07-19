# 数据字段定义文档

## 1. 字段来源映射

### 1.1 配置文件概览

| 文件 | 优先级 | 主要字段 |
|------|--------|----------|
| `config.json` | P0 核心 | 架构、参数、上下文长度 |
| `tokenizer_config.json` | P1 交互 | Chat Template、特殊 Token |
| `generation_config.json` | P2 部署 | 默认生成参数 |
| `adapter_config.json` | P1 类型 | LoRA 判断 |
| `model.safetensors.index.json` | P2 部署 | 精确文件大小 |
| `_metadata` (API) | P0 核心 | 参数量、发布时间、tags |

### 1.2 字段来源详细映射

#### 标识字段 (Metadata)
| 字段 | Python 名 | JSON 名 | 来源 | 备注 |
|------|-----------|---------|------|------|
| ID | `id` | `id` | API modelId | HuggingFace 模型 ID |
| 名称 | `name` | `name` | modelId 分割 | 去除组织前缀 |
| 提供商 | `provider` | `provider` | modelId + PROVIDER_MAP | 映射后的显示名称 |
| HuggingFace URL | `huggingface_url` | `huggingfaceUrl` | 字符串拼接 | 模型页面链接 |
| 技术报告 | `tech_report` | `techReport` | (待实现) | 技术报告 URL |
| arXiv URL | `arxiv_url` | `arxivUrl` | API tags 数组 | 匹配 `arxiv:XXXX.XXXXX` |
| 发布时间 | `released_at` | `releasedAt` | HF 优先，技术博客/报告取最早日期 | ISO 格式时间戳 |

#### 规模参数 (Parameters)
| 字段 | Python 名 | JSON 名 | 来源 | 备注 |
|------|-----------|---------|------|------|
| 总参数量 | `total_parameters` | `totalParameters` | API safetensors.total > config num_parameters > 计算 | 优先使用 API 数据 |
| 活跃参数量 | `active_parameters` | `activeParameters` | 计算 | MoE 模型专用，每 token 激活的参数 |
| 上下文长度 | `context_length` | `contextLength` | config.json | 多个可能的 key |
| 嵌入维度 | `embedding_dim` | `embeddingDim` | config.json hidden_size | 等于 hidden_size |
| 词表大小 | `vocab_size` | `vocabSize` | config.json vocab_size | 词表大小 |

#### 架构参数 (Architecture)
| 字段 | Python 名 | JSON 名 | 来源 | 备注 |
|------|-----------|---------|------|------|
| 架构类型 | `architecture` | `architecture` | config.json model_type | 如 "llama", "qwen2" |
| 层数 | `num_layers` | `numLayers` | config.json num_hidden_layers | 回退: n_layer, num_layers |
| 注意力头数 | `num_heads` | `numHeads` | config.json num_attention_heads | 回退: n_head |
| KV 头数 | `num_kv_heads` | `numKvHeads` | config.json num_key_value_heads | 默认等于 num_heads |
| 隐藏层大小 | `hidden_size` | `hiddenSize` | config.json hidden_size | 回退: n_embd, d_model |
| FFN 中间层大小 | `intermediate_size` | `intermediateSize` | config.json intermediate_size | 回退: n_inner |
| 位置编码 | `position_encoding` | `positionEncoding` | 推断 | rope_theta → RoPE, use_alibi → ALiBi |
| 激活函数 | `activation` | `activation` | config.json hidden_act | 回退: activation_function |
| 归一化类型 | `norm_type` | `normType` | 推断 | rms_norm_eps → RMSNorm, layer_norm_eps → LayerNorm |
| 归一化 eps | `norm_eps` | `normEps` | config.json rms_norm_eps | 回退: layer_norm_eps |
| 注意力 Dropout | `attention_dropout` | `attentionDropout` | config.json attention_dropout | 注意力层 dropout |
| MLP 扩展因子 | `mlp_factor` | `mlpFactor` | 计算 | intermediate_size / hidden_size |
| GQA 比率 | `gqa_ratio` | `gqaRatio` | 计算 | num_heads / num_kv_heads |

#### MoE 参数
| 字段 | Python 名 | JSON 名 | 来源 | 备注 |
|------|-----------|---------|------|------|
| 是否 MoE | `is_moe` | `isMoe` | 推断 | num_experts > 1 或 model_type 含 "moe" |
| 专家数量 | `num_experts` | `numExperts` | config.json n_routed_experts | 回退: num_local_experts, num_experts |
| 共享专家数 | `num_shared_experts` | `numSharedExperts` | config.json n_shared_experts | DeepSeek 风格 |
| 每 token 专家数 | `num_experts_per_token` | `numExpertsPerToken` | config.json num_experts_per_tok | 回退: num_experts_per_token |
| 激活专家总数 | `num_activated_experts` | `numActivatedExperts` | 计算 | num_experts_per_tok + n_shared_experts |
| MoE FFN 大小 | `moe_intermediate_size` | `moeIntermediateSize` | config.json moe_intermediate_size | MoE 专家 FFN 维度 |

## 2. 前端数据模型

### 2.1 TypeScript 类型定义

```typescript
/**
 * 模型完整信息
 */
interface ModelInfo {
  // === 基础标识 ===
  id: string                    // HuggingFace model ID，如 "meta-llama/Llama-3.2-1B"
  name: string                  // 显示名称，如 "Llama-3.2-1B"
  provider: string              // 提供商，如 "Meta"
  huggingfaceUrl?: string       // HuggingFace 链接
  techReport?: string           // 技术报告 URL
  arxivUrl?: string             // arXiv 论文链接
  releasedAt?: string            // 发布时间，ISO 格式

  // === 规模参数 ===
  totalParameters?: number      // 总参数量
  activeParameters?: number     // 活跃参数量（MoE 模型）
  contextLength?: number        // 最大上下文长度
  embeddingDim?: number         // Embedding 维度（= hidden_size）
  vocabSize?: number            // 词表大小

  // === 架构参数 ===
  architecture?: string         // 架构类型，如 "llama", "qwen2", "mistral"
  numLayers?: number            // Transformer 层数
  numHeads?: number             // 注意力头数
  numKvHeads?: number           // KV 头数 (GQA)
  hiddenSize?: number           // 隐藏层维度
  intermediateSize?: number     // FFN 中间层维度
  positionEncoding?: string     // 位置编码类型 (RoPE, ALiBi)
  activation?: string           // 激活函数 (silu, gelu)
  normType?: string             // 归一化类型 (RMSNorm, LayerNorm)
  normEps?: number              // 归一化 epsilon
  attentionDropout?: number     // 注意力 dropout 率
  mlpFactor?: number            // MLP 扩展因子
  gqaRatio?: number             // GQA 比率

  // === MoE 参数 ===
  isMoe: boolean                // 是否为 MoE 架构
  numExperts?: number           // 路由专家数量
  numSharedExperts?: number     // 共享专家数量
  numExpertsPerToken?: number   // 每个 token 激活的路由专家数
  numActivatedExperts?: number  // 激活专家总数（路由+共享）
  moeIntermediateSize?: number  // MoE 专家 FFN 维度
}

/**
 * 复杂度等级
 */
type ComplexityLevel = 'simple' | 'enthusiast' | 'developer' | 'custom'

/**
 * 列配置
 */
interface ColumnConfig {
  key: keyof ModelInfo          // 字段 key
  label: string                 // 显示名称
  labelEn: string               // 英文名称
  visible: boolean              // 是否显示
  sortable: boolean             // 是否可排序
  type: 'string' | 'number' | 'date' | 'boolean' | 'array'
  format?: 'params' | 'bytes' | 'date'  // 格式化方式
  width?: string                // 列宽
  description?: string          // 字段说明
}
```

### 2.2 字段分组

```typescript
const FIELD_GROUPS = {
  basic: {
    label: '基础信息',
    fields: ['name', 'provider', 'releasedAt', 'totalParameters', 'contextLength']
  },
  architecture: {
    label: '架构信息',
    fields: ['architecture', 'numLayers', 'numHeads', 'numKvHeads', 'hiddenSize', 'intermediateSize', 'positionEncoding', 'activation', 'normType']
  },
  moe: {
    label: 'MoE 参数',
    fields: ['isMoe', 'numExperts', 'numSharedExperts', 'numExpertsPerToken', 'numActivatedExperts', 'moeIntermediateSize', 'activeParameters']
  },
  metrics: {
    label: '计算指标',
    fields: ['vocabSize', 'embeddingDim', 'mlpFactor', 'gqaRatio', 'normEps', 'attentionDropout']
  },
  links: {
    label: '链接',
    fields: ['huggingfaceUrl', 'arxivUrl', 'techReport']
  }
}
```

## 3. 复杂度预设

### 3.1 预设配置

| 等级 | 显示字段 | 适用人群 |
|------|----------|----------|
| simple | name, provider, totalParameters, contextLength | 普通用户 |
| enthusiast | + releasedAt, architecture, embeddingDim, isMoe | 爱好者 |
| developer | + numLayers, numHeads, positionEncoding, vocabSize, activation | 开发者 |
| custom | 用户自定义 | 高级用户 |

### 3.2 预设详细定义

```typescript
const COMPLEXITY_PRESETS: Record<ComplexityLevel, string[]> = {
  simple: [
    'name',
    'provider',
    'totalParameters',
    'contextLength',
  ],

  enthusiast: [
    'name',
    'provider',
    'releasedAt',
    'totalParameters',
    'contextLength',
    'architecture',
    'embeddingDim',
    'isMoe',
  ],

  developer: [
    'name',
    'provider',
    'releasedAt',
    'totalParameters',
    'activeParameters',
    'contextLength',
    'architecture',
    'numLayers',
    'numHeads',
    'numKvHeads',
    'hiddenSize',
    'intermediateSize',
    'positionEncoding',
    'activation',
    'normType',
    'vocabSize',
    'isMoe',
    'numExperts',
    'numExpertsPerToken',
    'mlpFactor',
    'gqaRatio',
  ],

  custom: [], // 用户自定义，读取 localStorage
}
```

## 4. 数据格式化

### 4.1 参数量格式化

```typescript
function formatParameters(value: number | undefined): string {
  if (value === undefined || value === null) return '-'

  if (value >= 1e12) {
    return `${(value / 1e12).toFixed(1)}T`
  }
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`
  }
  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`
  }
  return value.toLocaleString()
}

// 示例:
// 1000000000000 → "1.0T"
// 70000000000   → "70.0B"
// 7000000000    → "7.0B"
// 1500000       → "1.5M"
```

### 4.2 上下文长度格式化

```typescript
function formatContextLength(value: number | undefined): string {
  if (value === undefined || value === null) return '-'

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`
  }
  return value.toLocaleString()
}

// 示例:
// 131072  → "128K"
// 200000  → "200K"
// 1000000 → "1.0M"
```

### 4.3 日期格式化

```typescript
function formatDate(value: string | undefined, locale: string = 'zh-CN'): string {
  if (!value) return '-'

  const date = new Date(value)
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// 示例 (zh-CN):
// "2024-07-23" → "2024/07/23"

// 示例 (en-US):
// "2024-07-23" → "07/23/2024"
```

### 4.4 布尔值格式化

```typescript
function formatBoolean(value: boolean | undefined, locale: string = 'zh'): string {
  if (value === undefined || value === null) return '-'

  if (locale === 'zh') {
    return value ? '是' : '否'
  }
  return value ? 'Yes' : 'No'
}
```

## 5. JSON 输出示例

```json
[
  {
    "id": "meta-llama/Llama-3.2-1B",
    "name": "Llama-3.2-1B",
    "provider": "Meta",
    "huggingfaceUrl": "https://huggingface.co/meta-llama/Llama-3.2-1B",
    "techReport": "",
    "arxivUrl": "https://arxiv.org/abs/2407.21783",
    "totalParameters": 1235814400,
    "contextLength": 131072,
    "embeddingDim": 2048,
    "vocabSize": 128256,
    "architecture": "llama",
    "numLayers": 16,
    "numHeads": 32,
    "numKvHeads": 8,
    "hiddenSize": 2048,
    "intermediateSize": 8192,
    "positionEncoding": "RoPE",
    "activation": "silu",
    "normType": "RMSNorm",
    "normEps": 1e-05,
    "mlpFactor": 4.0,
    "gqaRatio": 4.0,
    "isMoe": false,
    "releasedAt": "2024-09-18T09:53:43.000Z"
  },
  {
    "id": "deepseek-ai/DeepSeek-V3-Base",
    "name": "DeepSeek-V3-Base",
    "provider": "DeepSeek",
    "huggingfaceUrl": "https://huggingface.co/deepseek-ai/DeepSeek-V3-Base",
    "techReport": "",
    "totalParameters": 671000000000,
    "activeParameters": 37000000000,
    "contextLength": 131072,
    "embeddingDim": 7168,
    "vocabSize": 129280,
    "architecture": "deepseek_v3",
    "numLayers": 61,
    "numHeads": 128,
    "numKvHeads": 128,
    "hiddenSize": 7168,
    "intermediateSize": 18432,
    "positionEncoding": "RoPE",
    "activation": "silu",
    "normType": "RMSNorm",
    "normEps": 1e-06,
    "mlpFactor": 2.57,
    "gqaRatio": 1.0,
    "isMoe": true,
    "numExperts": 256,
    "numSharedExperts": 1,
    "numExpertsPerToken": 8,
    "numActivatedExperts": 9,
    "moeIntermediateSize": 2048,
    "releasedAt": "2024-12-26T10:00:00.000Z"
  }
]
```

## 6. 提取器模块结构

字段提取逻辑位于 `src/modelsheet-cli/extractors/`：

```
extractors/
├── __init__.py          # 导出所有提取器
├── base.py              # ConfigContext 和辅助函数
├── metadata.py          # 标识字段：id, name, provider, URLs, timestamps
├── architecture.py      # 架构字段：layers, heads, sizes, encodings
├── moe.py               # MoE 字段：experts, shared experts
└── parameters.py        # 参数计算：total, active (dense/MoE)
```

### 6.1 提取优先级

对于有多个可能 key 的字段，使用 `get_first_of()` 函数按优先级查找：

| 字段 | 优先级 1 | 优先级 2 | 优先级 3 |
|------|----------|----------|----------|
| num_layers | `num_hidden_layers` | `n_layer` | `num_layers` |
| num_heads | `num_attention_heads` | `n_head` | - |
| hidden_size | `hidden_size` | `n_embd` | `d_model` |
| intermediate_size | `intermediate_size` | `n_inner` | - |
| context_length | `max_position_embeddings` | `seq_length` | `n_ctx` |
| num_experts | `n_routed_experts` | `num_local_experts` | `num_experts` |

### 6.2 参数计算优先级

总参数量 (`total_parameters`) 的计算优先级：
1. API metadata `totalParameters`（最准确）
2. config.json `num_parameters`（显式声明）
3. 从架构计算（Dense 或 MoE 公式）
