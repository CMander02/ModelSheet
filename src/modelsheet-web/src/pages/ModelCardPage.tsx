import { useEffect, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import type { ModelInfo } from "@/lib/types"
import type { Language } from "@/lib/i18n"
import { loadModelById } from "@/lib/model-data"
import { loadArchitecture } from "@/lib/architecture-data"
import { providerSlug } from "@/lib/utils"
import { formatParameters, formatContextLength, formatNumber, formatDecimal, formatDate } from "@/lib/formatters"
import { ModelBrandIcon, ProviderBrandIcon } from "@/components/brand-icon"
import { ModalityIcons } from "@/components/modality-icons"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ArrowLeft, HelpCircle, Info, Lock } from "lucide-react"
import HuggingFaceIcon from "@lobehub/icons/es/HuggingFace"
import ModelScopeIcon from "@lobehub/icons/es/ModelScope"
import type { ArchitectureSpec } from "@/lib/types"

// ─── Param confidence ───────────────────────────────────────────────────────

function ParamValue({ value, model }: { value: number | null | undefined; model: ModelInfo }) {
  const confidence = model.parameterConfidence ?? "official"
  const source = model.parameterSource
  const sourceUrl = model.parameterSourceUrl

  if (value == null) {
    return <span className="text-muted-foreground font-normal" title={source ?? "Undisclosed"}>—</span>
  }
  const formatted = formatParameters(value)

  if (confidence === "rumored") {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground italic" title={source ? `Rumored — ${source}` : "Rumored"}>
        <span>~{formatted}</span>
        {sourceUrl
          ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer"><HelpCircle className="h-3.5 w-3.5" /></a>
          : <HelpCircle className="h-3.5 w-3.5" />}
      </span>
    )
  }
  if (confidence === "reported") {
    return (
      <span className="inline-flex items-center gap-1" title={source ? `Reported — ${source}` : "Reported"}>
        <span>{formatted}</span>
        {sourceUrl
          ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground"><Info className="h-3.5 w-3.5" /></a>
          : <Info className="h-3.5 w-3.5 text-muted-foreground" />}
      </span>
    )
  }
  return <span>{formatted}</span>
}

// ─── Section title (divider) ────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 border-t" />
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground mb-0.5">{label}</dt>
      <dd className="text-sm font-semibold leading-snug">
        {value ?? <span className="text-muted-foreground font-normal">—</span>}
      </dd>
    </div>
  )
}

// ─── Platform link button ────────────────────────────────────────────────────

function PlatformLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <button className="flex items-center gap-2 rounded-xl border px-3 h-9 text-sm font-medium hover:bg-muted transition-colors">
        {icon}
        {label}
      </button>
    </a>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function ModelCardPage() {
  const { org, modelName } = useParams<{ org: string; modelName: string }>()
  const navigate = useNavigate()
  const [model, setModel] = useState<ModelInfo | null>(null)
  const [archEntry, setArchEntry] = useState<ArchitectureSpec | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [language, setLanguage] = useState<Language>("zh")
  const [theme, setTheme] = useState<"light" | "dark">("light")

  const modelId = org && modelName ? `${org}/${modelName}` : null

  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") as "light" | "dark") || "light"
    setTheme(savedTheme)
    document.documentElement.classList.toggle("dark", savedTheme === "dark")
    const savedLanguage = (localStorage.getItem("language") || "zh") as Language
    setLanguage(savedLanguage)

    if (!modelId) {
      setIsLoading(false)
      return
    }

    loadModelById(modelId)
      .then(async loaded => {
        setModel(loaded)
        if (loaded?.architecture) {
          try {
            setArchEntry(await loadArchitecture(loaded.architecture))
          } catch {
            setArchEntry(null)
          }
        }
      })
      .finally(() => setIsLoading(false))
  }, [modelId])

  const handleThemeToggle = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem("language", lang)
  }

  const isZh = language === "zh"

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
          <div className="container flex h-14 items-center gap-3 px-6">
            <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
            <div className="h-4 w-40 bg-muted animate-pulse rounded" />
          </div>
        </header>
        <main className="container px-6 py-10 space-y-6 max-w-6xl mx-auto">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-muted animate-pulse rounded" />)}
        </main>
      </div>
    )
  }

  if (!model) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">
          {isZh ? `找不到模型 "${modelId}"` : `Model "${modelId}" not found`}
        </p>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isZh ? "返回列表" : "Back"}
        </Button>
      </div>
    )
  }

  const isMoe = model.isMoe

  const platformLinks = [
    model.huggingfaceUrl && (
      <PlatformLink key="hf" href={model.huggingfaceUrl}
        icon={<HuggingFaceIcon.Color size={17} />} label="HuggingFace" />
    ),
    model.modelscopeUrl && (
      <PlatformLink key="ms" href={model.modelscopeUrl}
        icon={<ModelScopeIcon.Color size={17} />} label="ModelScope" />
    ),
    model.arxivUrl && (
      <PlatformLink key="ax" href={model.arxivUrl}
        icon={<span className="text-sm font-bold text-red-500 leading-none">ar</span>} label="arXiv" />
    ),
    model.techReport && (
      <PlatformLink key="tr" href={model.techReport}
        icon={<span className="text-sm leading-none">📄</span>}
        label={isZh ? "技术报告" : "Tech Report"} />
    ),
  ].filter(Boolean)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <Link
              to={`/${providerSlug(model.provider ?? "")}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0 max-w-[200px] truncate"
            >
              {model.id.split("/")[0]}
            </Link>
            <span className="text-muted-foreground shrink-0">/</span>
            <span className="text-sm font-semibold truncate">{model.name}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle theme={theme} onToggle={handleThemeToggle} />
            <LanguageToggle currentLanguage={language} onLanguageChange={handleLanguageChange} />
          </div>
        </div>
      </header>

      <main className="container px-6 py-8 max-w-5xl mx-auto">

        {/* ── Desktop: two-column layout ── */}
        <div className="flex flex-col lg:flex-row gap-10">

          {/* Left column: hero + links */}
          <div className="lg:w-64 xl:w-72 shrink-0">
            {/* Icon + name */}
            <div className="flex items-center gap-4 mb-4">
              <ModelBrandIcon model={model.id} provider={model.provider} size={52} />
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-tight">{model.name}</h1>
                <Link
                  to={`/${providerSlug(model.provider ?? "")}`}
                  className="flex items-center gap-1.5 mt-1 hover:text-foreground transition-colors group w-fit"
                >
                  <ProviderBrandIcon provider={model.provider} size={14} />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{model.provider}</span>
                </Link>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {isMoe && (
                <span className="rounded-md px-2 py-0.5 text-xs font-semibold"
                  style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}>MoE</span>
              )}
              {model.architecture && (() => {
                const isClosed = !archEntry

                const badge = (
                  <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
                    {model.architecture}
                    {isClosed && <Lock className="h-3 w-3 opacity-50" />}
                  </span>
                )

                if (isClosed) {
                  return (
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>{badge}</TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {isZh ? "闭源架构，无公开图" : "Closed-source architecture"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                }

                return (
                  <Link to={`/arch/${archEntry.id}`}
                    className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground hover:border-foreground/50 hover:text-foreground transition-colors cursor-pointer">
                    {model.architecture}
                  </Link>
                )
              })()}
              {model.torchDtype && (
                <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">{model.torchDtype}</span>
              )}
            </div>

            {/* Modalities */}
            {(model.inputModalities?.length || model.outputModalities?.length) ? (
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
                {model.inputModalities?.length ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{isZh ? "输入" : "In"}</span>
                    <ModalityIcons modalities={model.inputModalities} />
                  </div>
                ) : null}
                {model.outputModalities?.length ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{isZh ? "输出" : "Out"}</span>
                    <ModalityIcons modalities={model.outputModalities} />
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Platform links */}
            {platformLinks.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                {platformLinks}
              </div>
            )}
          </div>

          {/* Right column: data sections */}
          <div className="flex-1 min-w-0 space-y-0">

            {/* Key metrics */}
            <SectionTitle>{isZh ? "核心参数" : "Key Metrics"}</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-5 py-5 border-b">
              <Field label={isZh ? "总参数量" : "Total Params"}
                value={<ParamValue value={model.totalParameters} model={model} />} />
              {isMoe && (
                <Field label={isZh ? "激活参数量" : "Active Params"}
                  value={<ParamValue value={model.activeParameters} model={model} />} />
              )}
              <Field label={isZh ? "上下文长度" : "Context Length"}
                value={model.contextLength ? formatContextLength(model.contextLength) : null} />
              <Field label={isZh ? "发布时间" : "Released"}
                value={model.createdAt ? formatDate(model.createdAt) : null} />
              {model.vocabSize && <Field label={isZh ? "词表大小" : "Vocab Size"} value={formatNumber(model.vocabSize)} />}
              {model.embeddingDim && <Field label={isZh ? "Embedding 维度" : "Emb. Dim"} value={formatNumber(model.embeddingDim)} />}
            </div>

            {/* Architecture */}
            <SectionTitle>{isZh ? "架构信息" : "Architecture"}</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-5 py-5 border-b">
              {model.numLayers        != null && <Field label={isZh ? "层数" : "Layers"}        value={model.numLayers} />}
              {model.numHeads         != null && <Field label={isZh ? "注意力头数" : "Attn Heads"} value={model.numHeads} />}
              {model.numKvHeads       != null && <Field label={isZh ? "KV 头数" : "KV Heads"}   value={model.numKvHeads} />}
              {model.hiddenSize       != null && <Field label={isZh ? "隐藏层大小" : "Hidden"}   value={formatNumber(model.hiddenSize)} />}
              {model.intermediateSize != null && <Field label={isZh ? "FFN 大小" : "FFN"}        value={formatNumber(model.intermediateSize)} />}
              {model.mlpFactor        != null && <Field label={isZh ? "MLP 因子" : "MLP Factor"} value={formatDecimal(model.mlpFactor)} />}
              {model.gqaRatio         != null && <Field label="GQA Ratio"                        value={formatDecimal(model.gqaRatio)} />}
              {model.positionEncoding       && <Field label={isZh ? "位置编码" : "Pos. Enc."}   value={model.positionEncoding} />}
              {model.activation             && <Field label={isZh ? "激活函数" : "Activation"}  value={model.activation} />}
              {model.normType               && <Field label={isZh ? "归一化" : "Norm"}           value={model.normType} />}
              {model.normEps          != null && <Field label="Norm ε"                           value={model.normEps.toExponential(1)} />}
              {model.attentionDropout != null && <Field label="Attn Dropout"                     value={model.attentionDropout} />}
            </div>

            {/* MoE */}
            {isMoe && (
              <>
                <SectionTitle>{isZh ? "MoE 专家配置" : "MoE Experts"}</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-5 py-5 border-b">
                  {model.numExperts          != null && <Field label={isZh ? "路由专家数" : "Routed"}    value={model.numExperts} />}
                  {model.numSharedExperts    != null && <Field label={isZh ? "共享专家数" : "Shared"}    value={model.numSharedExperts} />}
                  {model.numExpertsPerToken  != null && <Field label={isZh ? "每 Token 激活" : "/Token"} value={model.numExpertsPerToken} />}
                  {model.numActivatedExperts != null && <Field label={isZh ? "总激活专家" : "Activated"} value={model.numActivatedExperts} />}
                  {model.moeIntermediateSize != null && <Field label={isZh ? "专家 FFN" : "Expert FFN"}  value={formatNumber(model.moeIntermediateSize)} />}
                </div>
              </>
            )}

            {/* Parameter provenance */}
            {(model.parameterConfidence === "reported" || model.parameterConfidence === "rumored") && model.parameterSource && (
              <>
                <SectionTitle>{isZh ? "参数来源" : "Parameter Source"}</SectionTitle>
                <p className="text-sm text-muted-foreground py-4 border-b">
                  {model.parameterConfidence === "rumored"
                    ? (isZh ? "估算 / 未经验证：" : "Rumored: ")
                    : (isZh ? "第三方报告：" : "Reported: ")}
                  {model.parameterSourceUrl
                    ? <a href={model.parameterSourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">{model.parameterSource}</a>
                    : model.parameterSource}
                </p>
              </>
            )}

            {/* Footer */}
            <p className="text-xs text-muted-foreground pt-6">{model.id}</p>
          </div>
        </div>
      </main>
    </div>
  )
}
