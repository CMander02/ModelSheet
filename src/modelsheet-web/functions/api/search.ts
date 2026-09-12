import {
  readDatabase,
  jsonResponse,
  loadStaticModels,
  modelFromRow,
  type FunctionEnv,
} from "../_utils.js"

interface SearchResponse {
  items: Record<string, unknown>[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const SORT_COLUMNS: Record<string, string> = {
  name: "lower(m.name)",
  provider: "lower(m.provider)",
  totalParameters: "m.total_parameters",
  activeParameters: "m.active_parameters",
  contextLength: "m.context_length",
  architecture: "lower(m.architecture)",
  isMoe: "m.is_moe",
  numLayers: "m.num_layers",
  numHeads: "m.num_heads",
  numKvHeads: "m.num_kv_heads",
  hiddenSize: "m.hidden_size",
  intermediateSize: "m.intermediate_size",
  numExperts: "m.num_experts",
  embeddingDim: "m.embedding_dim",
  vocabSize: "m.vocab_size",
  positionEncoding: "lower(m.position_encoding)",
  activation: "lower(m.activation)",
  normType: "lower(m.norm_type)",
  normEps: "m.norm_eps",
  attentionDropout: "m.attention_dropout",
  mlpFactor: "m.mlp_factor",
  gqaRatio: "m.gqa_ratio",
  numSharedExperts: "m.num_shared_experts",
  numExpertsPerToken: "m.num_experts_per_token",
  numActivatedExperts: "m.num_activated_experts",
  moeIntermediateSize: "CAST(m.moe_intermediate_size_json AS REAL)",
  task: "lower(m.task)",
  openness: "lower(m.openness)",
  releasedAt: "m.released_at",
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
  const db = readDatabase(env)
  const url = new URL(request.url)
  const q = url.searchParams.get("q") ?? ""
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "30", 10) || 30))
  const offset = (page - 1) * limit
  const sortKey = url.searchParams.get("sort") ?? "releasedAt"
  const sortDirection = url.searchParams.get("dir") === "asc" ? "asc" : "desc"

  try {
    if (db) {
      const query = q.toLowerCase().trim()
      // Provider aliases are resolved once per query instead of joining every model row.
      // instr preserves literal substring search for names containing '%' or '_'.
      const where = query
        ? `WHERE instr(lower(m.name), ?) > 0
            OR instr(lower(m.provider), ?) > 0
            OR instr(lower(m.id), ?) > 0
            OR m.provider_id IN (
              SELECT id FROM providers
              WHERE instr(lower(COALESCE(name_en, '')), ?) > 0
                 OR instr(lower(COALESCE(name_zh, '')), ?) > 0
                 OR instr(lower(COALESCE(orgs_json, '')), ?) > 0
            )`
        : ""
      const params = query ? Array(6).fill(query) : []
      const sortColumn = SORT_COLUMNS[sortKey] ?? SORT_COLUMNS.releasedAt
      const sqlDirection = sortDirection === "asc" ? "ASC" : "DESC"

      const [count, rows] = await db.batch([
        db.prepare(`
          SELECT COUNT(*) AS total
          FROM models m
          ${where}
        `)
        .bind(...params),
        db.prepare(
          `
          SELECT m.raw_json
          FROM models m
          ${where}
          ORDER BY ${sortColumn} IS NULL, ${sortColumn} ${sqlDirection}, m.name ASC, m.id ASC
          LIMIT ? OFFSET ?
          `,
        )
        .bind(...params, limit, offset),
      ])

      const total = Number(count.results?.[0]?.total ?? 0)
      const body: SearchResponse = {
        items: (rows.results ?? []).map(modelFromRow),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
      return jsonResponse(body, { headers: {
        "Server-Timing": `d1;dur=${((count.meta?.duration ?? 0) + (rows.meta?.duration ?? 0)).toFixed(1)}`,
      } })
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
