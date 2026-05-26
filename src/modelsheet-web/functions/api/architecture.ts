import {
  architectureAliases,
  architectureFromRow,
  jsonResponse,
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
  if (!env.DB) return jsonResponse({ error: "D1 database is not configured" }, { status: 503 })

  try {
    const row = await env.DB
      .prepare(
        `
        SELECT a.*
        FROM architectures a
        LEFT JOIN architecture_aliases aa ON aa.architecture_id = a.id
        WHERE a.id = ? OR aa.alias = lower(?)
        LIMIT 1
        `,
      )
      .bind(id, id)
      .first<Record<string, unknown>>()
    if (!row) return jsonResponse({ error: "Architecture not found" }, { status: 404 })

    const aliases = await architectureAliases(env.DB, [String(row.id)])
    return jsonResponse(architectureFromRow(row, aliases.get(String(row.id)) ?? []))
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
