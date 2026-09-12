import type { FunctionEnv } from "../_utils.js"

const CACHE_SECONDS = 300
const QUERY_KEYS: Record<string, string[]> = {
  "/api/search": ["q", "page", "limit", "sort", "dir"],
  "/api/models": ["ids", "architecture"],
  "/api/model": ["id"],
  "/api/providers": [],
  "/api/provider": ["slug", "id", "view"],
  "/api/architectures": ["view"],
  "/api/architecture": ["id"],
}

export function cacheKey(request: Request): Request {
  const url = new URL(request.url)
  const params = new URLSearchParams()
  for (const key of QUERY_KEYS[url.pathname] ?? []) {
    const value = url.searchParams.get(key)
    if (value !== null) params.set(key, key === "q" ? value.trim().toLowerCase() : value)
  }
  params.sort()
  url.search = params.toString()
  return new Request(url, { method: "GET" })
}

export async function onRequest(context: {
  request: Request
  env: FunctionEnv
  next: () => Promise<Response>
  waitUntil: (promise: Promise<unknown>) => void
}): Promise<Response> {
  const { request } = context
  const url = new URL(request.url)
  if (request.method !== "GET" || !QUERY_KEYS[url.pathname]) return context.next()
  const cache = (globalThis.caches as CacheStorage & { default?: Cache } | undefined)?.default
  const key = cacheKey(request)
  if (cache) {
    const cached = await cache.match(key)
    if (cached) {
      const response = new Response(cached.body, cached)
      response.headers.set("X-ModelSheet-Cache", "HIT")
      response.headers.set("Server-Timing", 'cache;desc="HIT";dur=0')
      return response
    }
  }

  const start = performance.now()
  const response = await context.next()
  const result = new Response(response.body, response)
  result.headers.append("Server-Timing", `origin;dur=${(performance.now() - start).toFixed(1)}`)
  if (result.status !== 200) {
    result.headers.set("Cache-Control", "no-store")
    return result
  }
  result.headers.set("Cache-Control", `public, max-age=60, s-maxage=${CACHE_SECONDS}`)
  result.headers.set("X-ModelSheet-Cache", cache ? "MISS" : "BYPASS")
  if (cache) {
    context.waitUntil(cache.put(key, result.clone()).catch(error => console.warn("API cache write failed", error)))
  }
  return result
}
