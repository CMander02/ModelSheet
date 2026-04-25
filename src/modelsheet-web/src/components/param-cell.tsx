import { HelpCircle, Info } from "lucide-react"
import type { ModelInfo } from "@/lib/types"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ParamCellProps {
  value: number | null | undefined
  model: ModelInfo
}

function formatNumber(v: number): string {
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9)  return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6)  return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3)  return `${(v / 1e3).toFixed(1)}K`
  return v.toLocaleString()
}

function SourceTooltip({ label, source, sourceUrl }: {
  label: React.ReactNode
  source?: string | null
  sourceUrl?: string | null
}) {
  if (!source) return <>{label}</>
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{label}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary"
              onClick={e => e.stopPropagation()}
            >
              {source}
            </a>
          ) : (
            <span>{source}</span>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function ParamCell({ value, model }: ParamCellProps) {
  const confidence = model.parameterConfidence ?? "official"
  const source = model.parameterSource
  const sourceUrl = model.parameterSourceUrl

  if (value == null) {
    const hint = source ?? "Undisclosed"
    return (
      <SourceTooltip
        label={<span className="text-muted-foreground">—</span>}
        source={hint}
        sourceUrl={sourceUrl}
      />
    )
  }

  const formatted = formatNumber(value)

  if (confidence === "rumored") {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 text-muted-foreground italic cursor-help">
              <span>~{formatted}</span>
              <HelpCircle className="h-3.5 w-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            <p className="font-medium mb-0.5">Rumored / unverified</p>
            {source && (
              sourceUrl ? (
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="underline hover:text-primary" onClick={e => e.stopPropagation()}>
                  {source}
                </a>
              ) : <span>{source}</span>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (confidence === "reported") {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 cursor-help">
              <span>{formatted}</span>
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            <p className="font-medium mb-0.5">Reported / third-party</p>
            {source && (
              sourceUrl ? (
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="underline hover:text-primary" onClick={e => e.stopPropagation()}>
                  {source}
                </a>
              ) : <span>{source}</span>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return <span>{formatted}</span>
}
