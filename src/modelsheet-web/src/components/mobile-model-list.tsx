import { useMemo, useState, useCallback, useRef, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { providerSlug, isNewThisWeek } from "@/lib/utils"
import { ArrowUpDown, Check, ChevronDown } from "lucide-react"
import type { ModelInfo, SortConfig } from "@/lib/types"
import { translateProvider, type Language } from "@/lib/i18n"
import type { HomeScrollPosition } from "@/lib/model-data"
import { ModelBrandIcon, ProviderBrandIcon } from "@/components/brand-icon"
import { ModalityIcons } from "@/components/modality-icons"
import { formatParameters, formatContextLength } from "@/lib/formatters"

// ─── helpers ───────────────────────────────────────────────────────────────

function fmt(v: number | null | undefined): string {
  if (v == null) return "—"
  return formatParameters(v)
}
function fmtCtx(v: number | null | undefined): string {
  if (v == null) return "—"
  return formatContextLength(v)
}

// ─── sort config ───────────────────────────────────────────────────────────

type SortField = "createdAt" | "name" | "provider" | "totalParameters" | "activeParameters" | "contextLength"
type SortDir = "asc" | "desc"

const SORT_OPTIONS: { field: SortField; labelZh: string; labelEn: string; defaultDir: SortDir }[] = [
  { field: "createdAt",         labelZh: "发布时间",  labelEn: "Release",       defaultDir: "desc" },
  { field: "name",              labelZh: "模型名称",  labelEn: "Name",          defaultDir: "asc"  },
  { field: "provider",          labelZh: "提供商",    labelEn: "Provider",      defaultDir: "asc"  },
  { field: "totalParameters",   labelZh: "总参数",    labelEn: "Params",        defaultDir: "desc" },
  { field: "activeParameters",  labelZh: "激活参数",  labelEn: "Active",        defaultDir: "desc" },
  { field: "contextLength",     labelZh: "上下文",    labelEn: "Context",       defaultDir: "desc" },
]

// ─── card fields config ────────────────────────────────────────────────────

type CardField = "totalParameters" | "activeParameters" | "contextLength" | "inputModalities" | "outputModalities" | "architecture" | "numLayers" | "numExperts" | "createdAt"

interface CardFieldDef {
  key: CardField
  labelZh: string
  labelEn: string
  group: "指标" | "模态" | "属性"
}

const CARD_FIELD_DEFS: CardFieldDef[] = [
  { key: "totalParameters",  labelZh: "参数量",   labelEn: "Params",   group: "指标" },
  { key: "activeParameters", labelZh: "激活参数", labelEn: "Active",   group: "指标" },
  { key: "contextLength",    labelZh: "上下文",   labelEn: "Context",  group: "指标" },
  { key: "inputModalities",  labelZh: "输入模态", labelEn: "In Modal", group: "模态" },
  { key: "outputModalities", labelZh: "输出模态", labelEn: "Out Modal",group: "模态" },
  { key: "architecture",     labelZh: "架构",     labelEn: "Arch",     group: "属性" },
  { key: "numLayers",        labelZh: "层数",     labelEn: "Layers",   group: "属性" },
  { key: "numExperts",       labelZh: "专家数",   labelEn: "Experts",  group: "属性" },
  { key: "createdAt",        labelZh: "发布时间", labelEn: "Released", group: "属性" },
]
const CARD_FIELD_KEYS = new Set<CardField>(CARD_FIELD_DEFS.map(def => def.key))

const DEFAULT_CARD_FIELDS: CardField[] = ["totalParameters", "activeParameters", "contextLength", "inputModalities", "outputModalities"]
const PULL_LOAD_THRESHOLD = 72
const PULL_MAX = 112
const PULL_PRIME_WHEELS = 2

// ─── complexity presets (which card fields to show) ────────────────────────

const COMPLEXITY_FIELD_MAP: Record<string, CardField[]> = {
  simple:     ["totalParameters", "contextLength"],
  enthusiast: ["totalParameters", "activeParameters", "contextLength", "inputModalities", "outputModalities"],
  developer:  ["totalParameters", "activeParameters", "contextLength", "inputModalities", "outputModalities", "architecture", "numLayers", "numExperts"],
  custom:     DEFAULT_CARD_FIELDS,
}

// ─── bottom sheet ──────────────────────────────────────────────────────────

function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-background shadow-2xl"
        style={{ maxHeight: "80vh", display: "flex", flexDirection: "column" }}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="px-5 pt-2 pb-3 shrink-0">
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <div className="overflow-y-auto flex-1 px-5 pb-8">
          {children}
        </div>
      </div>
    </>
  )
}

// ─── single model card ─────────────────────────────────────────────────────

interface CardProps {
  model: ModelInfo
  language: Language
  selected: boolean
  onSelect: (id: string) => void
  onNavigate: (model: ModelInfo) => void
  onBeforeNavigate: () => void
  cardFields: CardField[]
}

function ModelCard({ model, language, selected, onSelect, onNavigate, onBeforeNavigate, cardFields }: CardProps) {
  const isZh = language === "zh"

  const metricFields = cardFields.filter(
    f => f !== "inputModalities" && f !== "outputModalities"
  ) as Exclude<CardField, "inputModalities" | "outputModalities">[]

  const showInputModal  = cardFields.includes("inputModalities")
  const showOutputModal = cardFields.includes("outputModalities")
  const showModalities  = showInputModal || showOutputModal

  function renderMetricValue(field: CardField): string {
    switch (field) {
      case "totalParameters":  return fmt(model.totalParameters)
      case "activeParameters": return fmt(model.activeParameters)
      case "contextLength":    return fmtCtx(model.contextLength)
      case "architecture":     return model.architecture ?? "—"
      case "numLayers":        return model.numLayers != null ? String(model.numLayers) : "—"
      case "numExperts":       return model.numExperts != null ? String(model.numExperts) : "—"
      case "createdAt":        return model.createdAt ? new Date(model.createdAt).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit" }) : "—"
      default: return "—"
    }
  }

  function getMetricLabel(field: CardField): string {
    const def = CARD_FIELD_DEFS.find(d => d.key === field)
    return def ? (isZh ? def.labelZh : def.labelEn) : field
  }

  return (
    <div className={`flex gap-3 items-start py-3 ${selected ? "opacity-100" : ""}`}>
      {/* Icon */}
      <div className="relative shrink-0 cursor-pointer mt-0.5" onClick={() => onNavigate(model)}>
        <ModelBrandIcon model={model.id} provider={model.provider} size={40} />
        {isNewThisWeek(model.createdAt) && (
          <span className="absolute -top-1 -left-1 w-9 h-9 overflow-hidden pointer-events-none">
            <span className="absolute top-[11px] -left-[10px] w-[52px] text-center text-[7px] font-black leading-none text-white py-[2.5px] rotate-[-45deg] origin-center bg-gradient-to-r from-violet-500 to-pink-500 select-none">
              NEW
            </span>
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onNavigate(model)}>
        {/* Name + MoE badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[15px] font-bold leading-tight">{model.name}</span>
          {model.isMoe && (
            <span
              className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-none"
              style={{ background: "rgba(99,102,241,0.18)", color: "#818cf8" }}
            >
              MoE
            </span>
          )}
        </div>

        {/* Provider */}
        <Link
          to={`/${providerSlug(model.provider ?? "")}`}
          className="flex items-center gap-1.5 mt-0.5 w-fit"
          onClick={e => {
            onBeforeNavigate()
            e.stopPropagation()
          }}
        >
          <ProviderBrandIcon provider={model.provider} size={13} />
          <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {translateProvider(model.provider, language)}
          </span>
        </Link>

        {/* Metrics row */}
        {metricFields.length > 0 && (
          <div className="flex gap-4 mt-2 flex-wrap">
            {metricFields.map(field => (
              <div key={field}>
                <p className="text-[11px] text-muted-foreground">{getMetricLabel(field)}</p>
                {field === "architecture" && model.architecture ? (
                  <Link
                    to={`/arch/${encodeURIComponent(model.architecture)}`}
                    className="inline-flex max-w-[8rem] rounded-md border border-transparent px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground/80 transition-colors hover:border-primary/25 hover:bg-primary/5 hover:text-primary"
                    onClick={e => {
                      onBeforeNavigate()
                      e.stopPropagation()
                    }}
                  >
                    <span className="truncate">{model.architecture}</span>
                  </Link>
                ) : (
                  <p className="text-sm font-semibold tabular-nums">{renderMetricValue(field)}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modalities */}
        {showModalities && (
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {showInputModal && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">{isZh ? "输入模态" : "In"}</span>
                <ModalityIcons modalities={model.inputModalities ?? []} />
              </div>
            )}
            {showOutputModal && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">{isZh ? "输出模态" : "Out"}</span>
                <ModalityIcons modalities={model.outputModalities ?? []} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Checkbox */}
      <button
        onClick={() => onSelect(model.id)}
        className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors mt-1 ${
          selected
            ? "bg-primary text-primary-foreground"
            : "border-2 border-border bg-transparent"
        }`}
        aria-label={selected ? "Deselect" : "Select"}
      >
        {selected && <Check className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

// ─── main component ────────────────────────────────────────────────────────

interface MobileModelListProps {
  models: ModelInfo[]
  totalCount: number
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  searchTerm?: string
  language: Language
  complexityLevel?: string
  onComplexityChange?: (level: string) => void
  customFields?: string[]
  sortConfig: SortConfig
  onSortChange: (sortConfig: SortConfig) => void
  onCompare?: (ids: string[]) => void
  onModelClick?: (model: ModelInfo) => void
  scrollRestorePosition?: HomeScrollPosition | null
  scrollRestoreKey?: number
  onScrollPositionChange?: (position: HomeScrollPosition) => void
}

export function MobileModelList({
  models,
  totalCount,
  hasMore,
  isLoadingMore,
  onLoadMore,
  language,
  complexityLevel = "enthusiast",
  customFields,
  sortConfig,
  onSortChange,
  onCompare,
  onModelClick,
  scrollRestorePosition,
  scrollRestoreKey = 0,
  onScrollPositionChange,
}: MobileModelListProps) {
  const navigate = useNavigate()
  const isZh = language === "zh"

  // Selection state (for compare)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Sheet open state
  const [sortSheetOpen, setSortSheetOpen] = useState(false)

  // Bottom pull loading
  const scrollRef = useRef<HTMLDivElement>(null)
  const latestScrollPositionRef = useRef<HomeScrollPosition | null>(null)
  const scrollSaveRafRef = useRef<number | null>(null)
  const restoredScrollKeyRef = useRef<number | null>(null)
  const autoLoadLockRef = useRef(false)
  const bottomPullEventsRef = useRef(0)
  const pullDistanceRef = useRef(0)
  const pullStartYRef = useRef<number | null>(null)
  const touchPullActiveRef = useRef(false)
  const pullResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pullDistance, setPullDistanceState] = useState(0)

  const customCardFields = useMemo(() => {
    const selected = customFields?.filter((key): key is CardField => CARD_FIELD_KEYS.has(key as CardField)) ?? []
    return selected.length > 0 ? selected : DEFAULT_CARD_FIELDS
  }, [customFields])

  // Active card fields
  const cardFields: CardField[] = complexityLevel === "custom"
    ? customCardFields
    : (COMPLEXITY_FIELD_MAP[complexityLevel] ?? COMPLEXITY_FIELD_MAP.enthusiast)

  const setPullDistance = useCallback((value: number) => {
    const next = Math.max(0, Math.min(PULL_MAX, value))
    pullDistanceRef.current = next
    setPullDistanceState(next)
  }, [])

  useEffect(() => {
    if (!isLoadingMore) {
      autoLoadLockRef.current = false
      setPullDistance(0)
    }
  }, [isLoadingMore, models.length, setPullDistance])

  useEffect(() => {
    return () => {
      if (pullResetTimerRef.current) clearTimeout(pullResetTimerRef.current)
    }
  }, [])

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

  const handleListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    queueScrollPositionSave(container)
    const remaining = container.scrollHeight - container.scrollTop - container.clientHeight
    if (remaining > 24 && pullDistanceRef.current > 0 && !isLoadingMore) {
      bottomPullEventsRef.current = 0
      touchPullActiveRef.current = false
      setPullDistance(0)
    } else if (remaining > 24) {
      bottomPullEventsRef.current = 0
      touchPullActiveRef.current = false
    }
  }, [isLoadingMore, queueScrollPositionSave, setPullDistance])

  const handleListWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
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

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    const remaining = container.scrollHeight - container.scrollTop - container.clientHeight
    touchPullActiveRef.current = remaining <= 4 && hasMore && !isLoadingMore
    pullStartYRef.current = e.touches[0]?.clientY ?? null
  }, [hasMore, isLoadingMore])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchPullActiveRef.current || pullStartYRef.current == null || isLoadingMore) return
    const currentY = e.touches[0]?.clientY
    if (currentY == null) return

    const distance = pullStartYRef.current - currentY
    if (distance <= 0) {
      setPullDistance(0)
      return
    }

    e.preventDefault()
    if (pullResetTimerRef.current) clearTimeout(pullResetTimerRef.current)
    const next = Math.min(PULL_MAX, distance * 0.86)
    setPullDistance(next)

    if (next >= PULL_LOAD_THRESHOLD) {
      touchPullActiveRef.current = false
      triggerPullLoad()
    }
  }, [isLoadingMore, setPullDistance, triggerPullLoad])

  const handleTouchEnd = useCallback(() => {
    touchPullActiveRef.current = false
    pullStartYRef.current = null
    if (!isLoadingMore) schedulePullReset()
  }, [isLoadingMore, schedulePullReset])

  const handleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const handleNavigate = useCallback((model: ModelInfo) => {
    saveCurrentScrollPosition()
    if (onModelClick) {
      onModelClick(model)
    } else if (model.id?.includes("/")) {
      const [org, name] = model.id.split("/")
      navigate(`/${org}/${name}`)
    }
  }, [navigate, onModelClick, saveCurrentScrollPosition])

  useEffect(() => {
    return () => {
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
  ])

  const handleCompare = () => {
    if (selectedIds.size >= 2 && onCompare) {
      onCompare(Array.from(selectedIds))
    } else if (selectedIds.size >= 2) {
      sessionStorage.setItem("selectedModelIds", JSON.stringify(Array.from(selectedIds)))
      navigate("/compare")
    }
  }

  // current sort label
  const currentSortDef = SORT_OPTIONS.find(o => o.field === sortConfig.key)
  const sortLabel = currentSortDef ? (isZh ? currentSortDef.labelZh : currentSortDef.labelEn) : ""

  const pullProgress = Math.min(1, pullDistance / PULL_LOAD_THRESHOLD)

  return (
    <div className="flex flex-col h-full w-full min-w-0 overflow-x-hidden">
      {/* ── Controls bar ── */}
      <div className="shrink-0 flex items-center justify-between gap-2 pb-2">
        {/* Sort button */}
        <button
          onClick={() => setSortSheetOpen(true)}
          className="flex items-center gap-1.5 shrink-0 rounded-full border border-border bg-card px-3 h-9 text-sm font-medium"
        >
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{sortLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <span className="shrink-0 rounded-full bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
          {models.length}/{totalCount}
        </span>
      </div>

      {/* ── List ── */}
      <div className="relative flex-1 min-h-0 -mx-4 overflow-hidden">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto overscroll-contain pb-28 px-4 overflow-x-hidden"
          onScroll={handleListScroll}
          onWheel={handleListWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {models.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              {isZh ? "没有找到匹配的模型" : "No matching models found"}
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {models.map(model => (
                <ModelCard
                  key={model.id}
                  model={model}
                  language={language}
                  selected={selectedIds.has(model.id)}
                  onSelect={handleSelect}
                  onNavigate={handleNavigate}
                  onBeforeNavigate={saveCurrentScrollPosition}
                  cardFields={cardFields}
                />
              ))}
            </div>
          )}
        </div>

        {models.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 overflow-hidden bg-gradient-to-t from-background via-background/95 to-transparent">
            {hasMore && (
              <div
                className="absolute inset-x-8 bottom-0 h-11 rounded-full blur-2xl transition-opacity duration-200"
                style={{
                  opacity: isLoadingMore ? 0.88 : 0.14 + pullProgress * 0.6,
                  background: "radial-gradient(ellipse at center, rgba(2,132,199,0.68), rgba(8,47,73,0.34) 46%, transparent 74%)",
                  transform: `translateY(${12 - pullProgress * 9}px) scaleX(${0.62 + pullProgress * 0.48})`,
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Compare floating bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-6 pt-3 bg-gradient-to-t from-background via-background/95 to-transparent">
          <div className="flex items-center gap-3 rounded-2xl bg-foreground px-4 py-3 shadow-xl">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-background text-foreground text-sm font-bold shrink-0">
              {selectedIds.size}
            </span>
            <span className="flex-1 text-background text-sm">
              {isZh
                ? selectedIds.size < 2 ? "至少选择 2 个模型" : `已选 ${selectedIds.size} 个`
                : selectedIds.size < 2 ? "Select at least 2" : `${selectedIds.size} selected`
              }
            </span>
            <button
              className="text-background/70 text-sm px-2"
              onClick={() => setSelectedIds(new Set())}
            >
              {isZh ? "清除" : "Clear"}
            </button>
            <button
              disabled={selectedIds.size < 2}
              onClick={handleCompare}
              className="rounded-xl bg-background text-foreground text-sm font-semibold px-4 py-1.5 disabled:opacity-40"
            >
              {isZh ? "对比 →" : "Compare →"}
            </button>
          </div>
        </div>
      )}

      {/* ── Sort Sheet ── */}
      <BottomSheet
        open={sortSheetOpen}
        onClose={() => setSortSheetOpen(false)}
        title={isZh ? "排序方式" : "Sort by"}
      >
        <div className="flex flex-col divide-y divide-border">
          {SORT_OPTIONS.map(opt => {
            const isActive = opt.field === sortConfig.key
            const isText = opt.field === "name" || opt.field === "provider"
            const isDate = opt.field === "createdAt"
            const ascLabel  = isText ? "A→Z"  : isDate ? (isZh ? "旧→新" : "Old→New") : (isZh ? "小→大" : "Low→High")
            const descLabel = isText ? "Z→A"  : isDate ? (isZh ? "新→旧" : "New→Old") : (isZh ? "大→小" : "High→Low")

            return (
              <button
                key={opt.field}
                className="flex items-center justify-between py-4 w-full text-left"
                onClick={() => {
                  onSortChange({
                    key: opt.field,
                    direction: isActive
                      ? (sortConfig.direction === "asc" ? "desc" : "asc")
                      : opt.defaultDir,
                  })
                }}
              >
                <span className={`text-base ${isActive ? "font-semibold" : ""}`}>
                  {isZh ? opt.labelZh : opt.labelEn}
                </span>
                {isActive ? (
                  <span className="rounded-full bg-foreground text-background px-2.5 py-0.5 text-sm font-semibold">
                    {sortConfig.direction === "asc" ? ascLabel : descLabel}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {opt.defaultDir === "desc" ? descLabel : ascLabel}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </BottomSheet>

    </div>
  )
}
