import {
  architectureAliases,
  architectureFromRow,
  jsonResponse,
  type FunctionEnv,
} from "../_utils"

export async function onRequest(context: {
  env: FunctionEnv
}): Promise<Response> {
  const { env } = context
  if (!env.DB) return jsonResponse([])

  try {
    const rows = await env.DB
      .prepare(
        `
        SELECT *
        FROM architectures
        ORDER BY era, family
        `,
      )
      .all<Record<string, unknown>>()
    const aliases = await architectureAliases(env.DB)
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
