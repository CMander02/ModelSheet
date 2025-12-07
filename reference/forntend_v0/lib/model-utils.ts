import type React from "react"
import type { ModelInfo, SortConfig } from "./types"

// 格式化参数量显示
export function formatParameters(params: number | undefined): string {
  if (!params) return "-"

  if (params >= 1e12) {
    return `${(params / 1e12).toFixed(2)}T`
  } else if (params >= 1e9) {
    return `${(params / 1e9).toFixed(2)}B`
  } else if (params >= 1e6) {
    return `${(params / 1e6).toFixed(2)}M`
  }
  return params.toString()
}

// 格式化日期
export function formatDate(dateString: string | undefined): string {
  if (!dateString) return "-"

  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  } catch {
    return dateString
  }
}

// 格式化上下文长度
export function formatContextLength(length: number | undefined): string {
  if (!length) return "-"

  if (length >= 1e6) {
    return `${(length / 1e6).toFixed(2)}M`
  } else if (length >= 1e3) {
    return `${(length / 1e3).toFixed(1)}K`
  }
  return length.toString()
}

// 排序模型列表
export function sortModels(models: ModelInfo[], sortConfig: SortConfig): ModelInfo[] {
  if (!sortConfig.key) return models

  const sorted = [...models].sort((a, b) => {
    const aVal = a[sortConfig.key!]
    const bVal = b[sortConfig.key!]

    if (aVal === undefined || aVal === null) return 1
    if (bVal === undefined || bVal === null) return -1

    let comparison = 0

    if (typeof aVal === "number" && typeof bVal === "number") {
      comparison = aVal - bVal
    } else if (typeof aVal === "string" && typeof bVal === "string") {
      comparison = aVal.localeCompare(bVal)
    } else {
      comparison = String(aVal).localeCompare(String(bVal))
    }

    return sortConfig.direction === "asc" ? comparison : -comparison
  })

  return sorted
}

// 搜索模型
export function searchModels(models: ModelInfo[], searchTerm: string, visibleColumns: string[]): ModelInfo[] {
  if (!searchTerm.trim()) return models

  const term = searchTerm.toLowerCase()
  return models.filter((model) => {
    // 主要搜索名称和基座模型
    if (
      model.name?.toLowerCase().includes(term) ||
      model.baseModel?.toLowerCase().includes(term) ||
      model.provider?.toLowerCase().includes(term)
    ) {
      return true
    }

    // 搜索可见列中的数据
    for (const col of visibleColumns) {
      const value = model[col]
      if (typeof value === "string" && value.toLowerCase().includes(term)) {
        return true
      }
      if (Array.isArray(value)) {
        if (value.some((v) => String(v).toLowerCase().includes(term))) {
          return true
        }
      }
    }

    return false
  })
}

// 格式化单元格内容
export function formatCellValue(value: any, columnKey: string, columnType: string): string | React.ReactNode {
  if (value === undefined || value === null) return "-"

  switch (columnType) {
    case "number":
      if (columnKey === "totalParameters") {
        return formatParameters(value)
      } else if (columnKey === "contextLength") {
        return formatContextLength(value)
      } else {
        return value.toLocaleString()
      }

    case "date":
      return formatDate(value)

    case "boolean":
      return value ? "是" : "否"

    case "array":
      if (Array.isArray(value)) {
        return value.join(", ") || "-"
      }
      return String(value)

    default:
      return String(value)
  }
}
