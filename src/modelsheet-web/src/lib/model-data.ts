import type { ModelInfo, ComplexityPreset, ColumnConfig } from "./types"
import type { Language } from "./i18n"
import { getTranslations } from "./i18n"

// 列配置结构（不包含label，label由i18n动态生成）
const COLUMN_CONFIGS: Omit<ColumnConfig, "label">[] = [
  // Basic Information
  { key: "name", visible: true, sortable: true, type: "string" },
  { key: "provider", visible: true, sortable: true, type: "string" },
  { key: "totalParameters", visible: true, sortable: true, type: "number" },
  { key: "activeParameters", visible: false, sortable: true, type: "number" },
  { key: "contextLength", visible: true, sortable: true, type: "number" },
  { key: "embeddingDim", visible: false, sortable: true, type: "number" },
  { key: "vocabSize", visible: false, sortable: true, type: "number" },

  // Architecture
  { key: "architecture", visible: false, sortable: true, type: "string" },
  { key: "numLayers", visible: false, sortable: true, type: "number" },
  { key: "numHeads", visible: false, sortable: true, type: "number" },
  { key: "numKvHeads", visible: false, sortable: true, type: "number" },
  { key: "hiddenSize", visible: false, sortable: true, type: "number" },
  { key: "intermediateSize", visible: false, sortable: true, type: "number" },
  { key: "positionEncoding", visible: false, sortable: true, type: "string" },
  { key: "activation", visible: false, sortable: true, type: "string" },
  { key: "normType", visible: false, sortable: true, type: "string" },
  { key: "mlpFactor", visible: false, sortable: true, type: "number" },
  { key: "gqaRatio", visible: false, sortable: true, type: "number" },

  // MoE
  { key: "isMoe", visible: false, sortable: true, type: "boolean" },
  { key: "numExperts", visible: false, sortable: true, type: "number" },
  { key: "numExpertsPerToken", visible: false, sortable: true, type: "number" },

  // Tokenizer
  { key: "hasChatTemplate", visible: false, sortable: true, type: "boolean" },
  { key: "bosToken", visible: false, sortable: false, type: "string" },
  { key: "eosToken", visible: false, sortable: false, type: "string" },

  // Type flags
  { key: "isAdapter", visible: false, sortable: true, type: "boolean" },
  { key: "baseModel", visible: false, sortable: true, type: "string" },
]

// 根据语言生成列配置
export function getColumnConfigs(language: Language = "zh"): ColumnConfig[] {
  const t = getTranslations(language)
  return COLUMN_CONFIGS.map(config => ({
    ...config,
    label: t.columns[config.key as keyof typeof t.columns] || config.key
  }))
}

// 默认列配置（使用中文）
export const DEFAULT_COLUMNS: ColumnConfig[] = getColumnConfigs("zh")

// 复杂度预设配置
export const COMPLEXITY_PRESETS: Record<string, ComplexityPreset> = {
  simple: {
    level: "simple",
    columns: ["name", "provider", "totalParameters", "contextLength"],
    description: "基础信息：名称、提供商、参数量、上下文长度",
  },
  enthusiast: {
    level: "enthusiast",
    columns: [
      "name",
      "provider",
      "totalParameters",
      "activeParameters",
      "contextLength",
      "architecture",
      "isMoe",
      "hasChatTemplate",
    ],
    description: "爱好者级：增加架构、MoE等信息",
  },
  developer: {
    level: "developer",
    columns: [
      "name",
      "provider",
      "totalParameters",
      "activeParameters",
      "contextLength",
      "architecture",
      "numLayers",
      "numHeads",
      "numKvHeads",
      "hiddenSize",
      "intermediateSize",
      "positionEncoding",
      "isMoe",
      "numExperts",
      "numExpertsPerToken",
      "hasChatTemplate",
      "isAdapter",
    ],
    description: "开发者级：完整的技术参数和架构信息",
  },
  custom: {
    level: "custom",
    columns: DEFAULT_COLUMNS.map(col => col.key),
    description: "自定义级：显示所有可用参数",
  },
}

// 示例模型数据 - 仅用于开发和后备
// 生产环境应使用 loadModelsFromFile() 从 /data/models.json 加载
const SAMPLE_MODELS: ModelInfo[] = [
  {
    id: "meta-llama/Llama-3.2-1B",
    name: "Llama-3.2-1B",
    provider: "Meta",
    totalParameters: 1235814400,
    contextLength: 131072,
    embeddingDim: 2048,
    vocabSize: 128256,
    architecture: "llama",
    numLayers: 16,
    numHeads: 32,
    numKvHeads: 8,
    hiddenSize: 2048,
    intermediateSize: 8192,
    positionEncoding: "RoPE",
    isMoe: false,
    hasChatTemplate: true,
    isAdapter: false,
    huggingfaceUrl: "https://huggingface.co/meta-llama/Llama-3.2-1B",
  },
  {
    id: "Qwen/Qwen2.5-7B-Instruct",
    name: "Qwen2.5-7B-Instruct",
    provider: "Alibaba",
    totalParameters: 7615616000,
    contextLength: 131072,
    embeddingDim: 3584,
    vocabSize: 152064,
    architecture: "qwen2",
    numLayers: 28,
    numHeads: 28,
    numKvHeads: 4,
    hiddenSize: 3584,
    intermediateSize: 18944,
    positionEncoding: "RoPE",
    activation: "silu",
    normType: "RMSNorm",
    mlpFactor: 5.29,
    gqaRatio: 7.0,
    isMoe: false,
    hasChatTemplate: true,
    isAdapter: false,
    huggingfaceUrl: "https://huggingface.co/Qwen/Qwen2.5-7B-Instruct",
  },
  {
    id: "mistralai/Mixtral-8x7B-Instruct-v0.1",
    name: "Mixtral-8x7B-Instruct-v0.1",
    provider: "Mistral AI",
    totalParameters: 46702792704,
    activeParameters: 12891586560,
    contextLength: 32768,
    embeddingDim: 4096,
    vocabSize: 32000,
    architecture: "mixtral",
    numLayers: 32,
    numHeads: 32,
    numKvHeads: 8,
    hiddenSize: 4096,
    intermediateSize: 14336,
    positionEncoding: "RoPE",
    isMoe: true,
    numExperts: 8,
    numExpertsPerToken: 2,
    hasChatTemplate: true,
    isAdapter: false,
    huggingfaceUrl: "https://huggingface.co/mistralai/Mixtral-8x7B-Instruct-v0.1",
  },
  {
    id: "deepseek-ai/DeepSeek-V3",
    name: "DeepSeek-V3",
    provider: "DeepSeek",
    totalParameters: 671000000000,
    activeParameters: 37000000000,
    contextLength: 163840,
    embeddingDim: 7168,
    vocabSize: 129280,
    architecture: "deepseek_v3",
    numLayers: 61,
    numHeads: 128,
    numKvHeads: 128,
    hiddenSize: 7168,
    intermediateSize: 18432,
    positionEncoding: "RoPE",
    isMoe: true,
    numExperts: 256,
    numExpertsPerToken: 8,
    hasChatTemplate: true,
    isAdapter: false,
    huggingfaceUrl: "https://huggingface.co/deepseek-ai/DeepSeek-V3",
  },
]

// 从 localStorage 读取模型数据
export function loadModelsFromStorage(): ModelInfo[] {
  if (typeof window === "undefined") return []

  try {
    const stored = localStorage.getItem("models_data")
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
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

// 从 public/data/models.json 加载模型数据
export async function loadModelsFromFile(): Promise<ModelInfo[]> {
  try {
    const response = await fetch('/data/models.json')
    if (!response.ok) {
      console.warn('Failed to load models.json, falling back to sample data')
      // 只有在真实文件不存在时才使用示例数据
      // return SAMPLE_MODELS
      return []
    }
    const data = await response.json()
    console.log(`Loaded ${data.length} models from models.json`)
    return data
  } catch (error) {
    console.error('Error loading models from file:', error)
    // Mock data作为后备,仅在开发时使用
    // return SAMPLE_MODELS
    return []
  }
}
