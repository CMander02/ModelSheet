import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import type { ModelInfo, ColumnConfig, ComplexityLevel } from "@/lib/types"
import type { Language } from "@/lib/i18n"
import {
  loadModelsFromFile,
  loadColumnConfigFromStorage,
  saveColumnConfigToStorage,
  DEFAULT_COLUMNS,
  getColumnConfigs,
} from "@/lib/model-data"
import { getTranslations } from "@/lib/i18n"
import { ModelSelector } from "@/components/model-selector"
import { EnhancedComparisonTable } from "@/components/enhanced-comparison-table"
import { CustomFieldSelector } from "@/components/custom-field-selector"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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
          const preSelected = allModels.filter(m => ids.includes(m.id))
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
    if (selectedModels.find((m) => m.id === model.id)) {
      setSelectedModels(selectedModels.filter((m) => m.id !== model.id))
    } else {
      setSelectedModels([...selectedModels, model])
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{t.common.loading}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <h1 className="text-2xl font-bold">{t.nav.title}</h1>
            </Link>
            <span className="text-sm text-muted-foreground">对比模式</span>
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
      <main className="container py-8 space-y-6">
        {/* Model Selector */}
        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">{t.compare.selectModels}</h2>
          <ModelSelector
            models={models}
            selectedModels={selectedModels}
            onSelectModel={handleSelectModel}
          />
        </div>

        {/* Comparison Table */}
        {selectedModels.length >= 2 && (
          <div className="rounded-lg border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {t.compare.title} ({selectedModels.length} 个模型)
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t.common.complexityLabel}</span>
                <ToggleGroup
                  type="single"
                  value={complexityLevel}
                  onValueChange={(value) => {
                    if (value) {
                      handleComplexityChange(value as ComplexityLevel)
                    }
                  }}
                >
                  <ToggleGroupItem value="simple" aria-label={t.common.simple}>
                    {t.common.simple}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="enthusiast" aria-label={t.common.enthusiast}>
                    {t.common.enthusiast}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="developer" aria-label={t.common.developer}>
                    {t.common.developer}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="custom" aria-label={t.common.custom}>
                    {t.common.custom}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
            <EnhancedComparisonTable
              models={selectedModels}
              columns={columns}
              onRemoveModel={handleRemoveModel}
              complexity={complexityLevel}
            />
          </div>
        )}

        {/* Empty States */}
        {selectedModels.length === 0 && (
          <div className="rounded-lg border-2 border-dashed p-12 text-center">
            <p className="text-muted-foreground">选择至少 2 个模型开始对比</p>
          </div>
        )}

        {selectedModels.length === 1 && (
          <div className="rounded-lg border-2 border-dashed p-12 text-center">
            <p className="text-muted-foreground">再选择至少 1 个模型继续对比</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-12">
        <div className="container text-center text-sm text-muted-foreground">
          {t.common.footer}
        </div>
      </footer>

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
