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
  const id = url.searchParams.get("id")
  if (!id) return jsonResponse({ error: "Missing id" }, { status: 400 })

  try {
    if (env.DB) {
      const row = await env.DB
        .prepare("SELECT raw_json FROM models WHERE id = ?")
        .bind(id)
        .first<Record<string, unknown>>()
      if (!row) return jsonResponse({ error: "Model not found" }, { status: 404 })
      return jsonResponse(modelFromRow(row))
    }

    const models = await loadStaticModels(env, url)
    const model = models.find((item) => item.id === id)
    if (!model) return jsonResponse({ error: "Model not found" }, { status: 404 })
    return jsonResponse(model)
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
