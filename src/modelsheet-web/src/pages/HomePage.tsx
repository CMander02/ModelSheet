import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import type { ModelInfo, ColumnConfig, ComplexityLevel } from "@/lib/types"
import type { Language } from "@/lib/i18n"
import {
  loadModelsFromFile,
  loadColumnConfigFromStorage,
  saveColumnConfigToStorage,
  getColumnConfigs,
} from "@/lib/model-data"
import { getTranslations } from "@/lib/i18n"
import { ModelTable } from "@/components/model-table"
import { CustomFieldSelector } from "@/components/custom-field-selector"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { Button } from "@/components/ui/button"
import { COMPLEXITY_PRESETS } from "@/lib/model-data"

export function HomePage() {
  const navigate = useNavigate()
  const [models, setModels] = useState<ModelInfo[]>([])
  const [columns, setColumns] = useState<ColumnConfig[]>([])
  const [complexityLevel, setComplexityLevel] =
    useState<ComplexityLevel>("enthusiast")
  const [isLoading, setIsLoading] = useState(true)
  const [language, setLanguage] = useState<Language>("zh")
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set())
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

      // 使用真实数据,如果加载失败则显示空列表
      setModels(loadedModels)

      // 使用当前语言的列配置
      const currentColumns = getColumnConfigs(savedLanguage)
      if (loadedColumns.length === 0) {
        setColumns(currentColumns)
        saveColumnConfigToStorage(currentColumns)
      } else {
        setColumns(loadedColumns)
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

  const handleColumnChange = (newColumns: ColumnConfig[]) => {
    setColumns(newColumns)
    saveColumnConfigToStorage(newColumns)
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
    // 更新custom预设
    COMPLEXITY_PRESETS.custom.columns = selectedKeys
    // 保存到localStorage
    localStorage.setItem("customFields", JSON.stringify(selectedKeys))
  }

  // 加载自定义字段配置
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
      // Store selected model IDs in sessionStorage
      sessionStorage.setItem("selectedModelIds", JSON.stringify(Array.from(selectedModels)))
      navigate("/compare")
    }
  }

  const t = getTranslations(language)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header Skeleton */}
        <header className="sticky top-0 z-50 w-full border-b bg-background">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-8 w-48 bg-muted animate-pulse rounded" />
              <div className="h-5 w-16 bg-muted animate-pulse rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-24 bg-muted animate-pulse rounded" />
              <div className="h-10 w-10 bg-muted animate-pulse rounded" />
              <div className="h-10 w-10 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </header>

        {/* Content Skeleton */}
        <main className="container py-8">
          <div className="space-y-4">
            {/* Search and Controls Skeleton */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="h-10 w-full sm:w-96 bg-muted animate-pulse rounded" />
              <div className="h-10 w-full sm:w-80 bg-muted animate-pulse rounded" />
            </div>

            {/* Table Skeleton */}
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{t.nav.title}</h1>
            <span className="text-sm text-muted-foreground">{t.nav.version}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/compare">
              <Button variant="outline">{t.nav.compareModels}</Button>
            </Link>
            <ThemeToggle theme={theme} onToggle={handleThemeToggle} />
            <LanguageToggle
              currentLanguage={language}
              onLanguageChange={handleLanguageChange}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container pt-6 pb-2">
        <ModelTable
          models={models}
          columns={columns}
          onColumnChange={handleColumnChange}
          onComplexityChange={handleComplexityChange}
          currentComplexity={complexityLevel}
          language={language}
          selectedModels={selectedModels}
          onModelSelect={handleModelSelect}
          onClearSelection={() => setSelectedModels(new Set())}
          onCompare={handleCompare}
        />
      </main>

      {/* Footer */}
      <footer className="py-2">
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
