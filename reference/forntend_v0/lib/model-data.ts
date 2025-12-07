import type { ModelInfo, ComplexityPreset, ColumnConfig } from "./types"

// 默认列配置 - 包含所有可能的列
export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: "name", label: "模型名称", visible: true, sortable: true, type: "string" },
  { key: "releaseDate", label: "发布时间", visible: true, sortable: true, type: "date" },
  { key: "totalParameters", label: "参数量", visible: true, sortable: true, type: "number" },
  { key: "baseModel", label: "基座模型", visible: true, sortable: true, type: "string" },
  { key: "isInferenceModel", label: "推理模型", visible: false, sortable: true, type: "boolean" },
  { key: "inputModalities", label: "输入模态", visible: true, sortable: false, type: "array" },
  { key: "outputModalities", label: "输出模态", visible: false, sortable: false, type: "array" },
  { key: "contextLength", label: "上下文长度", visible: true, sortable: true, type: "number" },
  { key: "embeddingDim", label: "Embedding 大小", visible: false, sortable: true, type: "number" },
  { key: "positionEncoding", label: "位置编码", visible: false, sortable: true, type: "string" },
  { key: "modelType", label: "模型类型", visible: false, sortable: true, type: "string" },
  { key: "trainingTokens", label: "训练Token数", visible: false, sortable: true, type: "number" },
  { key: "architecture", label: "架构", visible: false, sortable: true, type: "string" },
  { key: "quantizationSupport", label: "量化支持", visible: false, sortable: false, type: "array" },
  { key: "moe", label: "MoE架构", visible: false, sortable: true, type: "boolean" },
  { key: "provider", label: "提供者", visible: false, sortable: true, type: "string" },
]

// 复杂度预设配置
export const COMPLEXITY_PRESETS: Record<string, ComplexityPreset> = {
  simple: {
    level: "simple",
    columns: ["name", "releaseDate", "totalParameters", "contextLength"],
    description: "基础信息：名称、发布时间、参数量、上下文长度",
  },
  enthusiast: {
    level: "enthusiast",
    columns: [
      "name",
      "releaseDate",
      "totalParameters",
      "baseModel",
      "inputModalities",
      "contextLength",
      "embeddingDim",
    ],
    description: "爱好者级：增加基座、输入模态、embedding等信息",
  },
  developer: {
    level: "developer",
    columns: [
      "name",
      "releaseDate",
      "totalParameters",
      "baseModel",
      "isInferenceModel",
      "inputModalities",
      "outputModalities",
      "contextLength",
      "embeddingDim",
      "positionEncoding",
      "modelType",
      "architecture",
      "moe",
      "quantizationSupport",
    ],
    description: "开发者级：完整的技术参数和架构信息",
  },
  custom: {
    level: "custom",
    columns: [
      "name",
      "releaseDate",
      "totalParameters",
      "baseModel",
      "isInferenceModel",
      "inputModalities",
      "outputModalities",
      "contextLength",
      "embeddingDim",
      "positionEncoding",
      "modelType",
      "trainingTokens",
      "architecture",
      "quantizationSupport",
      "moe",
      "provider",
    ],
    description: "自定义级：显示所有可用参数",
  },
}

// 示例模型数据 - 实际应用中会从 HuggingFace 动态获取
export const SAMPLE_MODELS: ModelInfo[] = [
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    releaseDate: "2024-04-09",
    totalParameters: 1000000000000, // 1T
    baseModel: "GPT-4",
    isInferenceModel: true,
    inputModalities: ["text"],
    outputModalities: ["text"],
    contextLength: 128000,
    embeddingDim: 12288,
    positionEncoding: "RoPE",
    modelType: "Transformer",
    architecture: "Decoder-only",
    moe: false,
    quantizationSupport: ["int8", "int4", "fp16"],
  },
  {
    id: "claude-3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    releaseDate: "2024-03-04",
    totalParameters: 140000000000, // 140B
    baseModel: "Claude",
    isInferenceModel: false,
    inputModalities: ["text", "image"],
    outputModalities: ["text"],
    contextLength: 200000,
    embeddingDim: 4096,
    positionEncoding: "Alibi",
    modelType: "Transformer",
    architecture: "Decoder-only",
    moe: false,
    quantizationSupport: ["fp16"],
  },
  {
    id: "llama-3.1-405b",
    name: "Llama 3.1 405B",
    provider: "Meta",
    releaseDate: "2024-07-23",
    totalParameters: 405000000000, // 405B
    baseModel: "Llama 3.1",
    isInferenceModel: false,
    inputModalities: ["text"],
    outputModalities: ["text"],
    contextLength: 131072,
    embeddingDim: 8192,
    positionEncoding: "RoPE",
    modelType: "Transformer",
    architecture: "Decoder-only",
    moe: true,
    quantizationSupport: ["int8", "int4", "fp16", "fp8"],
    trainingTokens: 15000000000000,
  },
  {
    id: "mistral-large",
    name: "Mistral Large",
    provider: "Mistral AI",
    releaseDate: "2024-02-26",
    totalParameters: 123000000000, // 123B
    baseModel: "Mistral",
    isInferenceModel: true,
    inputModalities: ["text"],
    outputModalities: ["text"],
    contextLength: 32000,
    embeddingDim: 5120,
    positionEncoding: "RoPE",
    modelType: "Transformer",
    architecture: "Decoder-only",
    moe: false,
    quantizationSupport: ["int8", "int4", "fp16"],
  },
  {
    id: "mixtral-8x7b",
    name: "Mixtral 8x7B",
    provider: "Mistral AI",
    releaseDate: "2023-12-11",
    totalParameters: 56000000000, // 56B total, 12.9B active
    baseModel: "Mixtral",
    isInferenceModel: false,
    inputModalities: ["text"],
    outputModalities: ["text"],
    contextLength: 32000,
    embeddingDim: 4096,
    positionEncoding: "RoPE",
    modelType: "Transformer",
    architecture: "MoE",
    moe: true,
    quantizationSupport: ["int8", "int4", "fp16"],
  },
]

// 从 localStorage 读取模型数据
export function loadModelsFromStorage(): ModelInfo[] {
  if (typeof window === "undefined") return SAMPLE_MODELS

  try {
    const stored = localStorage.getItem("models_data")
    return stored ? JSON.parse(stored) : SAMPLE_MODELS
  } catch {
    return SAMPLE_MODELS
  }
}

// 保存模型数据到 localStorage
export function saveModelsToStorage(models: ModelInfo[]): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem("models_data", JSON.stringify(models))
  } catch (error) {
    console.error("Failed to save models:", error)
  }
}

// 保存列配置到 localStorage
export function saveColumnConfigToStorage(columns: ColumnConfig[]): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem("column_config", JSON.stringify(columns))
  } catch (error) {
    console.error("Failed to save column config:", error)
  }
}

// 从 localStorage 读取列配置
export function loadColumnConfigFromStorage(): ColumnConfig[] {
  if (typeof window === "undefined") return DEFAULT_COLUMNS

  try {
    const stored = localStorage.getItem("column_config")
    return stored ? JSON.parse(stored) : DEFAULT_COLUMNS
  } catch {
    return DEFAULT_COLUMNS
  }
}
