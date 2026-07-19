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
  releasedAt?: string

  // Openness: closed | open-weight | open-source
  openness?: string

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

export type TreeColor =
  | "attn" | "ffn" | "norm" | "emb" | "out" | "moe" | "resid" | "input"
  | "cyan" | "purple" | "green" | "steel" | "orange" | "sky" | "blue"
  | "indigo" | "teal" | "amber" | "pink" | "violet"

export interface LeafNode {
  id: string
  type: "leaf"
  label: string
  sub?: string
  color: TreeColor
  residualFrom?: string
}

export interface AddNode {
  id: string
  type: "add"
  from: string
  label?: string
  sub?: string
}

export interface GroupNode {
  id: string
  type: "group"
  label: string
  badge?: string
  sub?: string
  color: TreeColor
  children: TreeNode[]
  defaultExpanded?: boolean
}

export interface RowNode {
  id: string
  type: "row"
  children: Array<LeafNode | GroupNode>
}

export type TreeNode = LeafNode | AddNode | GroupNode | RowNode

export interface DiagramParams {
  totalParameters?: number
  activeParameters?: number
  numLayers?: number
  numHeads?: number
  numKvHeads?: number
  hiddenSize?: number
  embeddingDim?: number
  contextLength?: number
  vocabSize?: number
  intermediateSize?: number
  numExperts?: number
  numSharedExperts?: number
  numExpertsPerToken?: number
  numActivatedExperts?: number
  moeIntermediateSize?: number
  mlpFactor?: number
  gqaRatio?: number
  normEps?: number
  [key: string]: string | number | boolean | null | undefined
}

export interface ArchitectureSourceLink {
  label?: string
  url: string
  type?: string
  [key: string]: unknown
}

export interface ArchitectureVariant {
  id?: string
  name?: string
  aliases?: string[]
  descriptionZh?: string
  descriptionEn?: string
  [key: string]: unknown
}

export interface ArchitectureEvidence {
  source?: string
  url?: string
  noteZh?: string
  noteEn?: string
  [key: string]: unknown
}

export interface ArchitectureSpec {
  id: string
  family: string
  era: string
  type: "encoder" | "decoder" | "encoder-decoder"
  normPlacement: "pre" | "post"
  descriptionZh: string
  descriptionEn: string
  paperUrl?: string
  hfOrg?: string
  defaultParams: DiagramParams
  sourceLinks?: ArchitectureSourceLink[]
  variants?: ArchitectureVariant[]
  evidence?: ArchitectureEvidence[]
  features?: Record<string, string | number | boolean | null>
  diagramSubtitle?: string
  diagramNodes: TreeNode[]
  modelTypeAliases?: string[]
}

export interface ProviderInfo {
  id: string
  name: string
  displayName: string
  nameEn?: string
  nameZh?: string
  region?: "cn" | "global" | "other" | string
  orgs?: string[]
  scan?: Record<string, unknown>
  modelCount: number
  archCount: number
  latestReleasedAt: string | null
}

export interface ProviderDetail {
  provider: ProviderInfo
  models: ModelInfo[]
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
