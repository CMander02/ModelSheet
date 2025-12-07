"use client"

import { useState, useMemo } from "react"
import type { ModelInfo, SortConfig, ColumnConfig, ComplexityLevel, Language } from "@/lib/types"
import { getTranslations } from "@/lib/i18n"
import { sortModels, searchModels, formatCellValue } from "@/lib/model-utils"
import { COMPLEXITY_PRESETS } from "@/lib/model-data"
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"

interface ModelTableProps {
  models: ModelInfo[]
  columns: ColumnConfig[]
  onColumnChange: (columns: ColumnConfig[]) => void
  onComplexityChange: (level: ComplexityLevel) => void
  currentComplexity: ComplexityLevel
  language: Language
}

export function ModelTable({
  models,
  columns,
  onColumnChange,
  onComplexityChange,
  currentComplexity,
  language,
}: ModelTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "name",
    direction: "asc",
  })
  const [showColumnMenu, setShowColumnMenu] = useState(false)
  const t = getTranslations(language)

  const visibleColumns = useMemo(() => columns.filter((c) => c.visible), [columns])
  const visibleColumnKeys = useMemo(() => visibleColumns.map((c) => c.key), [visibleColumns])

  // 搜索和排序
  const filteredAndSorted = useMemo(() => {
    let result = searchModels(models, searchTerm, visibleColumnKeys)
    result = sortModels(result, sortConfig)
    return result
  }, [models, searchTerm, sortConfig, visibleColumnKeys])

  const handleSort = (columnKey: string) => {
    if (!columns.find((c) => c.key === columnKey)?.sortable) return

    setSortConfig((prev) => ({
      key: columnKey,
      direction: prev.key === columnKey && prev.direction === "asc" ? "desc" : "asc",
    }))
  }

  const toggleColumnVisibility = (columnKey: string) => {
    const updated = columns.map((col) => (col.key === columnKey ? { ...col, visible: !col.visible } : col))
    onColumnChange(updated)
  }

  const handleComplexityChange = (level: ComplexityLevel) => {
    const preset = COMPLEXITY_PRESETS[level]
    if (!preset) return

    const updated = columns.map((col) => ({
      ...col,
      visible: preset.columns.includes(col.key),
    }))
    onColumnChange(updated)
    onComplexityChange(level)
  }

  const getSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronsUpDown className="h-4 w-4 opacity-30" />
    }
    return sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* 工具栏 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* 搜索框 */}
        <div style={{ flex: 1 }}>
          <input
            type="text"
            placeholder={t.common.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mdc-text-field"
            style={{ width: "100%" }}
          />
        </div>

        {/* 复杂度选择器 */}
        <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto" }}>
          {Object.values(COMPLEXITY_PRESETS).map((preset) => {
            let label = ""
            if (preset.level === "simple") label = t.common.simple
            else if (preset.level === "enthusiast") label = t.common.enthusiast
            else if (preset.level === "developer") label = t.common.developer
            else if (preset.level === "custom") label = t.common.custom

            return (
              <button
                key={preset.level}
                onClick={() => handleComplexityChange(preset.level)}
                className="mdc-button"
                style={{
                  whiteSpace: "nowrap",
                  backgroundColor: currentComplexity === preset.level ? "var(--primary)" : "var(--surface-container)",
                  color: currentComplexity === preset.level ? "var(--on-primary)" : "var(--on-surface)",
                }}
                title={preset.description}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* 列配置按钮 */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowColumnMenu(!showColumnMenu)}
            className="mdc-button mdc-button--outlined"
            style={{ border: "1px solid var(--outline)" }}
          >
            列配置
          </button>

          {showColumnMenu && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "100%",
                marginTop: "0.5rem",
                zIndex: 50,
                width: "224px",
                borderRadius: "6px",
                border: "1px solid var(--outline)",
                backgroundColor: "var(--surface)",
                padding: "0.75rem",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.15)",
              }}
            >
              <div
                style={{
                  maxHeight: "384px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
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
                      padding: "0.5rem",
                      borderRadius: "4px",
                      transition: "background-color 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--surface-container)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent"
                    }}
                  >
                    <input type="checkbox" checked={col.visible} onChange={() => toggleColumnVisibility(col.key)} />
                    <span style={{ fontSize: "0.875rem", color: "var(--on-surface)" }}>{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 统计信息 */}
      <div style={{ fontSize: "0.875rem", color: "#999" }}>
        显示 {filteredAndSorted.length} / {models.length} 个模型
      </div>

      {/* 表格 */}
      <div
        style={{
          overflowX: "auto",
          borderRadius: "12px",
          border: "1px solid var(--outline-variant)",
          backgroundColor: "var(--surface)",
        }}
      >
        <table style={{ width: "100%" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--outline-variant)" }}>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--on-surface)",
                    cursor: col.sortable ? "pointer" : "default",
                    backgroundColor: col.sortable ? "var(--surface-container)" : "transparent",
                    transition: "background-color 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (col.sortable) e.currentTarget.style.backgroundColor = "var(--surface-container)"
                  }}
                  onMouseLeave={(e) => {
                    if (col.sortable) e.currentTarget.style.backgroundColor = "transparent"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {col.label}
                    {col.sortable && getSortIcon(col.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((model) => (
              <tr
                key={model.id}
                style={{
                  borderBottom: "1px solid var(--outline-variant)",
                  transition: "background-color 0.3s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--surface-container-low)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent"
                }}
              >
                {visibleColumns.map((col) => (
                  <td
                    key={`${model.id}-${col.key}`}
                    style={{
                      padding: "1rem",
                      fontSize: "0.875rem",
                      color: "var(--on-surface)",
                    }}
                  >
                    {formatCellValue(model[col.key], col.key, col.type)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredAndSorted.length === 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 1rem" }}>
            <p style={{ color: "#999" }}>{t.common.noResults}</p>
          </div>
        )}
      </div>
    </div>
  )
}
