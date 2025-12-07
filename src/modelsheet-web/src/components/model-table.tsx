import { useState } from "react"
import { ArrowUpDown, Search, Settings2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { ModelInfo, ColumnConfig, ComplexityLevel, SortConfig } from "@/lib/types"
import { COMPLEXITY_PRESETS } from "@/lib/model-data"
import type { Language } from "@/lib/i18n"

interface ModelTableProps {
  models: ModelInfo[]
  columns: ColumnConfig[]
  onColumnChange?: (columns: ColumnConfig[]) => void
  onComplexityChange?: (level: ComplexityLevel) => void
  currentComplexity: ComplexityLevel
  language: Language
  selectedModels?: Set<string>
  onModelSelect?: (modelId: string) => void
}

export function ModelTable({
  models,
  columns,
  currentComplexity,
  onComplexityChange,
  selectedModels = new Set(),
  onModelSelect,
  language,
}: ModelTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "asc",
  })

  // Get visible columns based on complexity
  const preset = COMPLEXITY_PRESETS[currentComplexity]
  const visibleColumns = columns.filter((col) => preset.columns.includes(col.key))

  // Filter models
  const filteredModels = models.filter((model) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      model.name?.toLowerCase().includes(searchLower) ||
      model.provider?.toLowerCase().includes(searchLower) ||
      model.baseModel?.toLowerCase().includes(searchLower)
    )
  })

  // Sort models
  const sortedModels = [...filteredModels].sort((a, b) => {
    if (!sortConfig.key) return 0

    const aVal = a[sortConfig.key]
    const bVal = b[sortConfig.key]

    if (aVal == null) return 1
    if (bVal == null) return -1

    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal
    }

    if (sortConfig.key.includes("Date") || sortConfig.key.includes("date")) {
      const aDate = new Date(aVal as string).getTime()
      const bDate = new Date(bVal as string).getTime()
      return sortConfig.direction === "asc" ? aDate - bDate : bDate - aDate
    }

    const aStr = String(aVal).toLowerCase()
    const bStr = String(bVal).toLowerCase()
    return sortConfig.direction === "asc"
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr)
  })

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.direction === "asc") {
          return { key, direction: "desc" }
        } else {
          return { key: null, direction: "asc" }
        }
      }
      return { key, direction: "asc" }
    })
  }

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
        return String(value)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={language === "zh" ? "搜索模型..." : "Search models..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{language === "zh" ? "复杂度:" : "Complexity:"}</span>
          <ToggleGroup
            type="single"
            value={currentComplexity}
            onValueChange={(value) => {
              if (value && onComplexityChange) {
                onComplexityChange(value as ComplexityLevel)
              }
            }}
          >
            <ToggleGroupItem value="simple" aria-label={language === "zh" ? "简单" : "Simple"}>
              {language === "zh" ? "简单" : "Simple"}
            </ToggleGroupItem>
            <ToggleGroupItem value="enthusiast" aria-label={language === "zh" ? "爱好者" : "Enthusiast"}>
              {language === "zh" ? "爱好者" : "Enthusiast"}
            </ToggleGroupItem>
            <ToggleGroupItem value="developer" aria-label={language === "zh" ? "开发者" : "Developer"}>
              {language === "zh" ? "开发者" : "Developer"}
            </ToggleGroupItem>
            <ToggleGroupItem value="custom" aria-label={language === "zh" ? "自定义" : "Custom"}>
              {language === "zh" ? "自定义" : "Custom"}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {onModelSelect && (
                <TableHead className="w-12">
                  <span className="sr-only">选择</span>
                </TableHead>
              )}
              {visibleColumns.map((column) => (
                <TableHead key={column.key}>
                  {column.sortable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8 data-[state=open]:bg-accent"
                      onClick={() => handleSort(column.key)}
                    >
                      {column.label}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <span>{column.label}</span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedModels.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length + (onModelSelect ? 1 : 0)}
                  className="h-24 text-center"
                >
                  {language === "zh" ? "没有找到匹配的模型" : "No matching models found"}
                </TableCell>
              </TableRow>
            ) : (
              sortedModels.map((model) => (
                <TableRow
                  key={model.id}
                  className="hover:bg-muted/50"
                >
                  {onModelSelect && (
                    <TableCell className="w-12">
                      <Checkbox
                        checked={selectedModels.has(model.id)}
                        onCheckedChange={() => onModelSelect(model.id)}
                        aria-label={`选择 ${model.name}`}
                      />
                    </TableCell>
                  )}
                  {visibleColumns.map((column) => (
                    <TableCell key={column.key}>
                      {formatValue(model[column.key], column.type)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        显示 {sortedModels.length} / {models.length} 个模型
      </div>
    </div>
  )
}
