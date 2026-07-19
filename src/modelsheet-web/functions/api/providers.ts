import {
  jsonResponse,
  loadStaticModels,
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

  try {
    if (env.DB) {
      const rows = await env.DB
        .prepare(
          `
          SELECT
            p.*,
            COUNT(m.id) AS model_count,
            COUNT(DISTINCT m.architecture) AS arch_count,
            MAX(m.released_at) AS latest_released_at
          FROM providers p
          LEFT JOIN models m ON m.provider_id = p.id
          GROUP BY p.id
          ORDER BY model_count DESC, p.display_name ASC
          `,
        )
        .all<Record<string, unknown>>()
      return jsonResponse((rows.results ?? []).map(providerFromRow))
    }

    const models = await loadStaticModels(env, url)
    const acc = new Map<string, { archs: Set<string>; latest: string | null; count: number }>()
    for (const model of models) {
      const provider = String(model.provider ?? "")
      if (!provider) continue
      const item = acc.get(provider) ?? { archs: new Set<string>(), latest: null, count: 0 }
      item.count += 1
      if (model.architecture) item.archs.add(String(model.architecture))
      if (typeof model.releasedAt === "string" && (!item.latest || model.releasedAt > item.latest)) {
        item.latest = model.releasedAt
      }
      acc.set(provider, item)
    }
    return jsonResponse(
      [...acc.entries()]
        .map(([name, value]) => ({
          id: providerSlug(name),
          name,
          displayName: name,
          nameEn: name,
          nameZh: name,
          region: "other",
          orgs: [],
          scan: {},
          modelCount: value.count,
          archCount: value.archs.size,
          latestReleasedAt: value.latest,
        }))
        .sort((a, b) => b.modelCount - a.modelCount),
    )
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
