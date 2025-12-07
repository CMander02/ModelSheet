"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { ModelInfo, ColumnConfig, ComplexityLevel } from "@/lib/types"
import {
  loadModelsFromStorage,
  saveModelsToStorage,
  loadColumnConfigFromStorage,
  saveColumnConfigToStorage,
  DEFAULT_COLUMNS,
  SAMPLE_MODELS,
} from "@/lib/model-data"
import { ClickableModelTable } from "@/components/clickable-model-table"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { getTranslations, type Language } from "@/lib/i18n"

export default function Home() {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [columns, setColumns] = useState<ColumnConfig[]>([])
  const [complexityLevel, setComplexityLevel] = useState<ComplexityLevel>("enthusiast")
  const [isLoading, setIsLoading] = useState(true)
  const [language, setLanguage] = useState<Language>("zh")

  useEffect(() => {
    // 加载主题
    const savedTheme = localStorage.getItem("theme") || "light"
    document.documentElement.setAttribute("data-theme", savedTheme)

    // 加载语言
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

  const handleComplexityChange = (level: ComplexityLevel) => {
    setComplexityLevel(level)
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
      <header className="mdc-top-app-bar">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1 }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--on-surface)", margin: 0 }}>{t.nav.title}</h1>
          <span style={{ fontSize: "0.875rem", color: "#999" }}>{t.nav.version}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/compare" className="mdc-button mdc-button--filled" style={{ textDecoration: "none" }}>
            {t.nav.compareModels}
          </Link>
          <ThemeToggle onThemeToggle={handleThemeToggle} />
          <LanguageToggle currentLanguage={language} onLanguageChange={handleLanguageChange} />
        </div>
      </header>

      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "2rem 1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <ClickableModelTable
            models={models}
            columns={columns}
            onColumnChange={handleColumnChange}
            onComplexityChange={handleComplexityChange}
            currentComplexity={complexityLevel}
            language={language}
          />
        </div>
      </main>

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
