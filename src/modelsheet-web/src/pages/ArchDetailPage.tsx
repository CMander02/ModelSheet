import { useEffect, useState } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { ARCH_REGISTRY, TYPE_COLORS } from "@/components/arch-diagram"
import { getTranslations, type Language } from "@/lib/i18n"
import HuggingFaceIcon from "@lobehub/icons/es/HuggingFace"

export function ArchDetailPage() {
  const { archId } = useParams<{ archId: string }>()
  const navigate = useNavigate()
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

  const t = getTranslations(language).arch
  const isZh = language === "zh"
  const arch = ARCH_REGISTRY.find(a => a.id === archId)

  if (!arch) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">
          {isZh ? `找不到架构 "${archId}"` : `Architecture "${archId}" not found`}
        </p>
        <Button variant="outline" onClick={() => navigate("/arch")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t.title}
        </Button>
      </div>
    )
  }

  const Diagram = arch.diagram
  const desc = isZh ? arch.descriptionZh : arch.descriptionEn
  const isPlaceholder = arch.placeholder

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
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
            <Link to="/arch" className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
              {t.title}
            </Link>
            <span className="text-muted-foreground shrink-0">/</span>
            <span className="text-sm font-semibold truncate">{arch.family}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle theme={theme} onToggle={handleThemeToggle} />
            <LanguageToggle currentLanguage={language} onLanguageChange={handleLanguageChange} />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* Left: meta */}
          <div className="lg:w-64 xl:w-72 shrink-0 space-y-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{arch.family}</h1>
              <p className="text-sm text-muted-foreground font-mono mt-1">{arch.era}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[arch.type]}`}>
                {arch.type}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                {arch.normPlacement === "pre" ? t.normPre : t.normPost}
              </span>
              {isPlaceholder && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground border border-dashed">
                  Coming Soon
                </span>
              )}
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>

            <div className="flex flex-col gap-2 pt-2">
              {arch.paperUrl && (
                <a href={arch.paperUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border hover:bg-muted transition-colors w-fit">
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t.paper}
                </a>
              )}
              {arch.hfOrg && (
                <a href={`https://huggingface.co/${arch.hfOrg}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border hover:bg-muted transition-colors w-fit">
                  <HuggingFaceIcon.Color size={14} />
                  HuggingFace
                </a>
              )}
            </div>

            {arch.modelTypeAliases && arch.modelTypeAliases.length > 0 && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-1.5">model_type</p>
                <div className="flex flex-wrap gap-1">
                  {arch.modelTypeAliases.map(alias => (
                    <span key={alias} className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {alias}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: diagram */}
          <div className="flex-1 min-w-0">
            <div className="rounded-xl border bg-muted/20 p-6 flex items-center justify-center min-h-[400px]">
              {isPlaceholder ? (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="opacity-20">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <path d="M14 17.5h7M17.5 14v7" />
                  </svg>
                  <span className="text-sm opacity-40">Coming Soon</span>
                </div>
              ) : (
                <Diagram {...arch.defaultParams} />
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
