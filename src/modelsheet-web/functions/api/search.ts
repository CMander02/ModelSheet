import {
  jsonResponse,
  loadStaticModels,
  modelFromRow,
  type FunctionEnv,
} from "../_utils"

interface SearchResponse {
  items: Record<string, unknown>[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const SORT_COLUMNS: Record<string, string> = {
  name: "lower(name)",
  provider: "lower(provider)",
  totalParameters: "total_parameters",
  activeParameters: "active_parameters",
  contextLength: "context_length",
  architecture: "lower(architecture)",
  isMoe: "is_moe",
  numLayers: "num_layers",
  numHeads: "num_heads",
  numKvHeads: "num_kv_heads",
  hiddenSize: "hidden_size",
  intermediateSize: "intermediate_size",
  numExperts: "num_experts",
  releasedAt: "released_at",
}

function sortModels(
  models: Record<string, unknown>[],
  sortKey: string,
  sortDirection: "asc" | "desc",
): Record<string, unknown>[] {
  return [...models].sort((a, b) => {
    const aVal = a[sortKey]
    const bVal = b[sortKey]

    if (aVal == null && bVal == null) return String(a.name ?? "").localeCompare(String(b.name ?? ""))
    if (aVal == null) return 1
    if (bVal == null) return -1

    let result: number
    if (typeof aVal === "number" && typeof bVal === "number") {
      result = aVal - bVal
    } else if (sortKey === "releasedAt") {
      result = new Date(String(aVal)).getTime() - new Date(String(bVal)).getTime()
    } else {
      result = String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase())
    }

    if (result === 0) result = String(a.name ?? "").localeCompare(String(b.name ?? ""))
    return sortDirection === "asc" ? result : -result
  })
}

export async function onRequest(context: {
  request: Request
  env: FunctionEnv
}): Promise<Response> {
  const { request, env } = context
  const url = new URL(request.url)
  const q = url.searchParams.get("q") ?? ""
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "30", 10) || 30))
  const offset = (page - 1) * limit
  const sortKey = url.searchParams.get("sort") ?? "releasedAt"
  const sortDirection = url.searchParams.get("dir") === "asc" ? "asc" : "desc"

  try {
    if (env.DB) {
      const query = q.toLowerCase().trim()
      const where = query
        ? "WHERE lower(name) LIKE ? OR lower(provider) LIKE ? OR lower(id) LIKE ?"
        : ""
      const params = query ? [`%${query}%`, `%${query}%`, `%${query}%`] : []
      const sortColumn = SORT_COLUMNS[sortKey] ?? SORT_COLUMNS.releasedAt
      const sqlDirection = sortDirection === "asc" ? "ASC" : "DESC"

      const totalRow = await env.DB
        .prepare(`SELECT COUNT(*) AS total FROM models ${where}`)
        .bind(...params)
        .first<{ total: number }>()
      const rows = await env.DB
        .prepare(
          `
          SELECT raw_json
          FROM models
          ${where}
          ORDER BY ${sortColumn} IS NULL, ${sortColumn} ${sqlDirection}, name ASC
          LIMIT ? OFFSET ?
          `,
        )
        .bind(...params, limit, offset)
        .all<Record<string, unknown>>()

      const total = Number(totalRow?.total ?? 0)
      const body: SearchResponse = {
        items: (rows.results ?? []).map(modelFromRow),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
      return jsonResponse(body)
    }

    const models = await loadStaticModels(env, url)
    const query = q.toLowerCase().trim()
    const filtered = query
      ? models.filter((m) => {
          const searchable = [m.name, m.provider, m.id]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
          return searchable.includes(query)
        })
      : models

    // Paginate
    const sorted = sortModels(filtered, SORT_COLUMNS[sortKey] ? sortKey : "releasedAt", sortDirection)
    const total = sorted.length
    const start = offset
    const items = sorted.slice(start, start + limit)

    const body: SearchResponse = {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }

    return jsonResponse(body)
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
