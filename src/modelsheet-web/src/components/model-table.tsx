import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import type { CSSProperties } from "react"
import { useNavigate, Link } from "react-router-dom"
import { providerSlug, isNewThisWeek } from "@/lib/utils"
import { ArrowUpDown, ArrowUp, ArrowDown, Info, Pin } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import type { HomeScrollPosition } from "@/lib/model-data"
import { translateProvider, type Language } from "@/lib/i18n"

const PULL_LOAD_THRESHOLD = 72
const PULL_MAX = 112
const PULL_PRIME_WHEELS = 2
const DEFAULT_COLUMN_WIDTH = 124
const SELECT_COLUMN_WIDTH = 48
const PINNED_COLUMNS_STORAGE_KEY = "modelsheet_pinned_columns"
const DEFAULT_PINNED_COLUMN_KEYS = ["name"]
const COLUMN_MIN_WIDTHS: Record<string, number> = {
  name: 188,
  provider: 160,
  totalParameters: 132,
  activeParameters: 132,
  contextLength: 132,
  architecture: 140,
  isMoe: 96,
  releasedAt: 128,
  arxivUrl: 132,
  numLayers: 112,
  numHeads: 112,
  numKvHeads: 112,
  hiddenSize: 132,
  intermediateSize: 144,
  positionEncoding: 140,
  numExperts: 112,
  numSharedExperts: 132,
  numExpertsPerToken: 140,
  numActivatedExperts: 140,
  moeIntermediateSize: 148,
}

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
  sortConfig: SortConfig
  onSortChange: (sortConfig: SortConfig) => void
  scrollRestorePosition?: HomeScrollPosition | null
  scrollRestoreKey?: number
  onScrollPositionChange?: (position: HomeScrollPosition) => void
}

export function ModelTable({
  models,
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
  sortConfig,
  onSortChange,
  scrollRestorePosition,
  scrollRestoreKey = 0,
  onScrollPositionChange,
}: ModelTableProps) {
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const latestScrollPositionRef = useRef<HomeScrollPosition | null>(null)
  const scrollSaveRafRef = useRef<number | null>(null)
  const restoredScrollKeyRef = useRef<number | null>(null)
  const autoLoadLockRef = useRef(false)
  const bottomPullEventsRef = useRef(0)
  const pullDistanceRef = useRef(0)
  const pullResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pullDistance, setPullDistanceState] = useState(0)
  const [headerMenuColumnKey, setHeaderMenuColumnKey] = useState<string | null>(null)
  const [headerMenuPoint, setHeaderMenuPoint] = useState({ x: 0, y: 0 })
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const [pinnedColumnKeys, setPinnedColumnKeys] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULT_PINNED_COLUMN_KEYS
    try {
      const raw = localStorage.getItem(PINNED_COLUMNS_STORAGE_KEY)
      const saved = raw ? JSON.parse(raw) : null
      return Array.isArray(saved) && saved.every((key) => typeof key === "string")
        ? saved
        : DEFAULT_PINNED_COLUMN_KEYS
    } catch {
      return DEFAULT_PINNED_COLUMN_KEYS
    }
  })
  const setPullDistance = useCallback((value: number) => {
    const next = Math.max(0, Math.min(PULL_MAX, value))
    pullDistanceRef.current = next
    setPullDistanceState(next)
  }, [])

  // Get visible columns based on complexity
  const preset = COMPLEXITY_PRESETS[currentComplexity]
  const visibleColumns = useMemo(
    () => columns.filter((col) => preset.columns.includes(col.key)),
    [columns, preset.columns]
  )
  const pinnedOffsets = useMemo(() => {
    const offsets = new Map<string, number>()
    let left = onModelSelect ? SELECT_COLUMN_WIDTH : 0
    for (const column of visibleColumns) {
      if (!pinnedColumnKeys.includes(column.key)) continue
      offsets.set(column.key, left)
      left += COLUMN_MIN_WIDTHS[column.key] ?? DEFAULT_COLUMN_WIDTH
    }
    return offsets
  }, [onModelSelect, pinnedColumnKeys, visibleColumns])
  const lastPinnedColumnKey = useMemo(() => {
    const pinned = visibleColumns.filter((column) => pinnedOffsets.has(column.key))
    return pinned[pinned.length - 1]?.key ?? null
  }, [pinnedOffsets, visibleColumns])
  const tableMinWidth = useMemo(() => {
    const selectionWidth = onModelSelect ? SELECT_COLUMN_WIDTH : 0
    return visibleColumns.reduce(
      (sum, column) => sum + (COLUMN_MIN_WIDTHS[column.key] ?? DEFAULT_COLUMN_WIDTH),
      selectionWidth
    )
  }, [onModelSelect, visibleColumns])

  const getColumnStyle = (column: ColumnConfig): CSSProperties => {
    const width = COLUMN_MIN_WIDTHS[column.key] ?? DEFAULT_COLUMN_WIDTH
    const pinnedLeft = pinnedOffsets.get(column.key)
    const isPinned = pinnedLeft !== undefined
    return {
      minWidth: `${width}px`,
      width: `${width}px`,
      maxWidth: `${width}px`,
      ...(isPinned
        ? {
            left: `${pinnedLeft}px`,
            boxShadow: column.key === lastPinnedColumnKey
              ? "1px 0 0 0 var(--border), 10px 0 16px -16px rgba(15, 23, 42, 0.55)"
              : "1px 0 0 0 var(--border)",
          }
        : null),
    }
  }

  const handleSort = (column: ColumnConfig) => {
    const defaultDirection = column.type === "string" ? "asc" : "desc"
    const direction = sortConfig.key === column.key
      ? (sortConfig.direction === "asc" ? "desc" : "asc")
      : defaultDirection
    onSortChange({ key: column.key, direction })
  }

  const togglePinnedColumn = useCallback((key: string) => {
    setPinnedColumnKeys((prev) => {
      const next = prev.includes(key)
        ? prev.filter((item) => item !== key)
        : [...prev, key]
      try {
        localStorage.setItem(PINNED_COLUMNS_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Ignore persistence failures; the in-memory setting still applies.
      }
      return next
    })
  }, [])

  const openHeaderMenu = useCallback((event: React.MouseEvent, column: ColumnConfig) => {
    event.preventDefault()
    setHeaderMenuColumnKey(column.key)
    setHeaderMenuPoint({ x: event.clientX, y: event.clientY })
    setHeaderMenuOpen(true)
  }, [])

  const headerMenuColumn = useMemo(
    () => visibleColumns.find((column) => column.key === headerMenuColumnKey) ?? null,
    [headerMenuColumnKey, visibleColumns]
  )

  const getCurrentScrollPosition = useCallback((): HomeScrollPosition | null => {
    const container = scrollRef.current
    if (container) {
      return {
        top: container.scrollTop,
        left: container.scrollLeft,
      }
    }
    return latestScrollPositionRef.current
  }, [])

  const flushScrollPosition = useCallback(() => {
    if (!onScrollPositionChange) return
    const position = getCurrentScrollPosition()
    if (!position) return
    latestScrollPositionRef.current = position
    onScrollPositionChange(position)
  }, [getCurrentScrollPosition, onScrollPositionChange])

  const saveCurrentScrollPosition = useCallback(() => {
    if (scrollSaveRafRef.current != null && typeof window !== "undefined") {
      window.cancelAnimationFrame(scrollSaveRafRef.current)
      scrollSaveRafRef.current = null
    }
    flushScrollPosition()
  }, [flushScrollPosition])

  const handleRowClick = useCallback((model: ModelInfo, e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('a, button, input, [role="checkbox"]')) return
    saveCurrentScrollPosition()
    if (onModelClick) {
      onModelClick(model)
    } else if (model.id?.includes("/")) {
      const [org, name] = model.id.split("/")
      navigate(`/${org}/${name}`)
    }
  }, [navigate, onModelClick, saveCurrentScrollPosition])

  const queueScrollPositionSave = useCallback((container: HTMLDivElement) => {
    if (!onScrollPositionChange) return
    latestScrollPositionRef.current = {
      top: container.scrollTop,
      left: container.scrollLeft,
    }

    if (typeof window === "undefined") {
      flushScrollPosition()
      return
    }

    if (scrollSaveRafRef.current != null) return
    scrollSaveRafRef.current = window.requestAnimationFrame(() => {
      scrollSaveRafRef.current = null
      flushScrollPosition()
    })
  }, [flushScrollPosition, onScrollPositionChange])

  useEffect(() => {
    if (!isLoadingMore) {
      autoLoadLockRef.current = false
      setPullDistance(0)
    }
  }, [isLoadingMore, models.length, setPullDistance])

  useEffect(() => {
    return () => {
      if (pullResetTimerRef.current) clearTimeout(pullResetTimerRef.current)
      if (scrollSaveRafRef.current != null && typeof window !== "undefined") {
        window.cancelAnimationFrame(scrollSaveRafRef.current)
        scrollSaveRafRef.current = null
      }
      flushScrollPosition()
    }
  }, [flushScrollPosition])

  useEffect(() => {
    if (!scrollRestorePosition) return
    if (restoredScrollKeyRef.current === scrollRestoreKey) return
    if (isLoadingMore && (scrollRestorePosition.top > 0 || scrollRestorePosition.left > 0)) return

    const container = scrollRef.current
    if (!container) return

    const applyRestore = () => {
      const nextPosition = {
        top: Math.min(
          Math.max(0, scrollRestorePosition.top),
          Math.max(0, container.scrollHeight - container.clientHeight),
        ),
        left: Math.min(
          Math.max(0, scrollRestorePosition.left),
          Math.max(0, container.scrollWidth - container.clientWidth),
        ),
      }

      container.scrollTo({
        top: nextPosition.top,
        left: nextPosition.left,
        behavior: "auto",
      })
      latestScrollPositionRef.current = nextPosition
      onScrollPositionChange?.(nextPosition)
      restoredScrollKeyRef.current = scrollRestoreKey
    }

    if (typeof window === "undefined") {
      applyRestore()
      return
    }

    const frame = window.requestAnimationFrame(applyRestore)
    return () => window.cancelAnimationFrame(frame)
  }, [
    isLoadingMore,
    models.length,
    onScrollPositionChange,
    scrollRestoreKey,
    scrollRestorePosition,
    tableMinWidth,
  ])

  const schedulePullReset = useCallback(() => {
    if (pullResetTimerRef.current) clearTimeout(pullResetTimerRef.current)
    pullResetTimerRef.current = setTimeout(() => setPullDistance(0), 520)
  }, [setPullDistance])

  const triggerPullLoad = useCallback(() => {
    if (!hasMore || isLoadingMore || autoLoadLockRef.current) return
    autoLoadLockRef.current = true
    setPullDistance(PULL_MAX)
    onLoadMore()
  }, [hasMore, isLoadingMore, onLoadMore, setPullDistance])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    queueScrollPositionSave(container)
    const remaining = container.scrollHeight - container.scrollTop - container.clientHeight
    if (remaining > 24 && pullDistanceRef.current > 0 && !isLoadingMore) {
      bottomPullEventsRef.current = 0
      setPullDistance(0)
    } else if (remaining > 24) {
      bottomPullEventsRef.current = 0
    }
  }, [isLoadingMore, queueScrollPositionSave, setPullDistance])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    const remaining = container.scrollHeight - container.scrollTop - container.clientHeight
    const isAtBottom = remaining <= 4

    if (!isAtBottom || !hasMore || isLoadingMore) {
      if (!isAtBottom) bottomPullEventsRef.current = 0
      if (pullDistanceRef.current > 0 && e.deltaY < 0) {
        setPullDistance(pullDistanceRef.current + e.deltaY * 0.25)
      }
      return
    }

    if (e.deltaY <= 0) {
      bottomPullEventsRef.current = 0
      setPullDistance(pullDistanceRef.current + e.deltaY * 0.35)
      schedulePullReset()
      return
    }

    e.preventDefault()
    if (pullResetTimerRef.current) clearTimeout(pullResetTimerRef.current)
    bottomPullEventsRef.current += 1

    if (bottomPullEventsRef.current <= PULL_PRIME_WHEELS) {
      setPullDistance(Math.min(18, bottomPullEventsRef.current * 7))
      schedulePullReset()
      return
    }

    const next = pullDistanceRef.current + Math.min(18, e.deltaY * 0.16)
    setPullDistance(next)

    if (next >= PULL_LOAD_THRESHOLD) {
      bottomPullEventsRef.current = 0
      triggerPullLoad()
    } else {
      schedulePullReset()
    }
  }, [hasMore, isLoadingMore, schedulePullReset, setPullDistance, triggerPullLoad])

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
          pinColumn: "锁定列",
          unpinColumn: "取消锁定列",
          rightClickColumn: "右键列标题可锁定列",
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
          pinColumn: "Pin column",
          unpinColumn: "Unpin column",
          rightClickColumn: "Right-click a column header to pin it",
        }
  }, [language])

  const pullProgress = Math.min(1, pullDistance / PULL_LOAD_THRESHOLD)

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
      <div className="relative flex-1 rounded-md border overflow-hidden bg-card min-h-0 flex flex-col shadow-xs">
        <DropdownMenu open={headerMenuOpen} onOpenChange={setHeaderMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              className="fixed h-px w-px opacity-0 pointer-events-none"
              style={{ left: headerMenuPoint.x, top: headerMenuPoint.y }}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={2}
            className="w-40"
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            {headerMenuColumn && (
              <DropdownMenuItem
                onClick={() => {
                  togglePinnedColumn(headerMenuColumn.key)
                  setHeaderMenuOpen(false)
                }}
              >
                <Pin className={`mr-2 h-4 w-4 ${pinnedOffsets.has(headerMenuColumn.key) ? "fill-current text-primary" : ""}`} />
                {pinnedOffsets.has(headerMenuColumn.key) ? t.unpinColumn : t.pinColumn}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div
          ref={scrollRef}
          className="flex-1 overflow-auto modelsheet-scroll pb-16"
          onScroll={handleScroll}
          onWheel={handleWheel}
          style={{ scrollbarGutter: 'stable both-edges' }}
        >
          <table
            className="w-full caption-bottom text-sm border-collapse"
            style={{ minWidth: `${tableMinWidth}px` }}
          >
            <thead className="sticky top-0 z-20 bg-card border-b shadow-[0_1px_0_0_var(--border)]">
              <tr>
                {onModelSelect && (
                  <th
                    className="h-10 px-3 text-left align-middle font-medium text-muted-foreground sticky left-0 z-30 bg-card w-12"
                    style={{ minWidth: `${SELECT_COLUMN_WIDTH}px`, width: `${SELECT_COLUMN_WIDTH}px`, maxWidth: `${SELECT_COLUMN_WIDTH}px` }}
                  >
                    <span className="sr-only">选择</span>
                  </th>
                )}
                {visibleColumns.map((column) => {
                  const isPinned = pinnedOffsets.has(column.key)
                  return (
                    <th
                      key={column.key}
                      className={`h-10 px-3 text-left align-middle font-medium text-muted-foreground whitespace-nowrap ${
                        isPinned ? `sticky z-30 bg-card` : ''
                      }`}
                      style={getColumnStyle(column)}
                      onContextMenu={(event) => openHeaderMenu(event, column)}
                      title={t.rightClickColumn}
                    >
                      <div className="flex h-full items-center gap-1">
                        {isPinned && <Pin className="h-3 w-3 shrink-0 fill-current text-primary/80" />}
                        {column.sortable ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 min-w-0 flex-1 justify-start px-0 text-xs data-[state=open]:bg-accent hover:bg-transparent"
                            onClick={() => handleSort(column)}
                          >
                            <span className="truncate">{column.label}</span>
                            {sortConfig.key === column.key ? (
                              sortConfig.direction === "asc" ? (
                                <ArrowUp className="ml-1.5 h-4 w-4 shrink-0 text-primary" />
                              ) : (
                                <ArrowDown className="ml-1.5 h-4 w-4 shrink-0 text-primary" />
                              )
                            ) : (
                              <ArrowUpDown className="ml-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                          </Button>
                        ) : (
                          <span className="min-w-0 flex-1 truncate px-0">{column.label}</span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {models.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + (onModelSelect ? 1 : 0)}
                    className="h-24 text-center p-4"
                  >
                    {t.noResults}
                  </td>
                </tr>
              ) : (
                models.map((model) => (
                  <tr
                    key={model.id}
                    className="group border-b transition-colors cursor-pointer"
                    onClick={(e) => handleRowClick(model, e)}
                  >
                    {onModelSelect && (
                      <td
                        className="px-3 py-2.5 align-middle sticky left-0 z-10 bg-card group-hover:bg-muted transition-colors"
                        style={{ minWidth: `${SELECT_COLUMN_WIDTH}px`, width: `${SELECT_COLUMN_WIDTH}px`, maxWidth: `${SELECT_COLUMN_WIDTH}px` }}
                      >
                        <Checkbox
                          checked={selectedModels.has(model.id)}
                          onCheckedChange={() => onModelSelect(model.id)}
                          aria-label={`选择 ${model.name}`}
                        />
                      </td>
                    )}
                    {visibleColumns.map((column) => {
                      const isPinned = pinnedOffsets.has(column.key)
                      return (
                        <td
                          key={column.key}
                          className={`px-3 py-2.5 align-middle bg-card group-hover:bg-muted transition-colors ${
                            isPinned ? `sticky z-10` : ''
                          } ${column.key === "name" ? 'relative overflow-hidden' : ''}`}
                          style={getColumnStyle(column)}
                        >
                          {(column.key === "inputModalities" || column.key === "outputModalities") ? (
                            <ModalityIcons modalities={model[column.key] || []} />
                          ) : (column.key === "totalParameters" || column.key === "activeParameters") ? (
                            <ParamCell value={model[column.key]} model={model} />
                          ) : column.key === "name" ? (
                            <>
                              {isNewThisWeek(model.releasedAt) && (
                                <span className="absolute top-0 left-0 w-[38px] h-[38px] overflow-hidden pointer-events-none z-10">
                                  <span className="absolute top-[9px] -left-[13px] w-[52px] text-center text-[8px] font-black leading-none text-white py-[3px] rotate-[-45deg] bg-gradient-to-r from-violet-500 to-pink-500 select-none">
                                    NEW
                                  </span>
                                </span>
                              )}
                              <Link
                                to={model.id?.includes("/") ? `/${model.id.split("/")[0]}/${model.id.split("/")[1]}` : "#"}
                                className="flex min-w-0 items-center gap-2 hover:text-primary hover:underline transition-colors"
                                onClick={(e) => {
                                  saveCurrentScrollPosition()
                                  e.stopPropagation()
                                }}
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
                              className="inline-flex max-w-full items-center gap-2 hover:text-primary hover:underline transition-colors"
                              onClick={e => {
                                saveCurrentScrollPosition()
                                e.stopPropagation()
                              }}
                            >
                              <ProviderBrandIcon provider={String(model[column.key] ?? "")} />
                              <span className="truncate">{translateProvider(String(model[column.key] ?? ""), language)}</span>
                            </Link>
                          ) : column.key === "architecture" && model.architecture ? (
                            <Link
                              to={`/arch/${encodeURIComponent(model.architecture)}`}
                              className="inline-flex max-w-full items-center rounded-md border border-transparent px-1.5 py-0.5 font-mono text-xs text-foreground/80 transition-colors hover:border-primary/25 hover:bg-primary/5 hover:text-primary"
                              onClick={e => {
                                saveCurrentScrollPosition()
                                e.stopPropagation()
                              }}
                            >
                              <span className="truncate">{model.architecture}</span>
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
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>

        </div>

        {models.length > 0 && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-2 z-30 h-14 overflow-hidden bg-gradient-to-t from-card via-card/95 to-transparent"
            aria-live="polite"
          >
            {hasMore ? (
              <div className="relative h-full">
                <div
                  className="absolute inset-x-8 bottom-0 h-10 rounded-full blur-2xl transition-opacity duration-200"
                  style={{
                    opacity: isLoadingMore ? 0.88 : 0.14 + pullProgress * 0.6,
                    background: "radial-gradient(ellipse at center, rgba(2,132,199,0.68), rgba(8,47,73,0.34) 46%, transparent 74%)",
                    transform: `translateY(${12 - pullProgress * 9}px) scaleX(${0.65 + pullProgress * 0.42})`,
                  }}
                />
              </div>
            ) : (
              <div />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
