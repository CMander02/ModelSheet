"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { ModelInfo, ColumnConfig, ComplexityLevel } from "@/lib/types"
import type { Language } from "@/lib/i18n"
import {
  loadModelsFromStorage,
  saveModelsToStorage,
  loadColumnConfigFromStorage,
  saveColumnConfigToStorage,
  DEFAULT_COLUMNS,
  SAMPLE_MODELS,
} from "@/lib/model-data"
import { getTranslations } from "@/lib/i18n"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { ComparisonTable } from "@/components/comparison-table"
import { ModelSelector } from "@/components/model-selector"

export default function ComparePage() {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [columns, setColumns] = useState<ColumnConfig[]>([])
  const [selectedModels, setSelectedModels] = useState<ModelInfo[]>([])
  const [complexityLevel, setComplexityLevel] = useState<ComplexityLevel>("enthusiast")
  const [isLoading, setIsLoading] = useState(true)
  const [language, setLanguage] = useState<Language>("zh")

  useEffect(() => {
    // 加载主题和语言
    const savedTheme = localStorage.getItem("theme") || "light"
    document.documentElement.setAttribute("data-theme", savedTheme)

    const savedLanguage = (localStorage.getItem("language") || "zh") as Language
    setLanguage(savedLanguage)

    // 加载数据
    const loadedModels = loadModelsFromStorage()
    const loadedColumns = loadColumnConfigFromStorage()

    if (loadedModels.length === 0) {
      setModels(SAMPLE_MODELS)
      saveModelsToStorage(SAMPLE_MODELS)
    } else {
      setModels(loadedModels)
    }

    if (loadedColumns.length === 0) {
      setColumns(DEFAULT_COLUMNS)
      saveColumnConfigToStorage(DEFAULT_COLUMNS)
    } else {
      setColumns(loadedColumns)
    }

    setIsLoading(false)
  }, [])

  const handleThemeToggle = () => {
    const newTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"
    document.documentElement.setAttribute("data-theme", newTheme)
    localStorage.setItem("theme", newTheme)
  }

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem("language", lang)
  }

  const handleColumnChange = (newColumns: ColumnConfig[]) => {
    setColumns(newColumns)
    saveColumnConfigToStorage(newColumns)
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

  const t = getTranslations(language)

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--surface)",
        }}
      >
        <p style={{ color: "var(--on-surface)" }}>加载中...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--surface)" }}>
      {/* 导航栏 */}
      <header className="mdc-top-app-bar">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1 }}>
          <Link href="/" style={{ textDecoration: "none", color: "var(--on-surface)" }}>
            <h1
              style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--on-surface)", margin: 0, cursor: "pointer" }}
            >
              {t.nav.title}
            </h1>
          </Link>
          <span style={{ fontSize: "0.875rem", color: "#999" }}>对比模式</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <ThemeToggle onThemeToggle={handleThemeToggle} />
          <LanguageToggle currentLanguage={language} onLanguageChange={handleLanguageChange} />
        </div>
      </header>

      {/* 主内容区域 */}
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "2rem 1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* 模型选择器 */}
          <div
            style={{
              borderRadius: "12px",
              border: "1px solid var(--outline-variant)",
              backgroundColor: "var(--surface)",
              padding: "1.5rem",
            }}
          >
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--on-surface)", margin: "0 0 1rem 0" }}>
              {t.compare.selectModels}
            </h2>
            <ModelSelector
              models={models}
              selectedModels={selectedModels}
              onSelectModel={handleSelectModel}
              language={language}
            />
          </div>

          {/* 对比表格 */}
          {selectedModels.length >= 2 && (
            <div
              style={{
                borderRadius: "12px",
                border: "1px solid var(--outline-variant)",
                backgroundColor: "var(--surface)",
                padding: "1.5rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}
              >
                <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--on-surface)", margin: 0 }}>
                  {t.compare.title} ({selectedModels.length} 个模型)
                </h2>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {["simple", "enthusiast", "developer", "custom"].map((level) => {
                    let label = ""
                    if (level === "simple") label = t.common.simple
                    else if (level === "enthusiast") label = t.common.enthusiast
                    else if (level === "developer") label = t.common.developer
                    else if (level === "custom") label = t.common.custom

                    return (
                      <button
                        key={level}
                        onClick={() => setComplexityLevel(level as ComplexityLevel)}
                        className="mdc-button"
                        style={{
                          padding: "0.375rem 0.75rem",
                          fontSize: "0.875rem",
                          backgroundColor: complexityLevel === level ? "var(--primary)" : "var(--surface-container)",
                          color: complexityLevel === level ? "var(--on-primary)" : "var(--on-surface)",
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <ComparisonTable
                models={selectedModels}
                columns={columns}
                onColumnChange={handleColumnChange}
                onRemoveModel={handleRemoveModel}
                complexity={complexityLevel}
                language={language}
              />
            </div>
          )}

          {selectedModels.length === 0 && (
            <div
              style={{
                borderRadius: "12px",
                border: "2px dashed var(--outline-variant)",
                backgroundColor: "rgba(109, 40, 217, 0.02)",
                padding: "3rem 1rem",
                textAlign: "center",
              }}
            >
              <p style={{ color: "#999" }}>选择至少 2 个模型开始对比</p>
            </div>
          )}

          {selectedModels.length === 1 && (
            <div
              style={{
                borderRadius: "12px",
                border: "2px dashed var(--outline-variant)",
                backgroundColor: "rgba(109, 40, 217, 0.02)",
                padding: "3rem 1rem",
                textAlign: "center",
              }}
            >
              <p style={{ color: "#999" }}>再选择至少 1 个模型继续对比</p>
            </div>
          )}
        </div>
      </main>

      {/* 页脚 */}
      <footer
        style={{
          borderTop: "1px solid var(--outline-variant)",
          backgroundColor: "var(--surface-container)",
          marginTop: "3rem",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "2rem 1rem" }}>
          <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#999" }}>{t.common.footer}</p>
        </div>
      </footer>
    </div>
  )
}
