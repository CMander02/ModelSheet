"use client"

import { useState } from "react"
import type { ModelInfo } from "@/lib/types"
import type { Language } from "@/lib/i18n"
import { getTranslations } from "@/lib/i18n"

interface ModelSelectorProps {
  models: ModelInfo[]
  selectedModels: ModelInfo[]
  onSelectModel: (model: ModelInfo) => void
  language?: Language
}

export function ModelSelector({ models, selectedModels, onSelectModel, language = "zh" }: ModelSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const t = getTranslations(language)

  const filteredModels = models.filter(
    (model) =>
      model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.provider?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.baseModel?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const isSelected = (modelId: string) => selectedModels.some((m) => m.id === modelId)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <input
        type="text"
        placeholder={t.common.search}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mdc-text-field"
        style={{ width: "100%" }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "0.75rem",
          maxHeight: "384px",
          overflowY: "auto",
        }}
      >
        {filteredModels.map((model) => (
          <button
            key={model.id}
            onClick={() => onSelectModel(model)}
            style={{
              padding: "1rem",
              borderRadius: "8px",
              border: isSelected(model.id) ? "2px solid var(--primary)" : "2px solid var(--outline-variant)",
              backgroundColor: isSelected(model.id) ? "rgba(109, 40, 217, 0.05)" : "var(--surface)",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              if (!isSelected(model.id)) {
                e.currentTarget.style.borderColor = "var(--primary)"
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)"
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected(model.id)) {
                e.currentTarget.style.borderColor = "var(--outline-variant)"
                e.currentTarget.style.boxShadow = "none"
              }
            }}
          >
            <div style={{ display: "flex", alignItems: "start", gap: "0.75rem" }}>
              <input
                type="checkbox"
                checked={isSelected(model.id)}
                readOnly
                style={{ marginTop: "0.25rem", width: "1rem", height: "1rem", cursor: "pointer" }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontWeight: 600,
                    color: "var(--on-surface)",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {model.name}
                </p>
                {model.provider && (
                  <p style={{ fontSize: "0.75rem", color: "#999", margin: "0.25rem 0 0 0" }}>{model.provider}</p>
                )}
                {model.baseModel && (
                  <p style={{ fontSize: "0.75rem", color: "#999", margin: "0.25rem 0 0 0" }}>
                    {t.common.baseModel}: {model.baseModel}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {filteredModels.length === 0 && (
        <div style={{ textAlign: "center", padding: "2rem 0", color: "#999" }}>{t.common.noResults}</div>
      )}
    </div>
  )
}
