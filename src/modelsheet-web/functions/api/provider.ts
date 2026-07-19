import {
  jsonResponse,
  loadStaticModels,
  modelFromRow,
  providerFromRow,
  type FunctionEnv,
} from "../_utils"

function providerSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "provider"
}

export async function onRequest(context: {
  request: Request
  env: FunctionEnv
}): Promise<Response> {
  const { request, env } = context
  const url = new URL(request.url)
  const slug = url.searchParams.get("slug") ?? url.searchParams.get("id")
  if (!slug) return jsonResponse({ error: "Missing slug" }, { status: 400 })

  try {
    if (env.DB) {
      const provider = await env.DB
        .prepare(
          `
          SELECT
            p.*,
            COUNT(m.id) AS model_count,
            COUNT(DISTINCT m.architecture) AS arch_count,
            MAX(m.released_at) AS latest_released_at
          FROM providers p
          LEFT JOIN models m ON m.provider_id = p.id
          WHERE p.id = ? OR lower(p.display_name) = lower(?) OR lower(p.display_name) LIKE lower(?)
          GROUP BY p.id
          `,
        )
        .bind(slug, slug, slug.replace(/-/g, " "))
        .first<Record<string, unknown>>()
      if (!provider) return jsonResponse({ error: "Provider not found" }, { status: 404 })

      const modelRows = await env.DB
        .prepare(
          `
          SELECT raw_json
          FROM models
          WHERE provider_id = ?
          ORDER BY released_at IS NULL, released_at DESC, name ASC
          `,
        )
        .bind(slug)
        .all<Record<string, unknown>>()

      return jsonResponse({
        provider: providerFromRow(provider),
        models: (modelRows.results ?? []).map(modelFromRow),
      })
    }

    const models = await loadStaticModels(env, url)
    const providerName = [...new Set(models.map((m) => String(m.provider ?? "")))]
      .find((name) => providerSlug(name) === slug)
    if (!providerName) return jsonResponse({ error: "Provider not found" }, { status: 404 })
    const providerModels = models.filter((model) => model.provider === providerName)
    return jsonResponse({
      provider: {
        id: slug,
        name: providerName,
        displayName: providerName,
        modelCount: providerModels.length,
        archCount: new Set(providerModels.map((model) => model.architecture)).size,
        latestReleasedAt: providerModels
          .map((model) => model.releasedAt)
          .filter((value): value is string => typeof value === "string")
          .sort()
          .reverse()[0] ?? null,
      },
      models: providerModels,
    })
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
