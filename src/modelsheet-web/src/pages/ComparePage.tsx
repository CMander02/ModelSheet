import { useEffect, useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { Search, X } from "lucide-react"
import type { ModelInfo, ColumnConfig, ComplexityLevel } from "@/lib/types"
import type { Language } from "@/lib/i18n"
import {
  loadModelsFromFile,
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
  const [models, setModels] = useState<ModelInfo[]>([])
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
      const loadedModels = await loadModelsFromFile()
      const loadedColumns = loadColumnConfigFromStorage()

      // 使用真实数据
      setModels(loadedModels)

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
        if (selectedIds) {
          const ids = JSON.parse(selectedIds) as string[]
          const preSelected = loadedModels.filter((m: ModelInfo) => ids.includes(m.id))
          setSelectedModels(preSelected)
          // Clear after loading
          sessionStorage.removeItem("selectedModelIds")
        }
      } catch (error) {
        console.error("Failed to load selected models:", error)
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

      setIsLoading(false)
    }

    loadData()
  }, [])

  // 搜索建议：最多显示5个匹配的模型
  // 支持：1. 不区分大小写 2. 部分匹配 3. 搜索 id 中 / 前后的内容
  const searchSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return []
    const searchLower = searchTerm.toLowerCase()
    return models
      .filter((model) => {
        // 排除已选中的模型
        if (selectedModels.some((m) => m.id === model.id)) return false
        // 将 id 按 / 分割，分别搜索
        const idParts = model.id?.toLowerCase().split("/") || []
        const searchableText = [
          model.name?.toLowerCase(),
          model.provider?.toLowerCase(),
          translateProvider(model.provider, language).toLowerCase(),
          ...idParts
        ].filter(Boolean).join(" ")
        return searchableText.includes(searchLower)
      })
      .slice(0, 5)
  }, [models, searchTerm, selectedModels, language])

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
            {searchTerm && searchSuggestions.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 p-4 text-center text-muted-foreground text-sm">
                {tLocal.noResults}
              </div>
            )}
          </div>

          {/* Center: Model count */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {tLocal.modelsTotal(models.length)}
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
