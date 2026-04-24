import { useState, useEffect } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { ARCH_REGISTRY, TYPE_COLORS, type ArchSpec } from "@/components/arch-diagram"
import { getTranslations, type Language } from "@/lib/i18n"

// ─── Filter bar ───────────────────────────────────────────────────────────────

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

// ─── Arch card ────────────────────────────────────────────────────────────────

function ArchCard({
  arch, onSelect, language, t,
}: {
  arch: ArchSpec
  onSelect: (id: string) => void
  language: Language
  t: ReturnType<typeof getTranslations>["arch"]
}) {
  const Diagram = arch.diagram
  const desc = language === "zh" ? arch.descriptionZh : arch.descriptionEn

  return (
    <div
      className="group rounded-xl border bg-card hover:border-foreground/30 hover:shadow-md transition-all cursor-pointer flex flex-col overflow-hidden"
      onClick={() => onSelect(arch.id)}
    >
      {/* Diagram — bottom-up, input at bottom */}
      <div className="bg-muted/30 px-6 pt-4 pb-6 flex items-center justify-center min-h-[280px]">
        <Diagram {...arch.defaultParams} />
      </div>

      {/* Meta */}
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
  )
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

function ArchDetail({
  arch, onClose, language, t,
}: {
  arch: ArchSpec
  onClose: () => void
  language: Language
  t: ReturnType<typeof getTranslations>["arch"]
}) {
  const Diagram = arch.diagram
  const desc = language === "zh" ? arch.descriptionZh : arch.descriptionEn

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{arch.family}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[arch.type]}`}>
                  {arch.type}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  {arch.normPlacement === "pre" ? t.normPre : t.normPost}
                </span>
                <span className="text-xs text-muted-foreground font-mono">{arch.era}</span>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
          </div>

          {/* Diagram (larger) */}
          <div className="bg-muted/30 rounded-xl px-8 py-6 flex justify-center">
            <Diagram {...arch.defaultParams} />
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>

          {/* Links */}
          <div className="flex gap-3 flex-wrap">
            {arch.paperUrl && (
              <a href={arch.paperUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors">
                <ExternalLink className="h-3 w-3" /> {t.paper}
              </a>
            )}
            {arch.hfOrg && (
              <a href={`https://huggingface.co/${arch.hfOrg}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors">
                <ExternalLink className="h-3 w-3" /> HuggingFace
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ArchPage() {
  const [searchParams] = useSearchParams()
  const initialFamily = searchParams.get("family")

  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [language, setLanguage] = useState<Language>("zh")

  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") as "light" | "dark") || "light"
    setTheme(savedTheme)
    document.documentElement.classList.toggle("dark", savedTheme === "dark")
    const savedLang = (localStorage.getItem("language") || "zh") as Language
    setLanguage(savedLang)
  }, [])

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

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [selected, setSelected] = useState<string | null>(
    initialFamily
      ? (ARCH_REGISTRY.find(
          a => a.id === initialFamily.toLowerCase() ||
               a.family.toLowerCase() === initialFamily.toLowerCase()
        )?.id ?? null)
      : null
  )

  const translations = getTranslations(language)
  const t = translations.arch
  const filtered = ARCH_REGISTRY.filter(a => typeFilter === "all" || a.type === typeFilter)
  const selectedArch = selected ? ARCH_REGISTRY.find(a => a.id === selected) : null

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
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
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-1">{t.title}</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">{t.subtitle}</p>
        </div>

        {/* Filter bar */}
        <div className="mb-6">
          <FilterBar active={typeFilter} onChange={setTypeFilter} t={t} />
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(arch => (
              <ArchCard key={arch.id} arch={arch} onSelect={setSelected} language={language} t={t} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <p className="text-sm">{t.noMatch}</p>
          </div>
        )}

        {/* Coming soon */}
        <div className="mt-12 text-center text-xs text-muted-foreground">{t.comingSoon}</div>
      </main>

      {/* Detail modal */}
      {selectedArch && (
        <ArchDetail arch={selectedArch} onClose={() => setSelected(null)} language={language} t={t} />
      )}
    </div>
  )
}
