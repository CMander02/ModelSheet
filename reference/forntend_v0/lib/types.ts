export interface ModelInfo {
  id: string
  name: string
  modelFamily?: string
  provider?: string
  releaseDate?: string
  totalParameters?: number
  baseModel?: string
  isInferenceModel?: boolean
  inputModalities?: string[]
  outputModalities?: string[]
  contextLength?: number
  embeddingDim?: number
  positionEncoding?: string
  trainingData?: string
  modelType?: string
  licensingInfo?: string
  datasetSize?: number
  trainingTokens?: number
  architecture?: string
  quantizationSupport?: string[]
  moe?: boolean
  [key: string]: any
}

export type ComplexityLevel = "simple" | "enthusiast" | "developer" | "custom"

export interface ColumnConfig {
  key: string
  label: string
  visible: boolean
  sortable: boolean
  type: "string" | "number" | "date" | "array" | "boolean"
  width?: string
}

export interface ComplexityPreset {
  level: ComplexityLevel
  columns: string[]
  description: string
}

export interface SortConfig {
  key: string | null
  direction: "asc" | "desc"
}

export interface FilterConfig {
  searchTerm: string
  sortConfig: SortConfig
  visibleColumns: string[]
  complexityLevel: ComplexityLevel
}
