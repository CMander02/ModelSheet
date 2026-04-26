export interface DiagramParams {
  numLayers?:        number
  numHeads?:         number
  numKvHeads?:       number
  hiddenSize?:       number
  contextLength?:    number
  vocabSize?:        number
  intermediateSize?: number
  numExperts?:       number
  numSharedExperts?: number
  numExpertsPerToken?: number
  /** Pass true to scale the diagram to fill its container (used on detail page) */
  fit?: boolean
}

// ─── Shared style block appended to every diagram ────────────────────────────

export const BASE_STYLES = `
    classDef norm    fill:#fef9c3,stroke:#facc15,color:#713f12
    classDef attn    fill:#1e293b,stroke:#334155,color:#f1f5f9
    classDef ffn     fill:#dcfce7,stroke:#4ade80,color:#14532d
    classDef emb     fill:#dbeafe,stroke:#60a5fa,color:#1e3a8a
    classDef out     fill:#fee2e2,stroke:#f87171,color:#7f1d1d
    classDef pool    fill:#fce7f3,stroke:#f0abfc,color:#701a75
    classDef moe     fill:#ede9fe,stroke:#a78bfa,color:#4c1d95
    classDef resid   fill:#fff,stroke:#94a3b8,color:#475569
    classDef input   fill:#f8fafc,stroke:#cbd5e1,color:#64748b`
