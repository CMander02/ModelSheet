"use client"

import { useState } from "react"
import type { ModelInfo, ColumnConfig, ComplexityLevel } from "@/lib/types"
import type { Language } from "@/lib/i18n"
import { getTranslations } from "@/lib/i18n"
import { ModelTable } from "./model-table"
import { ModelCard } from "./model-card"

interface ClickableModelTableProps {
  models: ModelInfo[]
  columns: ColumnConfig[]
  onColumnChange: (columns: ColumnConfig[]) => void
  onComplexityChange: (level: ComplexityLevel) => void
  currentComplexity: ComplexityLevel
  language: Language
}

export function ClickableModelTable({
  models,
  columns,
  onColumnChange,
  onComplexityChange,
  currentComplexity,
  language,
}: ClickableModelTableProps) {
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null)
  const t = getTranslations(language)

  if (selectedModel) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <ModelCard model={selectedModel} onClose={() => setSelectedModel(null)} language={language} />
      </div>
    )
  }

  return (
    <div
      onClick={(e) => {
        const target = e.target as HTMLElement
        const row = target.closest("tbody tr")
        if (row) {
          const modelName = row.querySelector("td")?.textContent || ""
          const model = models.find((m) => m.name.includes(modelName.slice(0, 10)))
          if (model) setSelectedModel(model)
        }
      }}
    >
      <ModelTable
        models={models}
        columns={columns}
        onColumnChange={onColumnChange}
        onComplexityChange={onComplexityChange}
        currentComplexity={currentComplexity}
        language={language}
      />
      <div style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.75rem", color: "#999" }}>
        {t.home.clickTip}
      </div>
    </div>
  )
}
