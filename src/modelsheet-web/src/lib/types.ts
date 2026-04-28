export interface ModelInfo {
  // Identification
  id: string
  name: string
  provider: string
  huggingfaceUrl?: string
  modelscopeUrl?: string
  arxivUrl?: string        // arXiv paper URL
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

  // Modalities (text, image, audio, video)
  inputModalities?: string[]      // Input modalities
  outputModalities?: string[]     // Output modalities

  // Metadata
  createdAt?: string       // Model creation timestamp

  // Parameter provenance (applies to totalParameters / activeParameters)
  // "official" (default, can be omitted) — from config.json / paper / spec sheet
  // "reported" — acknowledged third-party disclosure (reports, papers)
  // "rumored"  — community speculation / unverified estimate
  parameterConfidence?: "official" | "reported" | "rumored"
  parameterSource?: string         // Short human-readable source
  parameterSourceUrl?: string      // Optional URL to the source

  nameNote?: string                // Short note shown as tooltip on the model name

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
