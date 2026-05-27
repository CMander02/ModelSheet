import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import type { ProviderInfo } from "@/lib/types"
import type { Language } from "@/lib/i18n"
import { getTranslations } from "@/lib/i18n"
import { loadProviders } from "@/lib/model-data"
import { ProviderBrandIcon } from "@/components/brand-icon"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Search } from "lucide-react"

type Region = "cn" | "global" | "other"

export function ProvidersPage() {
  const navigate = useNavigate()
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [language, setLanguage] = useState<Language>("zh")
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [query, setQuery] = useState("")

  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") as "light" | "dark") || "light"
    setTheme(savedTheme)
    document.documentElement.classList.toggle("dark", savedTheme === "dark")
    const savedLang = (localStorage.getItem("language") || "zh") as Language
    setLanguage(savedLang)
    loadProviders()
      .then(loaded => setProviders(loaded))
      .finally(() => setIsLoading(false))
  }, [])

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return providers
    return providers.filter(p => {
      const localized = t.providers[p.name] ?? p.name
      return p.name.toLowerCase().includes(q) || localized.toLowerCase().includes(q)
    })
  }, [providers, query, t.providers])

  const grouped = useMemo(() => {
    const groups: Record<Region, ProviderInfo[]> = { cn: [], global: [], other: [] }
    for (const p of filtered) {
      const region = p.region === "cn" || p.region === "global" ? p.region : "other"
      groups[region].push(p)
    }
    return groups
  }, [filtered])

  const regionLabel = (r: Region) =>
    r === "cn" ? t.providersPage.regionCN
      : r === "global" ? t.providersPage.regionGlobal
      : t.providersPage.regionOther

  if (isLoading) {
    return (
      <div className="min-h-full bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
          <div className="container flex h-14 items-center gap-3 px-6 max-w-6xl mx-auto">
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          </div>
        </header>
        <main className="container px-6 py-10 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
          </div>
        </main>
      </div>
    )
  }

  const renderCard = (p: ProviderInfo) => {
    const localized = isZh ? (t.providers[p.name] ?? p.name) : p.name
    return (
      <Link
        key={p.name}
        to={`/${p.id}`}
        className="group rounded-xl border bg-card hover:border-foreground/30 hover:shadow-sm transition-all flex items-center gap-4 p-4"
      >
        <ProviderBrandIcon provider={p.name} size={44} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors">
            {localized}
          </div>
          <div className="mt-1 text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
            <span>{t.providersPage.countModels(p.modelCount)}</span>
            {p.archCount > 0 && <span>·</span>}
            {p.archCount > 0 && <span>{t.providersPage.countArchs(p.archCount)}</span>}
          </div>
        </div>
      </Link>
    )
  }

  const sections: Region[] = ["cn", "global", "other"]

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted transition-colors"
              aria-label={t.providersPage.backToHome}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
              ModelSheet
            </Link>
            <span className="text-muted-foreground shrink-0">/</span>
            <span className="text-sm font-semibold truncate">{t.providersPage.title}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle theme={theme} onToggle={handleThemeToggle} />
            <LanguageToggle currentLanguage={language} onLanguageChange={handleLanguageChange} />
          </div>
        </div>
      </header>

      <main className="container px-6 py-8 max-w-6xl mx-auto space-y-8">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">{t.providersPage.title}</h1>
          <p className="text-sm text-muted-foreground">{t.providersPage.subtitle}</p>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.providersPage.searchPlaceholder}
              className="pl-9 h-9"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {t.providersPage.countModels(filtered.reduce((s, p) => s + p.modelCount, 0))}
            {" · "}
            {isZh ? `${filtered.length} 家厂商` : `${filtered.length} provider${filtered.length !== 1 ? "s" : ""}`}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">{t.providersPage.noProviders}</div>
        ) : (
          sections.map(region => {
            const list = grouped[region]
            if (list.length === 0) return null
            return (
              <section key={region}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {regionLabel(region)}
                  </span>
                  <div className="flex-1 border-t" />
                  <span className="text-xs text-muted-foreground">{list.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {list.map(renderCard)}
                </div>
              </section>
            )
          })
        )}

        {filtered.length > 0 && (
          <div className="pt-4">
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.providersPage.backToHome}
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
