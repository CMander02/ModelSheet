export interface ModelInfo {
  // Identification
  id: string
  name: string
  provider: string
  huggingfaceUrl?: string
  techReport?: string      // Technical report URL

  // Basic specs
  totalParameters?: number
  activeParameters?: number  // For MoE: parameters used per token
  contextLength?: number
  embeddingDim?: number
  vocabSize?: number

  // Architecture
  architecture?: string
  numLayers?: number
  numHeads?: number
  numKvHeads?: number
  hiddenSize?: number
  intermediateSize?: number
  positionEncoding?: string
  activation?: string
  normType?: string
  normEps?: number
  attentionDropout?: number
  mlpFactor?: number      // intermediate_size / hidden_size
  gqaRatio?: number       // num_heads / num_kv_heads

  // MoE
  isMoe: boolean
  numExperts?: number
  numSharedExperts?: number       // Shared expert count (always active)
  numExpertsPerToken?: number
  numActivatedExperts?: number    // Total activated experts (routed + shared)
  moeIntermediateSize?: number    // Expert FFN size

  // Metadata
  createdAt?: string       // Model creation timestamp

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
