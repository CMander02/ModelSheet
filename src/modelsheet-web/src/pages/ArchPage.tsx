import { useState, useEffect } from "react"
import { Link, useSearchParams, useNavigate } from "react-router-dom"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import { ArchitectureDiagramRenderer } from "@/components/architecture-diagram-renderer"
import { ArrowLeft, ExternalLink } from "lucide-react"
import type { ArchitectureSpec } from "@/lib/types"
import { archMatchesFamily, loadArchitectures } from "@/lib/architecture-data"
import { getTranslations, type Language } from "@/lib/i18n"

export const TYPE_COLORS: Record<string, string> = {
  encoder: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  decoder: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  "encoder-decoder": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
}

type TypeFilter = "all" | "encoder" | "decoder" | "encoder-decoder"

function FilterBar({
  active, onChange, t,
}: {
  active: TypeFilter
  onChange: (v: TypeFilter) => void
  t: ReturnType<typeof getTranslations>["arch"]
}) {
  const labels: Record<TypeFilter, string> = {
    all: t.filterAll,
    encoder: t.filterEncoder,
    decoder: t.filterDecoder,
    "encoder-decoder": t.filterEncDec,
  }
  return (
    <div className="flex gap-2 flex-wrap">
      {(Object.keys(labels) as TypeFilter[]).map(v => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            active === v
              ? "bg-foreground text-background border-foreground"
              : "bg-background text-muted-foreground border-border hover:border-foreground/40"
          }`}
        >
          {labels[v]}
        </button>
      ))}
    </div>
  )
}

function ArchCard({
  arch, language, t,
}: {
  arch: ArchitectureSpec
  language: Language
  t: ReturnType<typeof getTranslations>["arch"]
}) {
  const desc = language === "zh" ? arch.descriptionZh : arch.descriptionEn

  return (
    <Link to={`/arch/${arch.id}`} className="block h-full">
      <div className="group rounded-xl border bg-card flex flex-col overflow-hidden transition-all h-full hover:border-foreground/30 hover:shadow-md cursor-pointer">
        <div className="bg-muted/30 px-6 pt-4 pb-6 flex items-center justify-center min-h-[220px]">
          <ArchitectureDiagramRenderer architecture={arch} />
        </div>

        <div className="p-4 flex flex-col gap-2 border-t">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-base tracking-tight">{arch.family}</span>
            <span className="text-xs text-muted-foreground font-mono">{arch.era}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[arch.type]}`}>
              {arch.type}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              {arch.normPlacement === "pre" ? t.normPre : t.normPost}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{desc}</p>
          {arch.paperUrl && (
            <a
              href={arch.paperUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-auto"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" />
              {t.paper}
            </a>
          )}
        </div>
      </div>
    </Link>
  )
}

export function ArchPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialFamily = searchParams.get("family")

  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [language, setLanguage] = useState<Language>("zh")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [architectures, setArchitectures] = useState<ArchitectureSpec[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") as "light" | "dark") || "light"
    setTheme(savedTheme)
    document.documentElement.classList.toggle("dark", savedTheme === "dark")
    const savedLang = (localStorage.getItem("language") || "zh") as Language
    setLanguage(savedLang)

    loadArchitectures()
      .then(items => {
        setArchitectures(items)
        if (initialFamily) {
          const match = items.find(a => archMatchesFamily(a, initialFamily))
          if (match) navigate(`/arch/${match.id}`, { replace: true })
        }
      })
      .finally(() => setIsLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  const translations = getTranslations(language)
  const t = translations.arch
  const filtered = architectures.filter(a => typeFilter === "all" || a.type === typeFilter)

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{t.backToHome}</span>
              </Button>
            </Link>
            <span className="font-semibold text-sm">{t.title}</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {t.architectures(filtered.length)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} onToggle={handleThemeToggle} />
            <LanguageToggle currentLanguage={language} onLanguageChange={handleLanguageChange} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-1">{t.title}</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">{t.subtitle}</p>
        </div>

        <div className="mb-6">
          <FilterBar active={typeFilter} onChange={setTypeFilter} t={t} />
        </div>

        {isLoading ? (
          <div className="py-24 text-center text-muted-foreground">{translations.common.loading}</div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(arch => (
              <ArchCard key={arch.id} arch={arch} language={language} t={t} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <p className="text-sm">{t.noMatch}</p>
          </div>
        )}
      </main>
    </div>
  )
}
