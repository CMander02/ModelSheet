import { useState, useEffect, useMemo } from "react"
import { ArrowUpDown, Search, ArrowUp, ArrowDown } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
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
  onCustomFieldsClick?: () => void
  currentComplexity: ComplexityLevel
  language: Language
  selectedModels?: Set<string>
  onModelSelect?: (modelId: string) => void
  onClearSelection?: () => void
  onCompare?: () => void
}

export function ModelTable({
  models,
  columns,
  currentComplexity,
  onComplexityChange,
  onCustomFieldsClick,
  selectedModels = new Set(),
  onModelSelect,
  onClearSelection,
  onCompare,
  language,
}: ModelTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "asc",
  })

  // Debounce search - 立即生效模式 (300ms延迟)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Get visible columns based on complexity
  const preset = COMPLEXITY_PRESETS[currentComplexity]
  const visibleColumns = useMemo(
    () => columns.filter((col) => preset.columns.includes(col.key)),
    [columns, preset.columns]
  )

  // Filter models - 使用 debounced search term
  // 支持：1. 不区分大小写 2. 部分匹配 3. 搜索 id 中 / 前后的内容
  const filteredModels = useMemo(() => {
    if (!debouncedSearchTerm) return models

    const searchLower = debouncedSearchTerm.toLowerCase()
    return models.filter((model) => {
      // 将 id 按 / 分割，分别搜索
      const idParts = model.id?.toLowerCase().split("/") || []
      const searchableText = [
        model.name?.toLowerCase(),
        model.provider?.toLowerCase(),
        ...idParts
      ].filter(Boolean).join(" ")
      return searchableText.includes(searchLower)
    })
  }, [models, debouncedSearchTerm])

  // Sort models
  const sortedModels = useMemo(() => {
    if (!sortConfig.key) return filteredModels

    return [...filteredModels].sort((a, b) => {
      const aVal = a[sortConfig.key!]
      const bVal = b[sortConfig.key!]

      if (aVal == null) return 1
      if (bVal == null) return -1

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal
      }

      if (sortConfig.key!.includes("Date") || sortConfig.key!.includes("date")) {
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
  }, [filteredModels, sortConfig])

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

  const t = useMemo(() => {
    return language === "zh"
      ? {
          modelsTotal: (count: number) => `共 ${count} 个模型`,
          selectedCount: (count: number) => `已选 ${count} 个`,
          clearSelection: "清除",
          compareSelected: "比较选中",
          complexityLabel: "复杂度:",
          simple: "简单",
          enthusiast: "爱好者",
          developer: "开发者",
          custom: "自定义",
          searchModels: "搜索模型...",
          noResults: "没有找到匹配的模型"
        }
      : {
          modelsTotal: (count: number) => `${count} models in total`,
          selectedCount: (count: number) => `${count} selected`,
          clearSelection: "Clear",
          compareSelected: "Compare Selected",
          complexityLabel: "Complexity:",
          simple: "Simple",
          enthusiast: "Enthusiast",
          developer: "Developer",
          custom: "Custom",
          searchModels: "Search models...",
          noResults: "No matching models found"
        }
  }, [language])

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Left: Search box */}
        <div className="relative flex-1 sm:flex-none sm:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={t.searchModels}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Center: Model count and selection info */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {t.modelsTotal(sortedModels.length)}
          </span>
          {selectedModels.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">|</span>
              <span className="text-sm font-medium whitespace-nowrap">
                {t.selectedCount(selectedModels.size)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
                onClick={onClearSelection}
              >
                {t.clearSelection}
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-7"
                onClick={onCompare}
                disabled={selectedModels.size < 2}
              >
                {t.compareSelected}
              </Button>
            </>
          )}
        </div>

        {/* Right: Complexity toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t.complexityLabel}</span>
          <ToggleGroup
            type="single"
            value={currentComplexity}
            onValueChange={(value) => {
              if (value && onComplexityChange) {
                onComplexityChange(value as ComplexityLevel)
              }
            }}
          >
            <ToggleGroupItem value="simple" aria-label={t.simple}>
              {t.simple}
            </ToggleGroupItem>
            <ToggleGroupItem value="enthusiast" aria-label={t.enthusiast}>
              {t.enthusiast}
            </ToggleGroupItem>
            <ToggleGroupItem value="developer" aria-label={t.developer}>
              {t.developer}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="custom"
              aria-label={t.custom}
              onClick={() => {
                // 当已经是 custom 模式时，点击仍然打开选择器
                if (currentComplexity === "custom" && onCustomFieldsClick) {
                  onCustomFieldsClick()
                }
              }}
            >
              {t.custom}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Table Container - 固定高度容器 */}
      <div
        className="rounded-md border"
        style={{ height: 'calc(100vh - 13rem)' }}
      >
        {/* 滚动容器 */}
        <div className="h-full overflow-auto">
          <table className="w-full caption-bottom text-sm border-collapse">
            {/* 表头 - 使用thead sticky */}
            <thead className="sticky top-0 z-20 bg-card border-b">
              <tr>
                {onModelSelect && (
                  <th
                    className="h-12 px-4 text-left align-middle font-medium text-muted-foreground sticky left-0 z-30 bg-card w-12"
                    style={{ minWidth: '48px', maxWidth: '48px' }}
                  >
                    <span className="sr-only">选择</span>
                  </th>
                )}
                {visibleColumns.map((column, index) => (
                  <th
                    key={column.key}
                    className={`h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap ${
                      index === 0
                        ? `sticky z-30 bg-card`
                        : ''
                    }`}
                    style={index === 0 ? {
                      left: onModelSelect ? '48px' : '0px'
                    } : { minWidth: '120px' }}
                  >
                    {column.sortable ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                        onClick={() => handleSort(column.key)}
                      >
                        {column.label}
                        {sortConfig.key === column.key ? (
                          sortConfig.direction === "asc" ? (
                            <ArrowUp className="ml-2 h-4 w-4 text-primary" />
                          ) : (
                            <ArrowDown className="ml-2 h-4 w-4 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    ) : (
                      <span>{column.label}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedModels.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + (onModelSelect ? 1 : 0)}
                    className="h-24 text-center p-4"
                  >
                    {t.noResults}
                  </td>
                </tr>
              ) : (
                sortedModels.map((model) => (
                  <tr
                    key={model.id}
                    className="group border-b transition-colors"
                  >
                    {onModelSelect && (
                      <td
                        className="p-4 align-middle sticky left-0 z-10 bg-card group-hover:bg-muted transition-colors"
                        style={{ minWidth: '48px', maxWidth: '48px' }}
                      >
                        <Checkbox
                          checked={selectedModels.has(model.id)}
                          onCheckedChange={() => onModelSelect(model.id)}
                          aria-label={`选择 ${model.name}`}
                        />
                      </td>
                    )}
                    {visibleColumns.map((column, colIndex) => (
                      <td
                        key={column.key}
                        className={`p-4 align-middle bg-card group-hover:bg-muted transition-colors ${
                          colIndex === 0
                            ? `sticky z-10 whitespace-nowrap`
                            : ''
                        }`}
                        style={colIndex === 0 ? {
                          left: onModelSelect ? '48px' : '0px'
                        } : undefined}
                      >
                        {formatValue(model[column.key], column.type)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
