import { useEffect, useState, useCallback, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import type { ModelInfo, ColumnConfig, ComplexityLevel } from "@/lib/types"
import type { Language } from "@/lib/i18n"
import {
  searchModels,
  loadColumnConfigFromStorage,
  saveColumnConfigToStorage,
  getColumnConfigs,
  COMPLEXITY_PRESETS,
  saveSearchState,
  loadSearchState,
  clearSearchState,
} from "@/lib/model-data"
import type { SearchResult } from "@/lib/model-data"
import { getTranslations } from "@/lib/i18n"
import { ModelTable } from "@/components/model-table"
import { MobileModelList } from "@/components/mobile-model-list"
import { CustomFieldSelector } from "@/components/custom-field-selector"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Search } from "lucide-react"

export function HomePage() {
  const navigate = useNavigate()
  const [models, setModels] = useState<ModelInfo[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [columns, setColumns] = useState<ColumnConfig[]>([])
  const [complexityLevel, setComplexityLevel] =
    useState<ComplexityLevel>("enthusiast")
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [language, setLanguage] = useState<Language>("zh")
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set())
  const [showFieldSelector, setShowFieldSelector] = useState(false)
  const [customFields, setCustomFields] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [itemsPerPage] = useState(30)

  // ─── API search ──────────────────────────────────────────────────────────

  const doSearch = useCallback(async (q: string, page: number, append: boolean = false) => {
    setIsSearching(true)
    try {
      const result: SearchResult = await searchModels(q, page, itemsPerPage)
      setModels(prev => append ? [...prev, ...result.items] : result.items)
      setTotalCount(result.total)
      setCurrentPage(page)
      setHasMore(page < result.totalPages)
      saveSearchState(q, page)
    } finally {
      setIsSearching(false)
    }
  }, [itemsPerPage])

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      doSearch(value, 1)
    }, 300)
  }, [doSearch])

  const loadMore = useCallback(() => {
    if (!hasMore || isSearching) return
    doSearch(searchTerm, currentPage + 1, true)
  }, [hasMore, isSearching, searchTerm, currentPage, doSearch])

  // ─── Init ────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Load theme
    const savedTheme =
      (localStorage.getItem("theme") as "light" | "dark") || "light"
    setTheme(savedTheme)
    document.documentElement.classList.toggle("dark", savedTheme === "dark")

    // Load language
    const savedLanguage = (localStorage.getItem("language") || "zh") as Language
    setLanguage(savedLanguage)

    // Load columns
    const loadedColumns = loadColumnConfigFromStorage()
    const currentColumns = getColumnConfigs(savedLanguage)
    if (loadedColumns.length === 0) {
      setColumns(currentColumns)
      saveColumnConfigToStorage(currentColumns)
    } else {
      setColumns(loadedColumns)
    }

    // Restore search state if returning from detail page
    const savedState = loadSearchState()
    if (savedState) {
      setSearchTerm(savedState.term)
      doSearch(savedState.term, savedState.page)
      setIsLoading(false)
    } else {
      // First load — show initial batch (browse mode)
      doSearch("", 1)
      setIsLoading(false)
    }
  }, [doSearch])

  // ─── Save state before navigating away ────────────────────────────────

  const handleModelClick = useCallback((model: ModelInfo) => {
    saveSearchState(searchTerm, currentPage)
    if (model.id?.includes("/")) {
      const [org, name] = model.id.split("/")
      navigate(`/${org}/${name}`)
    }
  }, [searchTerm, currentPage, navigate])

  // ─── Rest ────────────────────────────────────────────────────────────────

  const handleThemeToggle = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem("language", lang)
    setColumns(getColumnConfigs(lang))
  }

  const handleColumnChange = (newColumns: ColumnConfig[]) => {
    setColumns(newColumns)
    saveColumnConfigToStorage(newColumns)
  }

  const handleComplexityChange = (level: ComplexityLevel) => {
    setComplexityLevel(level)
    if (level === "custom") {
      setShowFieldSelector(true)
    }
  }

  const handleCustomFieldsSave = (selectedKeys: string[]) => {
    setCustomFields(selectedKeys)
    COMPLEXITY_PRESETS.custom.columns = selectedKeys
    localStorage.setItem("customFields", JSON.stringify(selectedKeys))
  }

  // Load custom fields
  useEffect(() => {
    try {
      const saved = localStorage.getItem("customFields")
      if (saved) {
        const fields = JSON.parse(saved) as string[]
        setCustomFields(fields)
        COMPLEXITY_PRESETS.custom.columns = fields
      }
    } catch (error) {
      console.error("Failed to load custom fields:", error)
    }
  }, [])

  const handleModelSelect = (modelId: string) => {
    setSelectedModels(prev => {
      const next = new Set(prev)
      if (next.has(modelId)) {
        next.delete(modelId)
      } else {
        next.add(modelId)
      }
      return next
    })
  }

  const handleCompare = () => {
    if (selectedModels.size >= 2) {
      sessionStorage.setItem("selectedModelIds", JSON.stringify(Array.from(selectedModels)))
      navigate("/compare")
    }
  }

  const t = getTranslations(language)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-8 w-48 bg-muted animate-pulse rounded" />
              <div className="h-5 w-16 bg-muted animate-pulse rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-24 bg-muted animate-pulse rounded" />
              <div className="h-10 w-10 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </header>
        <main className="container py-8">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="h-10 w-full sm:w-96 bg-muted animate-pulse rounded" />
              <div className="h-10 w-full sm:w-80 bg-muted animate-pulse rounded" />
            </div>
            <div className="rounded-md border">
              <div className="p-4 space-y-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" style={{ animationDelay: `${i * 50}ms` }} />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="shrink-0 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Desktop header row */}
        <div className="container hidden md:flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{t.nav.title}</h1>
            <span className="text-sm text-muted-foreground">
              {language === "zh" ? `共 ${totalCount} 个模型` : `${totalCount} models`}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-1 justify-center max-w-sm mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={language === "zh" ? "搜索模型..." : "Search models..."}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ToggleGroup
              type="single"
              value={complexityLevel}
              onValueChange={(value) => { if (value) handleComplexityChange(value as ComplexityLevel) }}
            >
              <ToggleGroupItem value="simple" className="h-8 px-3 text-sm">
                {language === "zh" ? "简单" : "Simple"}
              </ToggleGroupItem>
              <ToggleGroupItem value="enthusiast" className="h-8 px-3 text-sm">
                {language === "zh" ? "爱好者" : "Enthusiast"}
              </ToggleGroupItem>
              <ToggleGroupItem value="developer" className="h-8 px-3 text-sm">
                {language === "zh" ? "开发者" : "Developer"}
              </ToggleGroupItem>
              <ToggleGroupItem
                value="custom"
                className="h-8 px-3 text-sm"
                onClick={() => { if (complexityLevel === "custom") setShowFieldSelector(true) }}
              >
                {language === "zh" ? "自定义" : "Custom"}
              </ToggleGroupItem>
            </ToggleGroup>
            <Link to="/arch">
              <Button variant="outline" size="sm">{language === "zh" ? "架构图鉴" : "Arch Gallery"}</Button>
            </Link>
            <Link to="/compare">
              <Button variant="outline" size="sm">{t.nav.compareModels}</Button>
            </Link>
            <ThemeToggle theme={theme} onToggle={handleThemeToggle} />
            <LanguageToggle
              currentLanguage={language}
              onLanguageChange={handleLanguageChange}
            />
          </div>
        </div>

        {/* Mobile header row */}
        <div className="container flex md:hidden h-14 items-center gap-2">
          <h1 className="text-lg font-bold shrink-0">{t.nav.title}</h1>
          <div className="relative flex-1 min-w-0 mx-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={language === "zh" ? "搜索..." : "Search..."}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Link to="/arch">
            <Button variant="outline" size="sm" className="text-xs px-2">{language === "zh" ? "架构" : "Arch"}</Button>
          </Link>
          <ThemeToggle theme={theme} onToggle={handleThemeToggle} />
          <LanguageToggle currentLanguage={language} onLanguageChange={handleLanguageChange} />
        </div>
      </header>

      {/* Main Content */}
      {/* Desktop: scrollable data table */}
      <main className="hidden md:flex flex-1 overflow-hidden flex-col container pt-4 pb-4">
        <ModelTable
          models={models}
          totalCount={totalCount}
          hasMore={hasMore}
          isLoadingMore={isSearching}
          onLoadMore={loadMore}
          columns={columns}
          onColumnChange={handleColumnChange}
          onComplexityChange={handleComplexityChange}
          onCustomFieldsClick={() => setShowFieldSelector(true)}
          currentComplexity={complexityLevel}
          language={language}
          selectedModels={selectedModels}
          onModelSelect={handleModelSelect}
          onClearSelection={() => setSelectedModels(new Set())}
          onCompare={handleCompare}
          searchTerm={searchTerm}
          onModelClick={handleModelClick}
        />
      </main>

      {/* Mobile: card list */}
      <main className="flex md:hidden flex-1 overflow-hidden container pt-3 min-w-0">
        <MobileModelList
          models={models}
          totalCount={totalCount}
          hasMore={hasMore}
          isLoadingMore={isSearching}
          onLoadMore={loadMore}
          searchTerm={searchTerm}
          language={language}
          complexityLevel={complexityLevel}
          onComplexityChange={(level) => setComplexityLevel(level as ComplexityLevel)}
          onModelClick={handleModelClick}
        />
      </main>

      {/* Custom Field Selector Dialog */}
      <CustomFieldSelector
        open={showFieldSelector}
        onOpenChange={setShowFieldSelector}
        allColumns={columns}
        selectedKeys={customFields.length > 0 ? customFields : columns.map(c => c.key)}
        onSave={handleCustomFieldsSave}
      />
    </div>
  )
}
