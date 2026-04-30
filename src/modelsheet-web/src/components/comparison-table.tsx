import { X } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import type { ModelInfo, ColumnConfig, ComplexityLevel } from "@/lib/types"
import { COMPLEXITY_PRESETS } from "@/lib/model-data"
import { ModelBrandIcon, ProviderBrandIcon } from "@/components/brand-icon"

interface ComparisonTableProps {
  models: ModelInfo[]
  columns: ColumnConfig[]
  onRemoveModel: (modelId: string) => void
  complexity: ComplexityLevel
}

export function ComparisonTable({
  models,
  columns,
  onRemoveModel,
  complexity,
}: ComparisonTableProps) {
  const preset = COMPLEXITY_PRESETS[complexity]
  const visibleColumns = columns.filter((col) => preset.columns.includes(col.key))

  const formatValue = (value: any, type: string) => {
    if (value === null || value === undefined) return "-"

    switch (type) {
      case "number":
        if (value >= 1000000000000) {
          return `${(value / 1000000000000).toFixed(1)}T`
        }
        if (value >= 1000000000) {
          return `${(value / 1000000000).toFixed(1)}B`
        }
        if (value >= 1000000) {
          return `${(value / 1000000).toFixed(1)}M`
        }
        if (value >= 1000) {
          return `${(value / 1000).toFixed(1)}K`
        }
        return value.toLocaleString()
      case "boolean":
        return value ? "✓" : "✗"
      case "array":
        return Array.isArray(value) ? value.join(", ") : value
      case "date":
        return new Date(value).toLocaleDateString()
      default:
        // Special formatting for openness field
        if (value === "closed") return "🔒 Closed"
        if (value === "open-weight") return "🔓 Open-weight"
        if (value === "open-source") return "🌱 Open-source"
        return String(value)
    }
  }

  // Find max/min values for numeric columns for highlighting
  const getHighlightClass = (column: ColumnConfig, value: any, _modelId: string) => {
    if (column.type !== "number" || value == null) return ""

    const values = models
      .map((m) => m[column.key])
      .filter((v) => v != null && typeof v === "number") as number[]

    if (values.length <= 1) return ""

    const max = Math.max(...values)
    const min = Math.min(...values)

    if (value === max) return "bg-green-100 dark:bg-green-900/20 font-semibold"
    if (value === min) return "bg-red-100 dark:bg-red-900/20"

    return ""
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">
              参数
            </TableHead>
            {models.map((model) => (
              <TableHead key={model.id} className="min-w-[200px]">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="inline-flex items-center gap-1.5 font-semibold truncate">
                      <ModelBrandIcon model={model.id} size={16} />
                      <span className="truncate">{model.name}</span>
                    </div>
                    <div className="inline-flex items-center gap-1 text-xs text-muted-foreground truncate mt-0.5">
                      <ProviderBrandIcon provider={model.provider} size={12} />
                      <span className="truncate">{model.provider}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => onRemoveModel(model.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleColumns.map((column) => (
            <TableRow key={column.key}>
              <TableCell className="sticky left-0 bg-background z-10 font-medium">
                {column.label}
              </TableCell>
              {models.map((model) => (
                <TableCell
                  key={model.id}
                  className={getHighlightClass(column, model[column.key], model.id)}
                >
                  {formatValue(model[column.key], column.type)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
