"use client"

import { useState } from "react"
import type { ModelInfo, ColumnConfig, ComplexityLevel } from "@/lib/types"
import type { Language } from "@/lib/i18n"
import { getTranslations } from "@/lib/i18n"
import { COMPLEXITY_PRESETS } from "@/lib/model-data"
import { X } from "lucide-react"

interface ComparisonTableProps {
  models: ModelInfo[]
  columns: ColumnConfig[]
  onColumnChange: (columns: ColumnConfig[]) => void
  onRemoveModel: (modelId: string) => void
  complexity: ComplexityLevel
  language?: Language
}

export function ComparisonTable({
  models,
  columns,
  onColumnChange,
  onRemoveModel,
  complexity,
  language = "zh",
}: ComparisonTableProps) {
  const [showColumnConfig, setShowColumnConfig] = useState(false)
  const t = getTranslations(language)

  const preset = COMPLEXITY_PRESETS[complexity]
  const visibleColumns = columns.filter((col) => preset.columns.includes(col.key))

  const handleColumnVisibilityToggle = (columnKey: string) => {
    const newColumns = columns.map((col) => {
      if (col.key === columnKey) {
        return { ...col, visible: !col.visible }
      }
      return col
    })
    onColumnChange(newColumns)
  }

  const formatValue = (value: any, type: string) => {
    if (value === undefined || value === null) {
      return "-"
    }

    switch (type) {
      case "number":
        if (typeof value === "number") {
          if (value > 1e9) {
            return `${(value / 1e9).toFixed(1)}B`
          } else if (value > 1e6) {
            return `${(value / 1e6).toFixed(1)}M`
          }
          return value.toLocaleString()
        }
        return value.toString()
      case "array":
        if (Array.isArray(value)) {
          return value.join(", ")
        }
        return value.toString()
      case "boolean":
        return value ? "是" : "否"
      case "date":
        if (typeof value === "string") {
          return new Date(value).toLocaleDateString("zh-CN")
        }
        return value.toString()
      default:
        return value.toString()
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* 列配置按钮 */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setShowColumnConfig(!showColumnConfig)}
          className="mdc-button"
          style={{ backgroundColor: "var(--secondary)", color: "var(--on-secondary)" }}
        >
          {showColumnConfig ? "隐藏" : "显示"}列配置
        </button>
      </div>

      {/* 列配置面板 */}
      {showColumnConfig && (
        <div
          style={{
            borderRadius: "8px",
            border: "1px solid var(--outline-variant)",
            backgroundColor: "rgba(109, 40, 217, 0.05)",
            padding: "1rem",
          }}
        >
          <h3 style={{ fontWeight: 600, color: "var(--on-surface)", marginBottom: "0.75rem", margin: 0 }}>
            {t.compare.selectColumns}
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {columns.map((col) => (
              <label
                key={col.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                }}
              >
                <input type="checkbox" checked={col.visible} onChange={() => handleColumnVisibilityToggle(col.key)} />
                <span style={{ fontSize: "0.875rem", color: "var(--on-surface)" }}>{col.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 对比表格 */}
      <div
        style={{
          overflowX: "auto",
          borderRadius: "8px",
          border: "1px solid var(--outline-variant)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead style={{ backgroundColor: "var(--surface-container)" }}>
            <tr>
              <th
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 10,
                  backgroundColor: "var(--surface-container)",
                  borderRight: "1px solid var(--outline-variant)",
                  padding: "1rem",
                  textAlign: "left",
                  fontWeight: 600,
                  color: "var(--on-surface)",
                  width: "192px",
                }}
              >
                参数
              </th>
              {models.map((model) => (
                <th
                  key={model.id}
                  style={{
                    borderRight: "1px solid var(--outline-variant)",
                    padding: "1rem",
                    textAlign: "left",
                    fontWeight: 600,
                    color: "var(--on-surface)",
                    minWidth: "192px",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: "0.5rem" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, color: "var(--on-surface)", margin: 0 }}>{model.name}</p>
                      {model.provider && (
                        <p style={{ fontSize: "0.75rem", color: "#999", margin: "0.25rem 0 0 0" }}>{model.provider}</p>
                      )}
                    </div>
                    <button
                      onClick={() => onRemoveModel(model.id)}
                      style={{
                        backgroundColor: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        color: "#999",
                        transition: "color 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "var(--on-surface)"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#999"
                      }}
                      title={t.compare.removeModel}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleColumns.map((col) => (
              <tr
                key={col.key}
                style={{
                  borderBottom: "1px solid var(--outline-variant)",
                  transition: "background-color 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--surface-container-low)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                }}
              >
                <td
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 9,
                    backgroundColor: "var(--surface)",
                    borderRight: "1px solid var(--outline-variant)",
                    padding: "1rem",
                    fontWeight: 500,
                    color: "var(--on-surface)",
                  }}
                >
                  {col.label}
                </td>
                {models.map((model) => (
                  <td
                    key={`${model.id}-${col.key}`}
                    style={{
                      borderRight: "1px solid var(--outline-variant)",
                      padding: "1rem",
                      color: "var(--on-surface)",
                    }}
                  >
                    <div style={{ wordBreak: "break-word", maxWidth: "300px" }}>
                      {formatValue(model[col.key], col.type)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 对比提示 */}
      <p style={{ fontSize: "0.75rem", color: "#999", textAlign: "center" }}>
        提示: 水平滚动查看更多列，点击列配置按钮选择要显示的参数
      </p>
    </div>
  )
}
