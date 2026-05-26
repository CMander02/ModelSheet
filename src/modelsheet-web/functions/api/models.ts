import {
  jsonResponse,
  loadStaticModels,
  modelFromRow,
  type FunctionEnv,
} from "../_utils"

export async function onRequest(context: {
  request: Request
  env: FunctionEnv
}): Promise<Response> {
  const { request, env } = context
  const url = new URL(request.url)
  const ids = (url.searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)

  try {
    if (env.DB) {
      const where = ids.length ? `WHERE id IN (${ids.map(() => "?").join(",")})` : ""
      const rows = await env.DB
        .prepare(
          `
          SELECT raw_json
          FROM models
          ${where}
          ORDER BY created_at IS NULL, created_at DESC, name ASC
          `,
        )
        .bind(...ids)
        .all<Record<string, unknown>>()
      return jsonResponse((rows.results ?? []).map(modelFromRow))
    }

    const models = await loadStaticModels(env, url)
    if (!ids.length) return jsonResponse(models)
    const wanted = new Set(ids)
    return jsonResponse(models.filter((model) => wanted.has(String(model.id))))
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
