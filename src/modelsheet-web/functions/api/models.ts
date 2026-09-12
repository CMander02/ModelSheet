import {
  readDatabase,
  jsonResponse,
  loadStaticModels,
  modelFromRow,
  type FunctionEnv,
} from "../_utils.js"

export async function onRequest(context: {
  request: Request
  env: FunctionEnv
}): Promise<Response> {
  const { request, env } = context
  const db = readDatabase(env)
  const url = new URL(request.url)
  const ids = (url.searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
  const architecture = url.searchParams.get("architecture")?.trim().toLowerCase()
  if (ids.length > 80) return jsonResponse({ error: "At most 80 model IDs per request" }, { status: 400 })

  try {
    if (db) {
      const conditions: string[] = []
      const params: string[] = []
      if (ids.length) {
        conditions.push(`id IN (${ids.map(() => "?").join(",")})`)
        params.push(...ids)
      }
      if (architecture) {
        conditions.push(`lower(architecture) IN (
          WITH family AS (
            SELECT COALESCE((SELECT architecture_id FROM architecture_aliases WHERE alias = ?), ?) AS id
          )
          SELECT alias FROM architecture_aliases WHERE architecture_id = (SELECT id FROM family)
          UNION SELECT id FROM family
        )`)
        params.push(architecture, architecture)
      }
      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""
      const rows = await db
        .prepare(
          `
          SELECT raw_json
          FROM models
          ${where}
          ORDER BY released_at IS NULL, released_at DESC, name ASC, id ASC
          `,
        )
        .bind(...params)
        .all<Record<string, unknown>>()
      return jsonResponse((rows.results ?? []).map(modelFromRow))
    }

    const models = await loadStaticModels(env, url)
    const wanted = new Set(ids)
    return jsonResponse(models.filter((model) =>
      (!ids.length || wanted.has(String(model.id))) &&
      (!architecture || String(model.architecture).toLowerCase() === architecture),
    ))
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
