import {
  readDatabase,
  architectureAliases,
  architectureFromRow,
  jsonResponse,
  type FunctionEnv,
} from "../_utils.js"

export async function onRequest(context: {
  request: Request
  env: FunctionEnv
}): Promise<Response> {
  const { request, env } = context
  const db = readDatabase(env)
  const url = new URL(request.url)
  const id = url.searchParams.get("id")
  if (!id) return jsonResponse({ error: "Missing id" }, { status: 400 })
  if (!db) return jsonResponse({ error: "D1 database is not configured" }, { status: 503 })

  try {
    const row = await db
      .prepare(
        `
        SELECT a.*
        FROM architectures a
        WHERE a.id = COALESCE(
          (SELECT architecture_id FROM architecture_aliases WHERE alias = lower(?)), lower(?)
        )
        LIMIT 1
        `,
      )
      .bind(id, id)
      .first<Record<string, unknown>>()
    if (!row) return jsonResponse({ error: "Architecture not found" }, { status: 404 })

    const aliases = await architectureAliases(db, [String(row.id)])
    return jsonResponse(architectureFromRow(row, aliases.get(String(row.id)) ?? []))
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
