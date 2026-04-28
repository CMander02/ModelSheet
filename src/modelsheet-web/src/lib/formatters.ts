/**
 * Data formatting utilities for displaying model information
 */

/**
 * Format parameter count in human-readable form
 * @example formatParameters(7615616000) => "7.6B"
 */
function fmt(n: number, suffix: string): string {
  const s = n.toFixed(1)
  return (s.endsWith(".0") ? n.toFixed(0) : s) + suffix
}

export function formatParameters(value: number | undefined): string {
  if (value === undefined || value === null) return "-"

  if (value >= 1e12) return fmt(value / 1e12, "T")
  if (value >= 1e9)  return fmt(value / 1e9,  "B")
  if (value >= 1e6)  return fmt(value / 1e6,  "M")
  if (value >= 1e3)  return fmt(value / 1e3,  "K")
  return value.toLocaleString()
}

/**
 * Format context length in human-readable form
 * @example formatContextLength(131072) => "128K"
 */
export function formatContextLength(value: number | undefined): string {
  if (value === undefined || value === null) return "-"

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${Math.round(value / 1000)}K`
  }
  return value.toLocaleString()
}

/**
 * Format large numbers in K/M/B notation
 * @example formatNumber(18944) => "18.9K"
 */
export function formatNumber(value: number | undefined): string {
  if (value === undefined || value === null) return "-"

  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`
  }
  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`
  }
  if (value >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`
  }
  return value.toLocaleString()
}

/**
 * Format decimal numbers with precision
 * @example formatDecimal(5.286) => "5.29"
 */
export function formatDecimal(value: number | undefined, precision: number = 2): string {
  if (value === undefined || value === null) return "-"
  return value.toFixed(precision)
}

/**
 * Format boolean value
 * @example formatBoolean(true) => "✓"
 */
export function formatBoolean(value: boolean | undefined): string {
  if (value === undefined || value === null) return "-"
  return value ? "✓" : "✗"
}

/**
 * Format array values
 * @example formatArray(["text", "image"]) => "text, image"
 */
export function formatArray(value: string[] | undefined): string {
  if (!value || !Array.isArray(value) || value.length === 0) return "-"
  return value.join(", ")
}

/**
 * Format date string
 * @example formatDate("2024-12-07T10:30:00Z") => "2024/12/07"
 */
export function formatDate(value: string | undefined, locale: string = "zh-CN"): string {
  if (!value) return "-"

  try {
    const date = new Date(value)
    return date.toLocaleDateString(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  } catch {
    return value
  }
}

/**
 * Generic formatter that automatically detects type
 */
export function formatValue(value: any, type: string, key?: string): string {
  if (value === null || value === undefined) return "-"

  switch (type) {
    case "number":
      // Special handling for specific fields
      if (key === "totalParameters" || key === "activeParameters") {
        return formatParameters(value as number)
      }
      if (key === "contextLength") {
        return formatContextLength(value as number)
      }
      if (key === "mlpFactor" || key === "gqaRatio" || key === "normEps") {
        return formatDecimal(value as number)
      }
      if (key === "vocabSize" || key === "embeddingDim" || key === "hiddenSize" ||
          key === "intermediateSize" || key === "numLayers" || key === "numHeads" ||
          key === "numKvHeads" || key === "numExperts" || key === "numExpertsPerToken") {
        return formatNumber(value as number)
      }
      return value.toLocaleString()

    case "boolean":
      return formatBoolean(value as boolean)

    case "array":
      return formatArray(value as string[])

    case "date":
      return formatDate(value as string)

    default:
      return String(value)
  }
}

/**
 * Get color class for highlighting max/min values
 */
export function getHighlightClass(
  value: number | undefined,
  allValues: (number | undefined)[],
  higherIsBetter: boolean = true
): string {
  if (value === undefined || value === null) return ""

  const validValues = allValues.filter(v => v !== undefined && v !== null) as number[]
  if (validValues.length <= 1) return ""

  const max = Math.max(...validValues)
  const min = Math.min(...validValues)

  if (higherIsBetter) {
    if (value === max) return "bg-green-100 dark:bg-[#14532d] font-semibold"
    if (value === min) return "bg-red-100 dark:bg-[#881337]"
  } else {
    if (value === min) return "bg-green-100 dark:bg-[#14532d] font-semibold"
    if (value === max) return "bg-red-100 dark:bg-[#881337]"
  }

  return ""
}
