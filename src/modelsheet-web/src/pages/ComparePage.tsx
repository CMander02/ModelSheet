import { useEffect, useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { Search, X } from "lucide-react"
import type { ModelInfo, ColumnConfig, ComplexityLevel } from "@/lib/types"
import type { Language } from "@/lib/i18n"
import {
  loadModelsByIds,
  searchModels,
  loadColumnConfigFromStorage,
  saveColumnConfigToStorage,
  getColumnConfigs,
} from "@/lib/model-data"
import { getTranslations, translateProvider } from "@/lib/i18n"
import { EnhancedComparisonTable } from "@/components/enhanced-comparison-table"
import { CustomFieldSelector } from "@/components/custom-field-selector"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Input } from "@/components/ui/input"
import { COMPLEXITY_PRESETS } from "@/lib/model-data"

export function ComparePage() {
  const [suggestions, setSuggestions] = useState<{ query: string; items: ModelInfo[]; failed: boolean }>({ query: "", items: [], failed: false })
  const [totalCount, setTotalCount] = useState(0)
  const [loadError, setLoadError] = useState(false)
  const [columns, setColumns] = useState<ColumnConfig[]>([])
  const [selectedModels, setSelectedModels] = useState<ModelInfo[]>([])
  const [complexityLevel, setComplexityLevel] =
    useState<ComplexityLevel>("enthusiast")
  const [isLoading, setIsLoading] = useState(true)
  const [language, setLanguage] = useState<Language>("zh")
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [showFieldSelector, setShowFieldSelector] = useState(false)
  const [customFields, setCustomFields] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    let cancelled = false
    // Load theme
    const savedTheme =
      (localStorage.getItem("theme") as "light" | "dark") || "light"
    setTheme(savedTheme)
    document.documentElement.classList.toggle("dark", savedTheme === "dark")

    // Load language
    const savedLanguage = (localStorage.getItem("language") || "zh") as Language
    setLanguage(savedLanguage)

    // Load data
    const loadData = async () => {
      const loadedColumns = loadColumnConfigFromStorage()

      // 使用当前语言的列配置
      const currentColumns = getColumnConfigs(savedLanguage)
      if (loadedColumns.length === 0) {
        setColumns(currentColumns)
        saveColumnConfigToStorage(currentColumns)
      } else {
        setColumns(loadedColumns)
      }

      // Load pre-selected models from sessionStorage
      try {
        const selectedIds = sessionStorage.getItem("selectedModelIds")
        const ids = selectedIds ? JSON.parse(selectedIds) as string[] : []
        const [preSelected, catalog] = await Promise.all([
          loadModelsByIds(ids),
          searchModels("", 1, 1),
        ])
        if (cancelled) return
        setSelectedModels(preSelected)
        setTotalCount(catalog.total)
        sessionStorage.removeItem("selectedModelIds")
      } catch {
        if (!cancelled) setLoadError(true)
      }

      // Load custom fields
      try {
        const savedFields = localStorage.getItem("customFields")
        if (savedFields) {
          const fields = JSON.parse(savedFields) as string[]
          setCustomFields(fields)
          COMPLEXITY_PRESETS.custom.columns = fields
        }
      } catch (error) {
        console.error("Failed to load custom fields:", error)
      }

      if (!cancelled) setIsLoading(false)
    }

    loadData()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!searchTerm.trim()) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      searchModels(searchTerm, 1, Math.min(100, selectedModels.length + 5), undefined, controller.signal)
        .then(result => { if (!controller.signal.aborted) setSuggestions({ query: searchTerm, items: result.items, failed: false }) })
        .catch(() => { if (!controller.signal.aborted) setSuggestions({ query: searchTerm, items: [], failed: true }) })
    }, 200)
    return () => { clearTimeout(timer); controller.abort() }
  }, [searchTerm, selectedModels])

  const isSuggesting = !!searchTerm.trim() && suggestions.query !== searchTerm
  const searchFailed = !!searchTerm.trim() && suggestions.query === searchTerm && suggestions.failed
  const searchSuggestions = (searchTerm.trim() && suggestions.query === searchTerm ? suggestions.items : []).filter(model =>
    !selectedModels.some(selected => selected.id === model.id),
  ).slice(0, 5)

  const handleThemeToggle = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem("language", lang)
    // 更新列配置以使用新语言
    setColumns(getColumnConfigs(lang))
  }

  const handleSelectModel = (model: ModelInfo) => {
    if (!selectedModels.find((m) => m.id === model.id)) {
      setSelectedModels([...selectedModels, model])
      setSearchTerm("") // 清空搜索框
    }
  }

  const handleRemoveModel = (modelId: string) => {
    setSelectedModels(selectedModels.filter((m) => m.id !== modelId))
  }

  const handleComplexityChange = (level: ComplexityLevel) => {
    setComplexityLevel(level)
    // 当选择custom时打开字段选择器
    if (level === "custom") {
      setShowFieldSelector(true)
    }
  }

  const handleCustomFieldsSave = (selectedKeys: string[]) => {
    setCustomFields(selectedKeys)
    COMPLEXITY_PRESETS.custom.columns = selectedKeys
    localStorage.setItem("customFields", JSON.stringify(selectedKeys))
  }

  const t = getTranslations(language)

  const tLocal = useMemo(() => {
    return language === "zh"
      ? {
          modelsTotal: (count: number) => `共 ${count} 个模型`,
          searchModels: "搜索模型...",
          complexityLabel: "复杂度:",
          simple: "简单",
          enthusiast: "爱好者",
          developer: "开发者",
          custom: "自定义",
          compareMode: "对比模式",
          noResults: "没有找到匹配的模型",
        }
      : {
          modelsTotal: (count: number) => `${count} models in total`,
          searchModels: "Search models...",
          complexityLabel: "Complexity:",
          simple: "Simple",
          enthusiast: "Enthusiast",
          developer: "Developer",
          custom: "Custom",
          compareMode: "Compare Mode",
          noResults: "No matching models found",
        }
  }, [language])

  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-muted-foreground">{t.common.loading}</p>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <h1 className="text-2xl font-bold">{t.nav.title}</h1>
            </Link>
            <span className="text-sm text-muted-foreground">{tLocal.compareMode}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} onToggle={handleThemeToggle} />
            <LanguageToggle
              currentLanguage={language}
              onLanguageChange={handleLanguageChange}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container pt-6 pb-2 space-y-4">
        {(loadError || searchFailed) && <p role="alert" className="text-sm text-destructive">
          {language === "zh" ? "模型查询失败，请稍后重试。" : "Model search failed. Please try again."}
        </p>}
        {/* Search and Controls - 与主页一致 */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Left: Search box with suggestions */}
          <div className="relative flex-1 sm:flex-none sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={tLocal.searchModels}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            {isSuggesting && <div role="status" className="absolute top-full left-0 right-0 mt-1 rounded-md border bg-background p-3 text-sm text-muted-foreground">
              {t.common.loading}
            </div>}
            {/* Search Suggestions Dropdown */}
            {searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 overflow-hidden">
                {searchSuggestions.map((model) => (
                  <div
                    key={model.id}
                    className="px-4 py-2 hover:bg-muted cursor-pointer flex justify-between items-center"
                    onClick={() => handleSelectModel(model)}
                  >
                    <div>
                      <span className="font-medium">{model.name}</span>
                      <span className="text-muted-foreground text-sm ml-2">
                        {translateProvider(model.provider, language)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {searchTerm.trim() && !isSuggesting && !loadError && !searchFailed && searchSuggestions.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 p-4 text-center text-muted-foreground text-sm">
                {tLocal.noResults}
              </div>
            )}
          </div>

          {/* Center: Model count */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {tLocal.modelsTotal(totalCount)}
            </span>
          </div>

          {/* Right: Complexity toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{tLocal.complexityLabel}</span>
            <ToggleGroup
              type="single"
              value={complexityLevel}
              onValueChange={(value) => {
                if (value) {
                  handleComplexityChange(value as ComplexityLevel)
                }
              }}
            >
              <ToggleGroupItem value="simple" aria-label={tLocal.simple}>
                {tLocal.simple}
              </ToggleGroupItem>
              <ToggleGroupItem value="enthusiast" aria-label={tLocal.enthusiast}>
                {tLocal.enthusiast}
              </ToggleGroupItem>
              <ToggleGroupItem value="developer" aria-label={tLocal.developer}>
                {tLocal.developer}
              </ToggleGroupItem>
              <ToggleGroupItem
                value="custom"
                aria-label={tLocal.custom}
                onClick={() => {
                  if (complexityLevel === "custom") {
                    setShowFieldSelector(true)
                  }
                }}
              >
                {tLocal.custom}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Selected Models Tags */}
        {selectedModels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedModels.map((model) => (
              <div
                key={model.id}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
              >
                <span>{model.name}</span>
                <button
                  onClick={() => handleRemoveModel(model.id)}
                  className="hover:bg-primary/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Comparison Table */}
        {selectedModels.length >= 2 && (
          <EnhancedComparisonTable
            models={selectedModels}
            columns={columns}
            onRemoveModel={handleRemoveModel}
            complexity={complexityLevel}
            language={language}
          />
        )}

        {/* Empty States */}
        {selectedModels.length < 2 && (
          <div className="rounded-lg border-2 border-dashed p-12 text-center">
            <p className="text-muted-foreground">
              {selectedModels.length === 0
                ? (language === "zh" ? "在搜索框中输入模型名称，选择至少 2 个模型开始对比" : "Enter model name in search box, select at least 2 models to compare")
                : (language === "zh" ? "再选择至少 1 个模型继续对比" : "Select at least 1 more model to continue")}
            </p>
          </div>
        )}
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
