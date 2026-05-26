import { useEffect, useState } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import { ArchitectureDiagramRenderer } from "@/components/architecture-diagram-renderer"
import { ArrowLeft, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import { TYPE_COLORS } from "@/pages/ArchPage"
import type { ArchitectureSpec } from "@/lib/types"
import { loadArchitecture, loadArchitectures } from "@/lib/architecture-data"
import { getTranslations, type Language } from "@/lib/i18n"
import HuggingFaceIcon from "@lobehub/icons/es/HuggingFace"

export function ArchDetailPage() {
  const { archId } = useParams<{ archId: string }>()
  const navigate = useNavigate()
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [language, setLanguage] = useState<Language>("zh")
  const [arch, setArch] = useState<ArchitectureSpec | null>(null)
  const [architectures, setArchitectures] = useState<ArchitectureSpec[]>([])
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

    Promise.all([loadArchitecture(archId), loadArchitectures()])
      .then(([item, items]) => {
        setArch(item)
        setArchitectures(items)
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

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center text-muted-foreground">
        {getTranslations(language).common.loading}
      </div>
    )
  }

  if (!arch) {
    const displayId = archId ? decodeURIComponent(archId) : "unknown"
    return (
      <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
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
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
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

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-[3] overflow-auto border-r bg-muted/10">
          <div className="min-h-full flex items-center justify-center p-8">
            <div className="w-full [&_svg.flowchart]:!max-w-[640px] [&_svg.flowchart]:!w-full [&_svg.flowchart]:mx-auto [&>div]:flex [&>div]:justify-center">
              <ArchitectureDiagramRenderer architecture={arch} />
            </div>
          </div>
        </div>

        <div className="flex-[2] flex flex-col overflow-y-auto">
          <div className="p-8 space-y-6">
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
