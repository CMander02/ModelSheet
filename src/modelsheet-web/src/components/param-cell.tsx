import { HelpCircle, Info } from "lucide-react"
import type { ModelInfo } from "@/lib/types"

interface ParamCellProps {
  /** raw numeric value (bytes/params) */
  value: number | null | undefined
  /** the whole model so we can pick up parameterConfidence/source */
  model: ModelInfo
}

function formatNumber(v: number): string {
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return v.toLocaleString()
}

/**
 * Render a parameter count cell with a visual cue based on the model's
 * `parameterConfidence` field.
 *
 *   official (or field absent) → plain number,       e.g. "405.0B"
 *   reported                   → number + info icon, e.g. "1.8T (i)"
 *   rumored                    → "~" prefix + muted + help icon, e.g. "~1.8T (?)"
 *   null/undefined             → em-dash with optional source tooltip
 */
export function ParamCell({ value, model }: ParamCellProps) {
  const confidence = model.parameterConfidence ?? "official"
  const source = model.parameterSource
  const sourceUrl = model.parameterSourceUrl

  // No number available — show em-dash, possibly with source hint
  if (value === null || value === undefined) {
    const title = source ? source : "Undisclosed"
    return (
      <span className="text-muted-foreground" title={title}>—</span>
    )
  }

  const formatted = formatNumber(value)

  if (confidence === "rumored") {
    const title = source ? `Rumored — ${source}` : "Rumored / unverified"
    return (
      <span
        className="inline-flex items-center gap-1 text-muted-foreground italic"
        title={title}
      >
        <span>~{formatted}</span>
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex hover:text-foreground"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </a>
        ) : (
          <HelpCircle className="h-3.5 w-3.5" />
        )}
      </span>
    )
  }

  if (confidence === "reported") {
    const title = source ? `Reported — ${source}` : "Reported / third-party"
    return (
      <span className="inline-flex items-center gap-1" title={title}>
        <span>{formatted}</span>
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex text-muted-foreground hover:text-foreground"
          >
            <Info className="h-3.5 w-3.5" />
          </a>
        ) : (
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </span>
    )
  }

  // official (default)
  return <span>{formatted}</span>
}
