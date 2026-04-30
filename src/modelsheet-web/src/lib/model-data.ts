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
  { key: "normEps", visible: false, sortable: true, type: "number" },
  { key: "attentionDropout", visible: false, sortable: true, type: "number" },
  { key: "mlpFactor", visible: false, sortable: true, type: "number" },
  { key: "gqaRatio", visible: false, sortable: true, type: "number" },

  // MoE
  { key: "isMoe", visible: false, sortable: true, type: "boolean" },
  { key: "numExperts", visible: false, sortable: true, type: "number" },
  { key: "numSharedExperts", visible: false, sortable: true, type: "number" },
  { key: "numExpertsPerToken", visible: false, sortable: true, type: "number" },
  { key: "numActivatedExperts", visible: false, sortable: true, type: "number" },
  { key: "moeIntermediateSize", visible: false, sortable: true, type: "number" },

  // Modalities
  { key: "inputModalities", visible: false, sortable: false, type: "array" },
  { key: "outputModalities", visible: false, sortable: false, type: "array" },

  // Other Information
  { key: "huggingfaceUrl", visible: false, sortable: false, type: "string" },
  { key: "arxivUrl", visible: false, sortable: false, type: "string" },
  { key: "techReport", visible: false, sortable: false, type: "string" },
  { key: "createdAt", visible: false, sortable: true, type: "date" },

  // Openness (not in any preset — visible via custom field selector only)
  { key: "openness", visible: false, sortable: true, type: "string" },
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
    columns: ["name", "provider", "totalParameters", "contextLength", "arxivUrl", "createdAt"],
    description: "基础信息：名称、提供商、参数量、上下文长度、ArXiv链接、创建时间",
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
      "createdAt",
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
      "numSharedExperts",
      "numExpertsPerToken",
      "numActivatedExperts",
      "moeIntermediateSize",
    ],
    description: "开发者级：完整的技术参数和架构信息",
  },
  custom: {
    level: "custom",
    columns: DEFAULT_COLUMNS.map(col => col.key),
    description: "自定义级：显示所有可用参数",
  },
}

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
