import { useEffect, useMemo, useState } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import { ArchitectureDiagramRenderer } from "@/components/architecture-diagram-renderer"
import { ArrowLeft, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import { TYPE_COLORS } from "@/pages/ArchPage"
import type { ArchitectureSpec, ModelInfo } from "@/lib/types"
import { loadArchitecture, loadArchitectures, modelDiagramParams } from "@/lib/architecture-data"
import { loadModelsFromFile } from "@/lib/model-data"
import { formatContextLength, formatNumber, formatParameters } from "@/lib/formatters"
import { getTranslations, type Language } from "@/lib/i18n"
import HuggingFaceIcon from "@lobehub/icons/es/HuggingFace"

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "boolean") return value ? "yes" : "no"
  if (Array.isArray(value)) return value.map(displayValue).filter(Boolean).join(", ")
  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    const label = record.label ?? record.name ?? record.kind ?? record.type
    return typeof label === "string" ? label : JSON.stringify(value)
  }
  return String(value)
}

function hasValue(value: unknown): value is string | number | boolean {
  return value !== null && value !== undefined && value !== ""
}

function modelMatchesArchitecture(arch: ArchitectureSpec, model: ModelInfo): boolean {
  const aliases = new Set([arch.id, ...(arch.modelTypeAliases ?? [])].map(alias => alias.toLowerCase()))
  const architecture = model.architecture?.toLowerCase()
  return !!architecture && aliases.has(architecture)
}

function architectureFamilyToken(arch: ArchitectureSpec): string {
  return arch.family.split(/[\s/]+/)[0]?.toLowerCase() || arch.id.toLowerCase()
}

function preferredArchitectureModels(arch: ArchitectureSpec, models: ModelInfo[]): ModelInfo[] {
  const preferredOrg = arch.hfOrg?.split("/")[0]?.toLowerCase()
  if (!preferredOrg) return models

  const orgModels = models.filter(model => model.id.split("/")[0]?.toLowerCase() === preferredOrg)
  if (!orgModels.length) return models

  const familyToken = architectureFamilyToken(arch)
  const familyModels = orgModels.filter(model => model.name.toLowerCase().startsWith(familyToken))
  return familyModels.length ? familyModels : orgModels
}

function sortArchitectureModels(arch: ArchitectureSpec, models: ModelInfo[]): ModelInfo[] {
  const preferredOrg = arch.hfOrg?.split("/")[0]?.toLowerCase()
  const familyToken = architectureFamilyToken(arch)
  return [...models].sort((a, b) => {
    const aOrg = a.id.split("/")[0]?.toLowerCase()
    const bOrg = b.id.split("/")[0]?.toLowerCase()
    const aOfficial = preferredOrg && aOrg === preferredOrg ? 0 : 1
    const bOfficial = preferredOrg && bOrg === preferredOrg ? 0 : 1
    if (aOfficial !== bOfficial) return aOfficial - bOfficial

    const aFamily = a.name.toLowerCase().startsWith(familyToken) ? 0 : 1
    const bFamily = b.name.toLowerCase().startsWith(familyToken) ? 0 : 1
    if (aFamily !== bFamily) return aFamily - bFamily

    const aParams = a.totalParameters ?? Number.MAX_SAFE_INTEGER
    const bParams = b.totalParameters ?? Number.MAX_SAFE_INTEGER
    if (aParams !== bParams) return aParams - bParams

    return a.name.localeCompare(b.name)
  })
}

function pickDefaultModel(arch: ArchitectureSpec, models: ModelInfo[]): ModelInfo | null {
  return models.find(model => model.id === arch.hfOrg) ?? models[0] ?? null
}

function modelConfigEntries(model: ModelInfo | null): Array<[string, string]> {
  if (!model) return []
  const entries: Array<[string, string | number | undefined]> = [
    ["model", model.name],
    ["num_hidden_layers", model.numLayers],
    ["hidden_size", model.hiddenSize],
    ["intermediate_size", model.intermediateSize],
    ["num_attention_heads", model.numHeads],
    ["num_key_value_heads", model.numKvHeads],
    ["vocab_size", model.vocabSize],
    ["context_length", model.contextLength],
    ["num_experts", model.numExperts],
    ["num_experts_per_tok", model.numExpertsPerToken],
    ["num_activated_experts", model.numActivatedExperts],
    ["moe_intermediate_size", model.moeIntermediateSize],
  ]
  return entries
    .filter((entry): entry is [string, string | number] => hasValue(entry[1]))
    .map(([key, value]) => [key, String(value)])
}

function ModelStat({
  label,
  value,
}: {
  label: string
  value: string | number | null | undefined
}) {
  if (!hasValue(value)) return null
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-semibold leading-snug">{value}</dd>
    </div>
  )
}

function ModelConfigPanel({
  entries,
  isZh,
}: {
  entries: Array<[string, string]>
  isZh: boolean
}) {
  const visibleEntries = entries.filter(([key]) => key !== "model")
  if (!visibleEntries.length) return null

  return (
    <div className="mt-4 border-t pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">config.json</p>
        <span className="rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
          {isZh ? "当前模型" : "selected"}
        </span>
      </div>
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {visibleEntries.map(([key, value]) => (
          <div key={key} className="min-w-0 rounded-md border bg-background px-2.5 py-2">
            <dt className="truncate font-mono text-[11px] text-muted-foreground">{key}</dt>
            <dd className="mt-0.5 truncate font-mono text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function ModelSizeSection({
  arch,
  models,
  selectedModel,
  selectedModelId,
  configEntries,
  onSelectModel,
  isZh,
}: {
  arch: ArchitectureSpec
  models: ModelInfo[]
  selectedModel: ModelInfo | null
  selectedModelId: string
  configEntries: Array<[string, string]>
  onSelectModel: (modelId: string) => void
  isZh: boolean
}) {
  if (!models.length) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {isZh ? "模型尺寸" : "Model size"}
        </p>
        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          {models.length}
        </span>
      </div>

      <select
        value={selectedModelId}
        onChange={event => onSelectModel(event.target.value)}
        className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
        aria-label={isZh ? "选择模型尺寸" : "Select model size"}
      >
        {models.map(model => (
          <option key={model.id} value={model.id}>
            {model.name} · {model.totalParameters ? formatParameters(model.totalParameters) : model.id}
          </option>
        ))}
      </select>

      {selectedModel && (
        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{selectedModel.name}</p>
              <p className="truncate text-xs text-muted-foreground">{selectedModel.id}</p>
            </div>
            <Link
              to={`/${selectedModel.id}`}
              className="shrink-0 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {isZh ? "详情" : "Details"}
            </Link>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <ModelStat label={isZh ? "总参数" : "Total"} value={formatParameters(selectedModel.totalParameters)} />
            {selectedModel.isMoe && (
              <ModelStat label={isZh ? "激活参数" : "Active"} value={formatParameters(selectedModel.activeParameters)} />
            )}
            <ModelStat label={isZh ? "上下文" : "Context"} value={formatContextLength(selectedModel.contextLength)} />
            <ModelStat label={isZh ? "词表" : "Vocab"} value={formatNumber(selectedModel.vocabSize)} />
            <ModelStat label={isZh ? "层数" : "Layers"} value={selectedModel.numLayers} />
            <ModelStat label={isZh ? "隐藏维度" : "Hidden"} value={formatNumber(selectedModel.hiddenSize)} />
            <ModelStat label={isZh ? "FFN 维度" : "FFN"} value={formatNumber(selectedModel.intermediateSize)} />
            <ModelStat label={isZh ? "注意力头" : "Heads"} value={selectedModel.numHeads} />
            <ModelStat label={isZh ? "KV 头" : "KV heads"} value={selectedModel.numKvHeads} />
            {selectedModel.isMoe && (
              <>
                <ModelStat label={isZh ? "专家数" : "Experts"} value={selectedModel.numExperts} />
                <ModelStat label={isZh ? "每 token 专家" : "Top-k"} value={selectedModel.numExpertsPerToken} />
                <ModelStat label={isZh ? "专家 FFN" : "Expert FFN"} value={formatNumber(selectedModel.moeIntermediateSize)} />
              </>
            )}
          </dl>

          {selectedModel.architecture !== arch.id && (
            <p className="mt-3 text-xs text-muted-foreground">
              model_type: <span className="font-mono">{selectedModel.architecture}</span>
            </p>
          )}

          <ModelConfigPanel entries={configEntries} isZh={isZh} />
        </div>
      )}
    </div>
  )
}

function MetadataSection({
  arch,
  isZh,
}: {
  arch: ArchitectureSpec
  isZh: boolean
}) {
  const featureEntries = Object.entries(arch.features ?? {})
    .map(([key, value]) => [key, displayValue(value)] as const)
    .filter(([, value]) => value)
  const variants = arch.variants ?? []
  const sourceLinks = arch.sourceLinks ?? []
  const evidence = arch.evidence ?? []

  if (!featureEntries.length && !variants.length && !sourceLinks.length && !evidence.length) {
    return null
  }

  return (
    <>
      {featureEntries.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
            {isZh ? "结构特征" : "Features"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {featureEntries.map(([key, value]) => (
              <span key={key} className="rounded-md border bg-muted/40 px-2 py-1 text-xs">
                <span className="font-mono text-muted-foreground">{key}: </span>
                {value}
              </span>
            ))}
          </div>
        </div>
      )}

      {variants.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
            {isZh ? "变体" : "Variants"}
          </p>
          <div className="space-y-2">
            {variants.map((variant, index) => {
              const desc = isZh ? variant.descriptionZh : variant.descriptionEn
              return (
                <div key={variant.id ?? variant.name ?? index} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{variant.name ?? variant.id}</p>
                  {desc && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>}
                  {variant.aliases?.length ? (
                    <p className="mt-2 text-xs font-mono text-muted-foreground">
                      {variant.aliases.join(", ")}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {sourceLinks.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
            {isZh ? "来源" : "Sources"}
          </p>
          <div className="flex flex-wrap gap-2">
            {sourceLinks.map((link, index) => (
              <a
                key={`${link.url}-${index}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors hover:bg-muted"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                {link.label ?? link.type ?? link.url}
              </a>
            ))}
          </div>
        </div>
      )}

      {evidence.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
            {isZh ? "证据" : "Evidence"}
          </p>
          <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
            {evidence.map((item, index) => {
              const note = isZh ? item.noteZh : item.noteEn
              return (
                <p key={`${item.url ?? item.source ?? index}`}>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                      {item.source ?? item.url}
                    </a>
                  ) : (
                    item.source
                  )}
                  {note ? ` - ${note}` : ""}
                </p>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}

export function ArchDetailPage() {
  const { archId } = useParams<{ archId: string }>()
  const navigate = useNavigate()
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [language, setLanguage] = useState<Language>("zh")
  const [arch, setArch] = useState<ArchitectureSpec | null>(null)
  const [architectures, setArchitectures] = useState<ArchitectureSpec[]>([])
  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedModelId, setSelectedModelId] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") as "light" | "dark") || "light"
    setTheme(savedTheme)
    document.documentElement.classList.toggle("dark", savedTheme === "dark")
    const savedLang = (localStorage.getItem("language") || "zh") as Language
    setLanguage(savedLang)

    if (!archId) {
      setIsLoading(false)
      return
    }

    Promise.all([loadArchitecture(archId), loadArchitectures(), loadModelsFromFile()])
      .then(([item, items, loadedModels]) => {
        setArch(item)
        setArchitectures(items)
        setModels(loadedModels)
      })
      .finally(() => setIsLoading(false))
  }, [archId])

  const handleThemeToggle = () => {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    document.documentElement.classList.toggle("dark", next === "dark")
    localStorage.setItem("theme", next)
  }
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem("language", lang)
  }

  const t = getTranslations(language).arch
  const isZh = language === "zh"

  const currentIdx = arch ? architectures.findIndex(a => a.id === arch.id) : -1
  const prevArch = currentIdx > 0 ? architectures[currentIdx - 1] : null
  const nextArch = currentIdx >= 0 && currentIdx < architectures.length - 1 ? architectures[currentIdx + 1] : null

  const architectureModels = useMemo(() => {
    if (!arch) return []
    const matches = models.filter(model => modelMatchesArchitecture(arch, model))
    return sortArchitectureModels(
      arch,
      preferredArchitectureModels(arch, matches),
    )
  }, [arch, models])

  useEffect(() => {
    if (!arch || !architectureModels.length) {
      setSelectedModelId("")
      return
    }
    setSelectedModelId(current => {
      if (architectureModels.some(model => model.id === current)) return current
      return pickDefaultModel(arch, architectureModels)?.id ?? ""
    })
  }, [arch, architectureModels])

  const selectedModel = useMemo(
    () => architectureModels.find(model => model.id === selectedModelId) ?? null,
    [architectureModels, selectedModelId],
  )
  const diagramParams = useMemo(() => modelDiagramParams(selectedModel), [selectedModel])
  const configEntries = useMemo(() => modelConfigEntries(selectedModel), [selectedModel])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-muted-foreground">
        {getTranslations(language).common.loading}
      </div>
    )
  }

  if (!arch) {
    const displayId = archId ? decodeURIComponent(archId) : "unknown"
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
        <header className="shrink-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="px-4 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => navigate("/arch")}
                className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0 hidden sm:inline">
                ModelSheet
              </Link>
              <span className="text-muted-foreground shrink-0 hidden sm:inline">/</span>
              <Link to="/arch" className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
                {t.title}
              </Link>
              <span className="text-muted-foreground shrink-0">/</span>
              <span className="text-sm font-mono font-semibold truncate">{displayId}</span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <ThemeToggle theme={theme} onToggle={handleThemeToggle} />
              <LanguageToggle currentLanguage={language} onLanguageChange={handleLanguageChange} />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center px-6 py-12">
            <div className="space-y-6">
              <div className="space-y-3">
                <span className="inline-flex w-fit rounded-full border bg-muted/50 px-2.5 py-1 text-xs font-mono text-muted-foreground">
                  model_type
                </span>
                <h1 className="break-all font-mono text-4xl font-bold tracking-tight sm:text-5xl">
                  {displayId}
                </h1>
              </div>

              <div className="max-w-2xl space-y-2 text-sm leading-relaxed text-muted-foreground">
                <p>
                  {isZh
                    ? "这个架构页暂时还没做。"
                    : "This architecture page has not been built yet."}
                </p>
                <p>
                  {isZh
                    ? "模型里的架构类型已经可以跳到这里；等 DSL 图和说明补上后，这个地址会直接变成对应的架构详情页。"
                    : "Model architecture labels can already link here; once the DSL diagram and notes are added, this URL will become the architecture detail page."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="default" onClick={() => navigate("/arch")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t.title}
                </Button>
                <Link to="/">
                  <Button variant="outline">
                    ModelSheet
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const desc = isZh ? arch.descriptionZh : arch.descriptionEn

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <header className="shrink-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate("/arch")}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0 hidden sm:inline">
              ModelSheet
            </Link>
            <span className="text-muted-foreground shrink-0 hidden sm:inline">/</span>
            <Link to="/arch" className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
              {t.title}
            </Link>
            <span className="text-muted-foreground shrink-0">/</span>
            <span className="text-sm font-semibold truncate">{arch.family}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => prevArch && navigate(`/arch/${prevArch.id}`)}
              disabled={!prevArch}
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={prevArch?.family}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => nextArch && navigate(`/arch/${nextArch.id}`)}
              disabled={!nextArch}
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={nextArch?.family}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="w-px h-5 bg-border mx-1" />
            <ThemeToggle theme={theme} onToggle={handleThemeToggle} />
            <LanguageToggle currentLanguage={language} onLanguageChange={handleLanguageChange} />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-auto lg:flex-row lg:overflow-hidden">
        <div className="shrink-0 overflow-visible border-b bg-muted/10 lg:flex-[3] lg:overflow-auto lg:border-b-0 lg:border-r">
          <div className="flex min-h-[560px] items-center justify-center p-4 sm:p-6 lg:min-h-full lg:p-8">
            <div className="w-full max-w-xl">
              <ArchitectureDiagramRenderer
                architecture={arch}
                params={diagramParams}
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 overflow-visible lg:flex-[2] lg:overflow-y-auto">
          <div className="p-5 space-y-6 sm:p-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{arch.family}</h1>
              <p className="text-sm text-muted-foreground font-mono mt-1">{arch.era}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${TYPE_COLORS[arch.type]}`}>
                {arch.type}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                {arch.normPlacement === "pre" ? t.normPre : t.normPost}
              </span>
            </div>

            <div className="h-px bg-border" />
            <p className="text-sm text-foreground/80 leading-relaxed">{desc}</p>

            <ModelSizeSection
              arch={arch}
              models={architectureModels}
              selectedModel={selectedModel}
              selectedModelId={selectedModelId}
              configEntries={configEntries}
              onSelectModel={setSelectedModelId}
              isZh={isZh}
            />

            <MetadataSection arch={arch} isZh={isZh} />

            {arch.modelTypeAliases && arch.modelTypeAliases.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">
                  {isZh ? "模型类型标识" : "model_type"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {arch.modelTypeAliases.map(alias => (
                    <span key={alias} className="text-xs font-mono px-2 py-1 rounded-md bg-muted text-muted-foreground border">
                      {alias}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(arch.paperUrl || arch.hfOrg) && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {isZh ? "相关链接" : "Links"}
                </p>
                {arch.paperUrl && (
                  <a
                    href={arch.paperUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg border hover:bg-muted transition-colors w-fit"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    {t.paper}
                  </a>
                )}
                {arch.hfOrg && (
                  <a
                    href={`https://huggingface.co/${arch.hfOrg}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg border hover:bg-muted transition-colors w-fit"
                  >
                    <HuggingFaceIcon.Color size={14} />
                    HuggingFace
                  </a>
                )}
              </div>
            )}

            {(prevArch || nextArch) && (
              <>
                <div className="h-px bg-border" />
                <div className="flex gap-3">
                  {prevArch && (
                    <button
                      onClick={() => navigate(`/arch/${prevArch.id}`)}
                      className="flex-1 text-left p-3 rounded-lg border hover:bg-muted transition-colors"
                    >
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                        {isZh ? "上一个" : "Previous"}
                      </p>
                      <p className="text-sm font-medium">{prevArch.family}</p>
                      <p className="text-xs text-muted-foreground font-mono">{prevArch.era}</p>
                    </button>
                  )}
                  {nextArch && (
                    <button
                      onClick={() => navigate(`/arch/${nextArch.id}`)}
                      className="flex-1 text-right p-3 rounded-lg border hover:bg-muted transition-colors"
                    >
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                        {isZh ? "下一个" : "Next"}
                      </p>
                      <p className="text-sm font-medium">{nextArch.family}</p>
                      <p className="text-xs text-muted-foreground font-mono">{nextArch.era}</p>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
