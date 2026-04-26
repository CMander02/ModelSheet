/**
 * Enhanced comparison table — sticky-header table style.
 * Fields are rows; each model is a column. Rows are always aligned.
 */

import { X, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { ModelInfo, ColumnConfig, ComplexityLevel } from "@/lib/types"
import { COMPLEXITY_PRESETS } from "@/lib/model-data"
import { formatValue, getHighlightClass } from "@/lib/formatters"
import { ModelBrandIcon, ProviderBrandIcon } from "@/components/brand-icon"
import { ParamCell } from "@/components/param-cell"

interface EnhancedComparisonTableProps {
  models: ModelInfo[]
  columns: ColumnConfig[]
  onRemoveModel: (modelId: string) => void
  complexity: ComplexityLevel
}

// ── Field groupings ──────────────────────────────────────────────────────────

const BASIC_KEYS    = ["totalParameters", "activeParameters", "contextLength", "embeddingDim", "vocabSize"]
const ARCH_KEYS     = ["architecture", "numLayers", "numHeads", "numKvHeads", "hiddenSize", "intermediateSize", "positionEncoding", "activation", "normType", "mlpFactor", "gqaRatio", "torchDtype"]
const MOE_KEYS      = ["isMoe", "numExperts", "numSharedExperts", "numExpertsPerToken", "numActivatedExperts", "moeIntermediateSize"]
const TOKEN_KEYS    = ["hasChatTemplate", "bosToken", "eosToken"]
const TYPE_KEYS     = ["isAdapter", "baseModel"]

const SECTION_LABELS: Record<string, string> = {
  basic:        "基础参数",
  architecture: "架构参数",
  moe:          "MoE 配置",
  tokenizer:    "Tokenizer",
  type:         "类型标记",
}

export function EnhancedComparisonTable({
  models,
  columns,
  onRemoveModel,
  complexity,
}: EnhancedComparisonTableProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    basic: false,
    architecture: false,
    moe: false,
    tokenizer: true,
    type: true,
  })

  const preset = COMPLEXITY_PRESETS[complexity]
  const visible = columns.filter(c => preset.columns.includes(c.key))

  const sections: { id: string; cols: ColumnConfig[] }[] = [
    { id: "basic",        cols: visible.filter(c => BASIC_KEYS.includes(c.key)) },
    { id: "architecture", cols: visible.filter(c => ARCH_KEYS.includes(c.key)) },
    { id: "moe",          cols: visible.filter(c => MOE_KEYS.includes(c.key) && models.some(m => m.isMoe)) },
    { id: "tokenizer",    cols: visible.filter(c => TOKEN_KEYS.includes(c.key)) },
    { id: "type",         cols: visible.filter(c => TYPE_KEYS.includes(c.key)) },
  ].filter(s => s.cols.length > 0)

  const toggle = (id: string) => setCollapsed(p => ({ ...p, [id]: !p[id] }))

  // Column width: equal split, min 200px
  const colW = `minmax(200px, 1fr)`
  const gridCols = `200px repeat(${models.length}, ${colW})`

  return (
    <div className="w-full overflow-x-auto rounded-xl border bg-card shadow-sm">
      <div style={{ display: "grid", gridTemplateColumns: gridCols, minWidth: `${200 + models.length * 200}px` }}>

        {/* ── Sticky model header row ── */}
        {/* Label column header — empty */}
        <div className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-r px-4 py-4" />

        {/* Model header cells */}
        {models.map(model => (
          <div key={model.id} className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b px-4 py-4 border-r last:border-r-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {model.huggingfaceUrl ? (
                  <a
                    href={model.huggingfaceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-bold text-base hover:text-primary hover:underline transition-colors truncate"
                  >
                    <ModelBrandIcon model={model.id} size={18} />
                    <span className="truncate">{model.name}</span>
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 font-bold text-base truncate">
                    <ModelBrandIcon model={model.id} size={18} />
                    <span className="truncate">{model.name}</span>
                  </span>
                )}
                <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <ProviderBrandIcon provider={model.provider} size={12} />
                  <span>{model.provider}</span>
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onRemoveModel(model.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {/* ── Sections ── */}
        {sections.map(section => (
          <>
            {/* Section header — spans all columns */}
            <div
              key={`hdr-${section.id}`}
              className="col-span-full"
              style={{ gridColumn: `1 / -1` }}
            >
              <button
                onClick={() => toggle(section.id)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors border-b"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {SECTION_LABELS[section.id]}
                </span>
                {collapsed[section.id]
                  ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                }
              </button>
            </div>

            {/* Field rows */}
            {!collapsed[section.id] && section.cols.map((col, rowIdx) => {
              const allVals = col.type === "number"
                ? models.map(m => m[col.key as keyof ModelInfo] as number | undefined)
                : []
              const isLast = rowIdx === section.cols.length - 1

              return (
                <>
                  {/* Label cell */}
                  <div
                    key={`label-${section.id}-${col.key}`}
                    className={`px-4 py-2.5 flex items-center border-r bg-muted/10 ${isLast ? "border-b" : "border-b"}`}
                  >
                    <span className="text-xs font-medium text-muted-foreground">{col.label}</span>
                  </div>

                  {/* Value cells — one per model */}
                  {models.map((model, mIdx) => {
                    const raw = model[col.key as keyof ModelInfo]
                    const highlight = col.type === "number"
                      ? getHighlightClass(raw as number, allVals)
                      : ""

                    return (
                      <div
                        key={`val-${section.id}-${col.key}-${model.id}`}
                        className={`px-4 py-2.5 flex items-center justify-end border-b ${mIdx < models.length - 1 ? "border-r" : ""} ${rowIdx % 2 === 0 ? "" : "bg-muted/5"}`}
                      >
                        <span className={`text-sm font-semibold tabular-nums ${highlight} ${highlight ? "px-1.5 py-0.5 rounded" : ""}`}>
                          {col.key === "totalParameters" || col.key === "activeParameters" ? (
                            <ParamCell value={raw as number} model={model} />
                          ) : col.key === "huggingfaceUrl" && raw ? (
                            <a href={raw as string} target="_blank" rel="noopener noreferrer"
                              className="hover:text-primary hover:underline text-xs">
                              HuggingFace ↗
                            </a>
                          ) : col.key === "arxivUrl" && raw ? (
                            <a href={raw as string} target="_blank" rel="noopener noreferrer"
                              className="hover:text-primary hover:underline text-xs">
                              {(raw as string).match(/(\d{4}\.\d{4,5})/)?.[1] || "Paper ↗"}
                            </a>
                          ) : (
                            formatValue(raw, col.type, col.key)
                          )}
                        </span>
                      </div>
                    )
                  })}
                </>
              )
            })}
          </>
        ))}
      </div>
    </div>
  )
}
