import { useEffect, useState, useMemo } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import type { ModelInfo, ProviderInfo } from "@/lib/types"
import type { Language } from "@/lib/i18n"
import { loadProviderBySlug } from "@/lib/model-data"
import { formatParameters, formatContextLength, formatDate } from "@/lib/formatters"
import { ProviderBrandIcon, ModelBrandIcon } from "@/components/brand-icon"
import { ModalityIcons } from "@/components/modality-icons"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { getTranslations } from "@/lib/i18n"

// ─── Model card ───────────────────────────────────────────────────────────────

function ModelCard({ model, language }: { model: ModelInfo; language: Language }) {
  const isZh = language === "zh"
  const [org, name] = model.id.split("/")

  return (
    <Link
      to={`/${org}/${name}`}
      className="group rounded-xl border bg-card hover:border-foreground/30 hover:shadow-sm transition-all flex flex-col gap-3 p-4"
    >
      <div className="flex items-start gap-3 min-w-0">
        <ModelBrandIcon model={model.id} provider={model.provider} size={36} className="shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors">
              {model.name}
            </span>
            {model.isMoe && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none shrink-0"
                style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}>
                MoE
              </span>
            )}
          </div>
          {model.createdAt && (
            <span className="text-[11px] text-muted-foreground">{formatDate(model.createdAt)}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
        {model.totalParameters != null && (
          <span className="font-medium text-foreground">
            {formatParameters(model.totalParameters)}
          </span>
        )}
        {model.isMoe && model.activeParameters != null && (
          <span>/ {isZh ? "激活 " : ""}{formatParameters(model.activeParameters)}{isZh ? "" : " active"}</span>
        )}
        {model.contextLength != null && (
          <span>{formatContextLength(model.contextLength)}</span>
        )}
        {(model.inputModalities?.length || model.outputModalities?.length) ? (
          <ModalityIcons modalities={[...(model.inputModalities ?? []), ...(model.outputModalities ?? [])]} />
        ) : null}
      </div>

      {model.architecture && (
        <div>
          <span className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {model.architecture}
          </span>
        </div>
      )}
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProviderPage() {
  const { providerSlug: slug } = useParams<{ providerSlug: string }>()
  const navigate = useNavigate()

  const [models, setModels] = useState<ModelInfo[]>([])
  const [provider, setProvider] = useState<ProviderInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [language, setLanguage] = useState<Language>("zh")
  const [theme, setTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") as "light" | "dark") || "light"
    setTheme(savedTheme)
    document.documentElement.classList.toggle("dark", savedTheme === "dark")
    const savedLang = (localStorage.getItem("language") || "zh") as Language
    setLanguage(savedLang)
    if (!slug) {
      setIsLoading(false)
      return
    }
    loadProviderBySlug(slug)
      .then(detail => {
        setProvider(detail?.provider ?? null)
        setModels(detail?.models ?? [])
      })
      .finally(() => setIsLoading(false))
  }, [slug])

  const handleThemeToggle = () => {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    localStorage.setItem("theme", next)
    document.documentElement.classList.toggle("dark", next === "dark")
  }
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem("language", lang)
  }

  const t = getTranslations(language)
  const isZh = language === "zh"

  const canonicalProvider = provider?.name

  const providerModels = useMemo(() => {
    return models
      .sort((a, b) => {
        if (!a.createdAt && !b.createdAt) return 0
        if (!a.createdAt) return 1
        if (!b.createdAt) return -1
        return b.createdAt.localeCompare(a.createdAt)
      })
  }, [models])

  const maxParams = useMemo(() => {
    const counts = providerModels.map(m => m.totalParameters).filter((v): v is number => v != null)
    return counts.length > 0 ? Math.max(...counts) : null
  }, [providerModels])

  const architectureCount = useMemo(
    () => new Set(providerModels.map(m => m.architecture).filter(Boolean)).size,
    [providerModels]
  )

  const byYear = useMemo(() => {
    const groups: Record<string, ModelInfo[]> = {}
    for (const m of providerModels) {
      const year = m.createdAt ? m.createdAt.slice(0, 4) : (isZh ? "未知" : "Unknown")
      if (!groups[year]) groups[year] = []
      groups[year].push(m)
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [providerModels, isZh])

  if (isLoading) {
    return (
      <div className="min-h-full bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
          <div className="container flex h-14 items-center gap-3 px-6 max-w-6xl mx-auto">
            <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
            <div className="h-4 w-40 bg-muted animate-pulse rounded" />
          </div>
        </header>
        <main className="container px-6 py-10 max-w-6xl mx-auto">
          <div className="h-24 bg-muted animate-pulse rounded-xl mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />)}
          </div>
        </main>
      </div>
    )
  }

  if (!canonicalProvider || providerModels.length === 0) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">
          {isZh ? `找不到提供商 "${slug}"` : `Provider "${slug}" not found`}
        </p>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isZh ? "返回列表" : "Back"}
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
              ModelSheet
            </Link>
            <span className="text-muted-foreground shrink-0">/</span>
            <span className="text-sm font-semibold truncate">{canonicalProvider}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle theme={theme} onToggle={handleThemeToggle} />
            <LanguageToggle currentLanguage={language} onLanguageChange={handleLanguageChange} />
          </div>
        </div>
      </header>

      <main className="container px-6 py-8 max-w-6xl mx-auto space-y-8">

        {/* Hero */}
        <div className="flex items-center gap-5">
          <ProviderBrandIcon provider={canonicalProvider} size={56} />
          <div>
            <h1 className="text-2xl font-bold">
              {isZh ? (t.providers[canonicalProvider] ?? canonicalProvider) : canonicalProvider}
            </h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
              <span>{providerModels.length}{isZh ? " 个模型" : ` model${providerModels.length !== 1 ? "s" : ""}`}</span>
              {architectureCount > 0 && (
                <span>{architectureCount}{isZh ? " 种架构" : ` arch${architectureCount !== 1 ? "s" : ""}`}</span>
              )}
              {maxParams != null && (
                <span>{isZh ? "最大 " : "up to "}{formatParameters(maxParams)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Models grouped by year */}
        {byYear.map(([year, yearModels]) => (
          <section key={year}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{year}</span>
              <div className="flex-1 border-t" />
              <span className="text-xs text-muted-foreground">{yearModels.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {yearModels.map(m => (
                <ModelCard key={m.id} model={m} language={language} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}
