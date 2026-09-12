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
  const { env } = context
  const db = readDatabase(env)
  if (!db) return jsonResponse([])
  const summary = new URL(context.request.url).searchParams.get("view") === "summary"

  try {
    const rowsPromise = db
      .prepare(
        `
        SELECT id, family, era, type, norm_placement, description_zh, description_en,
               paper_url, hf_org${summary ? "" : `, default_params_json, source_links_json,
               variants_json, evidence_json, features_json, diagram_subtitle, diagram_nodes_json`}
        FROM architectures
        ORDER BY era, family
        `,
      )
      .all<Record<string, unknown>>()
    const [rows, aliases] = await Promise.all([rowsPromise, architectureAliases(db)])
    return jsonResponse(
      (rows.results ?? []).map((row) =>
        architectureFromRow(row, aliases.get(String(row.id)) ?? []),
      ),
    )
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
