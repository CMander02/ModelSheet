import { useMemo, useState, useCallback } from "react"
import { useNavigate, Link } from "react-router-dom"
import { providerSlug, isNewThisWeek } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, Check, ChevronDown } from "lucide-react"
import type { ModelInfo } from "@/lib/types"
import type { Language } from "@/lib/i18n"
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

const DEFAULT_CARD_FIELDS: CardField[] = ["totalParameters", "activeParameters", "contextLength", "inputModalities", "outputModalities"]

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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-background shadow-2xl"
        style={{ maxHeight: "80vh", display: "flex", flexDirection: "column" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        {/* Title */}
        <div className="px-5 pt-2 pb-3 shrink-0">
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        {/* Content */}
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
  cardFields: CardField[]
}

function ModelCard({ model, language, selected, onSelect, onNavigate, cardFields }: CardProps) {
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
      <div className="shrink-0 cursor-pointer mt-0.5" onClick={() => onNavigate(model)}>
        <ModelBrandIcon model={model.id} provider={model.provider} size={40} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onNavigate(model)}>
        {/* Name + MoE badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[15px] font-bold leading-tight">{model.name}</span>
          {isNewThisWeek(model.createdAt) && (
            <Badge className="shrink-0 rounded-sm border-transparent bg-gradient-to-r from-violet-500 to-pink-500 [background-size:105%] bg-center text-white text-[10px] px-1.5 py-0 leading-4 font-bold">
              NEW
            </Badge>
          )}
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
          onClick={e => e.stopPropagation()}
        >
          <ProviderBrandIcon provider={model.provider} size={13} />
          <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">{model.provider}</span>
        </Link>

        {/* Metrics row */}
        {metricFields.length > 0 && (
          <div className="flex gap-4 mt-2 flex-wrap">
            {metricFields.map(field => (
              <div key={field}>
                <p className="text-[11px] text-muted-foreground">{getMetricLabel(field)}</p>
                <p className="text-sm font-semibold tabular-nums">{renderMetricValue(field)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Modalities — single row */}
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
  searchTerm?: string
  language: Language
  /** complexity preset from parent */
  complexityLevel?: string
  onComplexityChange?: (level: string) => void
  onCompare?: (ids: string[]) => void
}

export function MobileModelList({
  models,
  searchTerm = "",
  language,
  complexityLevel = "enthusiast",
  onComplexityChange,
  onCompare,
}: MobileModelListProps) {
  const navigate = useNavigate()
  const isZh = language === "zh"

  // Sort state
  const [sortField, setSortField] = useState<SortField>("createdAt")
  const [sortDir, setSortDir]     = useState<SortDir>("desc")

  // Selection state (for compare)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Card field customisation (custom complexity)
  const [customCardFields, setCustomCardFields] = useState<CardField[]>(DEFAULT_CARD_FIELDS)

  // Sheet open state
  const [sortSheetOpen, setSortSheetOpen]         = useState(false)
  const [fieldSheetOpen, setFieldSheetOpen]       = useState(false)

  // Active card fields
  const cardFields: CardField[] = complexityLevel === "custom"
    ? customCardFields
    : (COMPLEXITY_FIELD_MAP[complexityLevel] ?? COMPLEXITY_FIELD_MAP.enthusiast)

  // Filter
  const filteredModels = useMemo(() => {
    if (!searchTerm.trim()) return models
    const q = searchTerm.toLowerCase()
    return models.filter(m => {
      const parts = m.id?.toLowerCase().split("/") ?? []
      return [m.name?.toLowerCase(), m.provider?.toLowerCase(), ...parts]
        .filter(Boolean).some(s => s!.includes(q))
    })
  }, [models, searchTerm])

  // Sort
  const sortedModels = useMemo(() => {
    return [...filteredModels].sort((a, b) => {
      const av = a[sortField], bv = b[sortField]
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av
      }
      const as = String(av), bs = String(bv)
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as)
    })
  }, [filteredModels, sortField, sortDir])

  const handleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const handleNavigate = useCallback((model: ModelInfo) => {
    if (model.id?.includes("/")) {
      const [org, name] = model.id.split("/")
      navigate(`/${org}/${name}`)
    }
  }, [navigate])

  const handleCompare = () => {
    if (selectedIds.size >= 2 && onCompare) {
      onCompare(Array.from(selectedIds))
    } else if (selectedIds.size >= 2) {
      sessionStorage.setItem("selectedModelIds", JSON.stringify(Array.from(selectedIds)))
      navigate("/compare")
    }
  }

  // current sort label
  const currentSortDef = SORT_OPTIONS.find(o => o.field === sortField)
  const sortLabel = currentSortDef ? (isZh ? currentSortDef.labelZh : currentSortDef.labelEn) : ""

  const complexityOptions = [
    { value: "simple",     zh: "简单",   en: "Simple"    },
    { value: "enthusiast", zh: "爱好者", en: "Enthusiast" },
    { value: "developer",  zh: "开发者", en: "Developer"  },
    { value: "custom",     zh: "自定义", en: "Custom"    },
  ]

  return (
    <div className="flex flex-col h-full w-full min-w-0">
      {/* ── Controls bar ── */}
      <div className="shrink-0 flex items-center gap-2 pb-3 overflow-x-auto">
        {/* Sort button */}
        <button
          onClick={() => setSortSheetOpen(true)}
          className="flex items-center gap-1.5 shrink-0 rounded-full border border-border bg-card px-3 h-9 text-sm font-medium"
        >
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{sortLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        {/* Complexity chips */}
        <div className="flex gap-1.5">
          {complexityOptions.map(opt => {
            const active = complexityLevel === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => {
                  // "custom" always opens the field sheet; never propagate "custom" to parent
                  if (opt.value === "custom") {
                    setFieldSheetOpen(true)
                    // switch to custom internally without calling parent
                    onComplexityChange?.("custom")
                    return
                  }
                  onComplexityChange?.(opt.value)
                }}
                className={`shrink-0 rounded-full px-3 h-9 text-sm font-medium transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "border border-border bg-card text-foreground"
                }`}
              >
                {isZh ? opt.zh : opt.en}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Model count ── */}
      <div className="shrink-0 pb-2">
        <span className="text-xs text-muted-foreground">
          {isZh ? `共 ${filteredModels.length} 个模型` : `${filteredModels.length} models`}
        </span>
      </div>

      {/* ── List ── */}
      <div className="flex-1 overflow-y-auto pb-32 -mx-4 px-4">
        {sortedModels.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            {isZh ? "没有找到匹配的模型" : "No matching models found"}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {sortedModels.map(model => (
              <ModelCard
                key={model.id}
                model={model}
                language={language}
                selected={selectedIds.has(model.id)}
                onSelect={handleSelect}
                onNavigate={handleNavigate}
                cardFields={cardFields}
              />
            ))}
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
            const isActive = opt.field === sortField
            // Labels for asc/desc per field
            const isText = opt.field === "name" || opt.field === "provider"
            const isDate = opt.field === "createdAt"
            const ascLabel  = isText ? "A→Z"  : isDate ? (isZh ? "旧→新" : "Old→New") : (isZh ? "小→大" : "Low→High")
            const descLabel = isText ? "Z→A"  : isDate ? (isZh ? "新→旧" : "New→Old") : (isZh ? "大→小" : "High→Low")

            return (
              <button
                key={opt.field}
                className="flex items-center justify-between py-4 w-full text-left"
                onClick={() => {
                  if (isActive) {
                    setSortDir(d => d === "asc" ? "desc" : "asc")
                  } else {
                    setSortField(opt.field)
                    setSortDir(opt.defaultDir)
                  }
                  // don't close — user swipes down or taps backdrop to dismiss
                }}
              >
                <span className={`text-base ${isActive ? "font-semibold" : ""}`}>
                  {isZh ? opt.labelZh : opt.labelEn}
                </span>
                {isActive ? (
                  <span className="rounded-full bg-foreground text-background px-2.5 py-0.5 text-sm font-semibold">
                    {sortDir === "asc" ? ascLabel : descLabel}
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

      {/* ── Field Selector Sheet ── */}
      <BottomSheet
        open={fieldSheetOpen}
        onClose={() => setFieldSheetOpen(false)}
        title={isZh ? "卡片显示字段" : "Card Fields"}
      >
        <p className="text-sm text-muted-foreground mb-4">
          {isZh ? "选择要在列表卡片上显示的参数" : "Choose fields shown on cards"}
        </p>
        <div className="flex flex-col divide-y divide-border">
          {CARD_FIELD_DEFS.map(def => {
            const active = customCardFields.includes(def.key)
            return (
              <button
                key={def.key}
                onClick={() => {
                  setCustomCardFields(prev =>
                    prev.includes(def.key)
                      ? prev.filter(k => k !== def.key)
                      : [...prev, def.key]
                  )
                  onComplexityChange?.("custom")
                }}
                className="flex items-center justify-between py-3.5"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${active ? "bg-foreground" : "border-2 border-border"}`}>
                    {active && <Check className="h-4 w-4 text-background" />}
                  </div>
                  <span className="text-base">{isZh ? def.labelZh : def.labelEn}</span>
                </div>
                <span className="text-sm text-muted-foreground">{def.group}</span>
              </button>
            )
          })}
        </div>
        <button
          onClick={() => setFieldSheetOpen(false)}
          className="w-full mt-4 rounded-2xl bg-foreground text-background py-3 font-semibold text-base"
        >
          {isZh ? "完成" : "Done"}
        </button>
      </BottomSheet>
    </div>
  )
}
