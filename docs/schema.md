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

### 1.2 字段来源详细映射

| 字段 | 来源文件 | JSON Path | 备注 |
|------|----------|-----------|------|
| architecture | config.json | `model_type` | 如 "llama", "qwen2" |
| hidden_size | config.json | `hidden_size` | 隐藏层维度 |
| num_layers | config.json | `num_hidden_layers` | Transformer 层数 |
| num_heads | config.json | `num_attention_heads` | 注意力头数 |
| num_kv_heads | config.json | `num_key_value_heads` | KV 头数 (GQA) |
| vocab_size | config.json | `vocab_size` | 词表大小 |
| intermediate_size | config.json | `intermediate_size` | FFN 中间层大小 |
| context_length | config.json | `max_position_embeddings` | 多个可能的 key |
| rope_theta | config.json | `rope_theta` | RoPE base 频率 |
| rope_scaling | config.json | `rope_scaling.type` | RoPE 扩展类型 |
| is_moe | config.json | `num_local_experts > 1` | 计算字段 |
| num_experts | config.json | `num_local_experts` | MoE 专家数 |
| chat_template | tokenizer_config.json | `chat_template` | Jinja2 模板 |
| bos_token | tokenizer_config.json | `bos_token` | 序列开始 token |
| eos_token | tokenizer_config.json | `eos_token` | 序列结束 token |
| is_adapter | adapter_config.json | 存在性检测 | 是否为 LoRA |
| base_model | adapter_config.json | `base_model_name_or_path` | LoRA 基座 |
| total_size | *.index.json | `metadata.total_size` | 精确字节数 |

## 2. 前端数据模型

### 2.1 TypeScript 类型定义

```typescript
/**
 * 模型完整信息
 */
interface ModelInfo {
  // === 基础标识 ===
  id: string                    // HuggingFace model ID，如 "meta-llama/Llama-3.2-1B"
  name: string                  // 显示名称，如 "Llama 3.2 1B"
  provider: string              // 提供商，如 "Meta"
  releaseDate?: string          // 发布日期，ISO 格式

  // === 规模参数 ===
  totalParameters?: number      // 总参数量（估算）
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
  positionEncoding?: string     // 位置编码类型

  // === MoE 参数 ===
  isMoe: boolean                // 是否为 MoE 架构
  numExperts?: number           // 专家数量
  numExpertsPerToken?: number   // 每个 token 激活的专家数

  // === Tokenizer 参数 ===
  hasChatTemplate: boolean      // 是否有 Chat Template
  bosToken?: string             // 序列开始 token
  eosToken?: string             // 序列结束 token

  // === 类型标记 ===
  isAdapter: boolean            // 是否为 LoRA/Adapter
  baseModel?: string            // 基座模型 (如果是 Adapter)
  isInstructModel?: boolean     // 是否为指令微调模型

  // === 元信息 ===
  huggingfaceUrl?: string       // HuggingFace 链接
  tags?: string[]               // 标签
  updatedAt?: string            // 数据更新时间
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
    fields: ['name', 'provider', 'releaseDate', 'totalParameters', 'contextLength']
  },
  architecture: {
    label: '架构信息',
    fields: ['architecture', 'numLayers', 'numHeads', 'numKvHeads', 'hiddenSize', 'intermediateSize', 'positionEncoding']
  },
  moe: {
    label: 'MoE 参数',
    fields: ['isMoe', 'numExperts', 'numExpertsPerToken']
  },
  tokenizer: {
    label: 'Tokenizer',
    fields: ['vocabSize', 'hasChatTemplate', 'bosToken', 'eosToken']
  },
  type: {
    label: '类型标记',
    fields: ['isAdapter', 'baseModel', 'isInstructModel']
  }
}
```

## 3. 复杂度预设

### 3.1 预设配置

| 等级 | 显示字段 | 适用人群 |
|------|----------|----------|
| simple | name, provider, totalParameters, contextLength | 普通用户 |
| enthusiast | + releaseDate, architecture, embeddingDim, isMoe | 爱好者 |
| developer | + numLayers, numHeads, positionEncoding, vocabSize | 开发者 |
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
    'releaseDate',
    'totalParameters',
    'contextLength',
    'architecture',
    'embeddingDim',
    'isMoe',
  ],

  developer: [
    'name',
    'provider',
    'releaseDate',
    'totalParameters',
    'contextLength',
    'architecture',
    'numLayers',
    'numHeads',
    'numKvHeads',
    'hiddenSize',
    'intermediateSize',
    'positionEncoding',
    'vocabSize',
    'isMoe',
    'numExperts',
    'hasChatTemplate',
    'isAdapter',
  ],

  custom: [], // 用户自定义，读取 localStorage
}
```

## 4. 列配置定义

```typescript
const DEFAULT_COLUMNS: ColumnConfig[] = [
  // 基础信息
  {
    key: 'name',
    label: '模型名称',
    labelEn: 'Model Name',
    visible: true,
    sortable: true,
    type: 'string',
  },
  {
    key: 'provider',
    label: '提供商',
    labelEn: 'Provider',
    visible: true,
    sortable: true,
    type: 'string',
  },
  {
    key: 'releaseDate',
    label: '发布时间',
    labelEn: 'Release Date',
    visible: true,
    sortable: true,
    type: 'date',
    format: 'date',
  },
  {
    key: 'totalParameters',
    label: '参数量',
    labelEn: 'Parameters',
    visible: true,
    sortable: true,
    type: 'number',
    format: 'params',
    description: '模型总参数量，估算值',
  },
  {
    key: 'contextLength',
    label: '上下文长度',
    labelEn: 'Context Length',
    visible: true,
    sortable: true,
    type: 'number',
    description: '最大支持的 token 数',
  },

  // 架构信息
  {
    key: 'architecture',
    label: '架构',
    labelEn: 'Architecture',
    visible: false,
    sortable: true,
    type: 'string',
    description: '模型架构类型',
  },
  {
    key: 'embeddingDim',
    label: 'Embedding 维度',
    labelEn: 'Embedding Dim',
    visible: false,
    sortable: true,
    type: 'number',
    description: '隐藏层维度',
  },
  {
    key: 'numLayers',
    label: '层数',
    labelEn: 'Layers',
    visible: false,
    sortable: true,
    type: 'number',
    description: 'Transformer 层数',
  },
  {
    key: 'numHeads',
    label: '注意力头数',
    labelEn: 'Attention Heads',
    visible: false,
    sortable: true,
    type: 'number',
  },
  {
    key: 'numKvHeads',
    label: 'KV 头数',
    labelEn: 'KV Heads',
    visible: false,
    sortable: true,
    type: 'number',
    description: 'Grouped Query Attention 的 KV 头数',
  },
  {
    key: 'hiddenSize',
    label: '隐藏层大小',
    labelEn: 'Hidden Size',
    visible: false,
    sortable: true,
    type: 'number',
  },
  {
    key: 'intermediateSize',
    label: 'FFN 大小',
    labelEn: 'FFN Size',
    visible: false,
    sortable: true,
    type: 'number',
    description: 'Feed Forward Network 中间层大小',
  },
  {
    key: 'positionEncoding',
    label: '位置编码',
    labelEn: 'Position Encoding',
    visible: false,
    sortable: true,
    type: 'string',
    description: 'RoPE, ALiBi 等',
  },
  {
    key: 'vocabSize',
    label: '词表大小',
    labelEn: 'Vocab Size',
    visible: false,
    sortable: true,
    type: 'number',
  },

  // MoE 信息
  {
    key: 'isMoe',
    label: 'MoE',
    labelEn: 'MoE',
    visible: false,
    sortable: true,
    type: 'boolean',
    description: '是否为 Mixture of Experts 架构',
  },
  {
    key: 'numExperts',
    label: '专家数',
    labelEn: 'Num Experts',
    visible: false,
    sortable: true,
    type: 'number',
  },

  // Tokenizer 信息
  {
    key: 'hasChatTemplate',
    label: 'Chat Template',
    labelEn: 'Chat Template',
    visible: false,
    sortable: true,
    type: 'boolean',
    description: '是否支持对话格式',
  },

  // 类型信息
  {
    key: 'isAdapter',
    label: 'Adapter',
    labelEn: 'Adapter',
    visible: false,
    sortable: true,
    type: 'boolean',
    description: '是否为 LoRA 等 Adapter',
  },
  {
    key: 'baseModel',
    label: '基座模型',
    labelEn: 'Base Model',
    visible: false,
    sortable: true,
    type: 'string',
    description: 'Adapter 的基座模型',
  },
]
```

## 5. 数据格式化

### 5.1 参数量格式化

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

### 5.2 上下文长度格式化

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

### 5.3 日期格式化

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

### 5.4 布尔值格式化

```typescript
function formatBoolean(value: boolean | undefined, locale: string = 'zh'): string {
  if (value === undefined || value === null) return '-'

  if (locale === 'zh') {
    return value ? '是' : '否'
  }
  return value ? 'Yes' : 'No'
}
```

## 6. JSON 输出示例

```json
[
  {
    "id": "meta-llama/Llama-3.2-1B",
    "name": "Llama 3.2 1B",
    "provider": "Meta",
    "releaseDate": "2024-09-25",
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
    "isMoe": false,
    "numExperts": null,
    "hasChatTemplate": true,
    "bosToken": "<|begin_of_text|>",
    "eosToken": "<|end_of_text|>",
    "isAdapter": false,
    "baseModel": null,
    "huggingfaceUrl": "https://huggingface.co/meta-llama/Llama-3.2-1B",
    "updatedAt": "2024-12-07T10:30:00Z"
  },
  {
    "id": "Qwen/Qwen2.5-72B-Instruct",
    "name": "Qwen 2.5 72B Instruct",
    "provider": "Alibaba",
    "releaseDate": "2024-09-19",
    "totalParameters": 72706343936,
    "contextLength": 131072,
    "embeddingDim": 8192,
    "vocabSize": 152064,
    "architecture": "qwen2",
    "numLayers": 80,
    "numHeads": 64,
    "numKvHeads": 8,
    "hiddenSize": 8192,
    "intermediateSize": 29568,
    "positionEncoding": "RoPE",
    "isMoe": false,
    "numExperts": null,
    "hasChatTemplate": true,
    "bosToken": null,
    "eosToken": "<|im_end|>",
    "isAdapter": false,
    "baseModel": null,
    "huggingfaceUrl": "https://huggingface.co/Qwen/Qwen2.5-72B-Instruct",
    "updatedAt": "2024-12-07T10:30:00Z"
  }
]
```
