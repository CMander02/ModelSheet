/// <reference types="@cloudflare/workers-types" />

interface ModelInfo {
  id: string
  name: string
  provider: string
  [key: string]: unknown
}

interface SearchResponse {
  items: ModelInfo[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function onRequest(context: {
  request: Request
  env: { ASSETS: { fetch: (req: Request) => Promise<Response> } }
}): Promise<Response> {
  const { request, env } = context
  const url = new URL(request.url)
  const q = url.searchParams.get("q") ?? ""
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "30", 10) || 30))

  try {
    // Load models.json from static assets (edge-cached)
    const assetUrl = new URL("/data/models.json", url.origin)
    const assetResp = await env.ASSETS.fetch(new Request(assetUrl))
    if (!assetResp.ok) {
      return new Response(JSON.stringify({ error: "Failed to load models" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }
    const models: ModelInfo[] = await assetResp.json()

    // Filter
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
    const total = filtered.length
    const start = (page - 1) * limit
    const items = filtered.slice(start, start + limit)

    const body: SearchResponse = {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }

    return new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
