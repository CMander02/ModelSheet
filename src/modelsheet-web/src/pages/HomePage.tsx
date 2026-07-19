import { useEffect, useState, useCallback, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import type { ModelInfo, ColumnConfig, ComplexityLevel, SortConfig } from "@/lib/types"
import type { Language } from "@/lib/i18n"
import {
  searchModels,
  loadColumnConfigFromStorage,
  saveColumnConfigToStorage,
  getColumnConfigs,
  COMPLEXITY_PRESETS,
  saveSearchState,
  loadSearchState,
  saveHomeScrollPosition,
  resetHomeScrollPositions,
} from "@/lib/model-data"
import type { HomeBrowseView, HomeScrollPosition, SearchResult } from "@/lib/model-data"
import { getTranslations } from "@/lib/i18n"
import { ModelTable } from "@/components/model-table"
import { MobileModelList } from "@/components/mobile-model-list"
import { CustomFieldSelector } from "@/components/custom-field-selector"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Building2, ChevronDown, GitCompareArrows, Network, Search, SlidersHorizontal } from "lucide-react"

const DEFAULT_SORT_CONFIG: SortConfig = { key: "releasedAt", direction: "desc" }

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
  const [sortConfig, setSortConfig] = useState<SortConfig>(DEFAULT_SORT_CONFIG)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [itemsPerPage] = useState(30)
  const [scrollRestorePositions, setScrollRestorePositions] =
    useState<Partial<Record<HomeBrowseView, HomeScrollPosition>>>({})
  const [scrollRestoreKey, setScrollRestoreKey] = useState(0)

  // ─── API search ──────────────────────────────────────────────────────────

  const doSearch = useCallback(async (
    q: string,
    page: number,
    append: boolean = false,
    nextSort: SortConfig = DEFAULT_SORT_CONFIG,
  ) => {
    setIsSearching(true)
    try {
      const result: SearchResult = await searchModels(q, page, itemsPerPage, nextSort)
      setModels(prev => append ? [...prev, ...result.items] : result.items)
      setTotalCount(result.total)
      setCurrentPage(page)
      setHasMore(page < Math.ceil(result.total / itemsPerPage))
      saveSearchState(q, page, nextSort)
    } finally {
      setIsSearching(false)
    }
  }, [itemsPerPage])

  const restoreSearch = useCallback(async (
    q: string,
    savedPage: number,
    nextSort: SortConfig = DEFAULT_SORT_CONFIG,
  ) => {
    const page = Math.max(1, savedPage || 1)
    setIsSearching(true)
    try {
      const targetItems = page * itemsPerPage
      const restoreLimit = 100
      const restoredItems: ModelInfo[] = []
      let total = 0
      let requestPage = 1

      while (restoredItems.length < targetItems) {
        const result: SearchResult = await searchModels(q, requestPage, restoreLimit, nextSort)
        total = result.total
        restoredItems.push(...result.items)
        if (result.items.length === 0 || restoredItems.length >= total) break
        requestPage += 1
      }

      const items = restoredItems.slice(0, targetItems)
      const totalPages = Math.ceil(total / itemsPerPage)
      const restoredPage = Math.max(1, Math.min(Math.ceil(items.length / itemsPerPage), totalPages || 1))
      setModels(items)
      setTotalCount(total)
      setCurrentPage(restoredPage)
      setHasMore(items.length < total)
      saveSearchState(q, restoredPage, nextSort)
    } finally {
      setIsSearching(false)
    }
  }, [itemsPerPage])

  const resetBrowsePosition = useCallback(() => {
    resetHomeScrollPositions()
    setScrollRestorePositions({
      desktop: { top: 0, left: 0 },
      mobile: { top: 0, left: 0 },
    })
    setScrollRestoreKey(key => key + 1)
  }, [])

  const handleSortChange = useCallback((nextSort: SortConfig) => {
    resetBrowsePosition()
    setSortConfig(nextSort)
    doSearch(searchTerm, 1, false, nextSort)
  }, [doSearch, resetBrowsePosition, searchTerm])

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      resetBrowsePosition()
      doSearch(value, 1, false, sortConfig)
    }, 300)
  }, [doSearch, resetBrowsePosition, sortConfig])

  const loadMore = useCallback(() => {
    if (!hasMore || isSearching) return
    doSearch(searchTerm, currentPage + 1, true, sortConfig)
  }, [hasMore, isSearching, searchTerm, currentPage, sortConfig, doSearch])

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
      const restoredSort = savedState.sortConfig ?? DEFAULT_SORT_CONFIG
      setScrollRestorePositions(savedState.scroll ?? {})
      setScrollRestoreKey(key => key + 1)
      setSearchTerm(savedState.term)
      setSortConfig(restoredSort)
      restoreSearch(savedState.term, savedState.page, restoredSort)
      setIsLoading(false)
    } else {
      // First load — show initial batch (browse mode)
      doSearch("", 1)
      setIsLoading(false)
    }
  }, [doSearch, restoreSearch])

  // ─── Save state before navigating away ────────────────────────────────

  const handleModelClick = useCallback((model: ModelInfo) => {
    saveSearchState(searchTerm, currentPage, sortConfig)
    if (model.id?.includes("/")) {
      const [org, name] = model.id.split("/")
      navigate(`/${org}/${name}`)
    }
  }, [searchTerm, currentPage, sortConfig, navigate])

  const handleHomeScrollPositionChange = useCallback((view: HomeBrowseView, position: HomeScrollPosition) => {
    saveHomeScrollPosition(view, position)
  }, [])

  const handleDesktopScrollPositionChange = useCallback((position: HomeScrollPosition) => {
    handleHomeScrollPositionChange("desktop", position)
  }, [handleHomeScrollPositionChange])

  const handleMobileScrollPositionChange = useCallback((position: HomeScrollPosition) => {
    handleHomeScrollPositionChange("mobile", position)
  }, [handleHomeScrollPositionChange])

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
  const complexityLabels: Record<ComplexityLevel, string> = {
    simple: language === "zh" ? "简单" : "Simple",
    enthusiast: language === "zh" ? "爱好者" : "Enthusiast",
    developer: language === "zh" ? "开发者" : "Developer",
    custom: language === "zh" ? "自定义" : "Custom",
  }

  const renderComplexityMenu = (compact = false) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={compact ? "h-9 w-[7.25rem] justify-between px-2.5 text-xs" : "h-9 min-w-[8.5rem] justify-between px-3"}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>{complexityLabels[complexityLevel]}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuRadioGroup
          value={complexityLevel}
          onValueChange={(value) => handleComplexityChange(value as ComplexityLevel)}
        >
          {(Object.keys(complexityLabels) as ComplexityLevel[]).map((level) => (
            <DropdownMenuRadioItem
              key={level}
              value={level}
              onSelect={() => {
                if (level === "custom" && complexityLevel === "custom") setShowFieldSelector(true)
              }}
            >
              {complexityLabels[level]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  if (isLoading) {
    return (
      <div className="min-h-full bg-background">
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="shrink-0 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Desktop header */}
        <div className="container hidden md:flex h-14 items-center gap-3">
          <div className="flex shrink-0 items-center gap-2">
            <h1 className="text-xl font-bold leading-none">{t.nav.title}</h1>
            <span className="inline-flex h-6 items-center rounded border bg-muted/40 px-2 text-xs leading-none text-muted-foreground">
              {language === "zh" ? `${totalCount} 个` : `${totalCount}`}
            </span>
          </div>

          <div className="relative min-w-[220px] max-w-xl flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={language === "zh" ? "搜索模型..." : "Search models..."}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-9 pl-9"
            />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {renderComplexityMenu()}
            <div className="mx-1 h-5 w-px bg-border" />
            <Link to="/providers">
              <Button variant="ghost" size="sm" className="h-9 px-2.5" title={t.nav.providers} aria-label={t.nav.providers}>
                <Building2 className="h-4 w-4" />
                <span className="hidden xl:inline">{t.nav.providers}</span>
              </Button>
            </Link>
            <Link to="/arch">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2.5"
                title={language === "zh" ? "架构图鉴" : "Arch Gallery"}
                aria-label={language === "zh" ? "架构图鉴" : "Arch Gallery"}
              >
                <Network className="h-4 w-4" />
                <span className="hidden xl:inline">{language === "zh" ? "架构图鉴" : "Arch Gallery"}</span>
              </Button>
            </Link>
            <Link to="/compare">
              <Button variant="ghost" size="sm" className="h-9 px-2.5" title={t.nav.compareModels} aria-label={t.nav.compareModels}>
                <GitCompareArrows className="h-4 w-4" />
                <span className="hidden xl:inline">{t.nav.compareModels}</span>
              </Button>
            </Link>
            <div className="mx-1 h-5 w-px bg-border" />
            <ThemeToggle theme={theme} onToggle={handleThemeToggle} />
            <LanguageToggle
              currentLanguage={language}
              onLanguageChange={handleLanguageChange}
            />
          </div>
        </div>

        {/* Mobile header */}
        <div className="container flex md:hidden flex-col gap-2 py-2">
          <div className="flex h-9 items-center gap-2">
            <h1 className="text-lg font-bold shrink-0">{t.nav.title}</h1>
            <span className="shrink-0 rounded border bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {language === "zh" ? `${totalCount} 个` : totalCount}
            </span>
            <div className="min-w-0 flex-1" />
            <Link to="/providers">
              <Button variant="ghost" size="sm" className="h-8 w-8 px-0" title={t.nav.providers} aria-label={t.nav.providers}>
                <Building2 className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/arch">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 px-0"
                title={language === "zh" ? "架构图鉴" : "Arch Gallery"}
                aria-label={language === "zh" ? "架构图鉴" : "Arch Gallery"}
              >
                <Network className="h-4 w-4" />
              </Button>
            </Link>
            <ThemeToggle theme={theme} onToggle={handleThemeToggle} />
            <LanguageToggle currentLanguage={language} onLanguageChange={handleLanguageChange} />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={language === "zh" ? "搜索..." : "Search..."}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            {renderComplexityMenu(true)}
          </div>
        </div>
      </header>

      {/* Main Content */}
      {/* Desktop: scrollable data table */}
      <main className="hidden md:flex flex-1 overflow-hidden flex-col container pt-3 pb-3">
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
          sortConfig={sortConfig}
          onSortChange={handleSortChange}
          onModelClick={handleModelClick}
          scrollRestorePosition={scrollRestorePositions.desktop ?? null}
          scrollRestoreKey={scrollRestoreKey}
          onScrollPositionChange={handleDesktopScrollPositionChange}
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
          customFields={customFields}
          sortConfig={sortConfig}
          onSortChange={handleSortChange}
          onModelClick={handleModelClick}
          scrollRestorePosition={scrollRestorePositions.mobile ?? null}
          scrollRestoreKey={scrollRestoreKey}
          onScrollPositionChange={handleMobileScrollPositionChange}
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
