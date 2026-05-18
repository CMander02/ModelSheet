import { useState, useMemo, useCallback } from "react"
import { useNavigate, Link } from "react-router-dom"
import { providerSlug, isNewThisWeek } from "@/lib/utils"
import { ArrowUpDown, ArrowUp, ArrowDown, Info } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ModalityIcons } from "@/components/modality-icons"
import { ModelBrandIcon, ProviderBrandIcon } from "@/components/brand-icon"
import { ParamCell } from "@/components/param-cell"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ModelInfo, ColumnConfig, ComplexityLevel, SortConfig } from "@/lib/types"
import { COMPLEXITY_PRESETS } from "@/lib/model-data"
import type { Language } from "@/lib/i18n"

interface ModelTableProps {
  models: ModelInfo[]
  totalCount: number
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
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
  searchTerm?: string
  onModelClick?: (model: ModelInfo) => void
}

export function ModelTable({
  models,
  totalCount,
  hasMore,
  isLoadingMore,
  onLoadMore,
  columns,
  currentComplexity,
  onComplexityChange: _onComplexityChange,
  onCustomFieldsClick: _onCustomFieldsClick,
  selectedModels = new Set(),
  onModelSelect,
  onClearSelection,
  onCompare,
  language,
  onModelClick,
}: ModelTableProps) {
  const navigate = useNavigate()
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "createdAt",
    direction: "desc",
  })

  // Get visible columns based on complexity
  const preset = COMPLEXITY_PRESETS[currentComplexity]
  const visibleColumns = useMemo(
    () => columns.filter((col) => preset.columns.includes(col.key)),
    [columns, preset.columns]
  )

  // Sort models (client-side, current page only)
  const sortedModels = useMemo(() => {
    if (!sortConfig.key) return models

    return [...models].sort((a, b) => {
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
  }, [models, sortConfig])

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

  const handleRowClick = useCallback((model: ModelInfo, e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('a, button, input, [role="checkbox"]')) return
    if (onModelClick) {
      onModelClick(model)
    } else if (model.id?.includes("/")) {
      const [org, name] = model.id.split("/")
      navigate(`/${org}/${name}`)
    }
  }, [navigate, onModelClick])

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
        return value ? "✅" : "❌"
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
          noResults: "没有找到匹配的模型",
          loadMore: "加载更多",
          loading: "加载中...",
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
          noResults: "No matching models found",
          loadMore: "Load More",
          loading: "Loading...",
        }
  }, [language])

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Selection bar */}
      {selectedModels.size > 0 && (
        <div className="shrink-0 flex items-center gap-3 h-9">
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
        </div>
      )}

      {/* Table Container */}
      <div className="flex-1 rounded-md border overflow-hidden bg-card min-h-0 flex flex-col">
        <div
          className="flex-1 overflow-auto modelsheet-scroll"
          style={{ scrollbarGutter: 'stable' }}
        >
          <table className="w-full caption-bottom text-sm border-collapse">
            <thead className="sticky top-0 z-20 bg-card border-b shadow-[0_1px_0_0_var(--border)]">
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
                      left: onModelSelect ? '48px' : '0px',
                      minWidth: '140px',
                      maxWidth: '200px',
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
                    className="group border-b transition-colors cursor-pointer"
                    onClick={(e) => handleRowClick(model, e)}
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
                          colIndex === 0 ? `sticky z-10` : ''
                        } ${column.key === "name" ? 'relative overflow-hidden' : ''}`}
                        style={colIndex === 0 ? {
                          left: onModelSelect ? '48px' : '0px',
                          minWidth: '140px',
                          maxWidth: '200px',
                        } : undefined}
                      >
                        {(column.key === "inputModalities" || column.key === "outputModalities") ? (
                          <ModalityIcons modalities={model[column.key] || []} />
                        ) : (column.key === "totalParameters" || column.key === "activeParameters") ? (
                          <ParamCell value={model[column.key]} model={model} />
                        ) : column.key === "name" ? (
                          <>
                            {isNewThisWeek(model.createdAt) && (
                              <span className="absolute top-0 left-0 w-[38px] h-[38px] overflow-hidden pointer-events-none z-10">
                                <span className="absolute top-[9px] -left-[13px] w-[52px] text-center text-[8px] font-black leading-none text-white py-[3px] rotate-[-45deg] bg-gradient-to-r from-violet-500 to-pink-500 select-none">
                                  NEW
                                </span>
                              </span>
                            )}
                            <Link
                              to={model.id?.includes("/") ? `/${model.id.split("/")[0]}/${model.id.split("/")[1]}` : "#"}
                              className="flex items-center gap-2 hover:text-primary hover:underline transition-colors min-w-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ModelBrandIcon model={model.id} className="shrink-0" />
                              <span className="truncate">{formatValue(model[column.key], column.type)}</span>
                              {model.nameNote && (
                                <TooltipProvider delayDuration={200}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="shrink-0 h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" onClick={e => e.preventDefault()} />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs text-xs font-mono">
                                      {model.nameNote}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </Link>
                          </>
                        ) : column.key === "provider" ? (
                          <Link
                            to={`/${providerSlug(String(model[column.key] ?? ""))}`}
                            className="inline-flex items-center gap-2 hover:text-primary hover:underline transition-colors"
                            onClick={e => e.stopPropagation()}
                          >
                            <ProviderBrandIcon provider={String(model[column.key] ?? "")} />
                            <span>{formatValue(model[column.key], column.type)}</span>
                          </Link>
                        ) : column.key === "huggingfaceUrl" && model.huggingfaceUrl ? (
                          <a
                            href={model.huggingfaceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary hover:underline transition-colors"
                          >
                            {model.huggingfaceUrl.replace(/^https?:\/\/huggingface\.co\//, '')}
                          </a>
                        ) : column.key === "arxivUrl" && model.arxivUrl ? (
                          <a
                            href={model.arxivUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary hover:underline transition-colors"
                          >
                            {model.arxivUrl.match(/(\d{4}\.\d{4,5})/)?.[1] || model.arxivUrl}
                          </a>
                        ) : (
                          formatValue(model[column.key], column.type)
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Load more indicator */}
        {hasMore && (
          <div className="shrink-0 border-t px-4 py-3 flex items-center justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? t.loading : t.loadMore}
              {totalCount > models.length && (
                <span className="ml-1 text-muted-foreground font-normal">
                  ({models.length}/{totalCount})
                </span>
              )}
            </Button>
          </div>
        )}

        {!hasMore && models.length > 0 && (
          <div className="shrink-0 border-t px-4 py-2 flex items-center justify-center">
            <span className="text-xs text-muted-foreground">
              {t.modelsTotal(totalCount)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
