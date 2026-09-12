const TTL = 60_000
const MAX_ENTRIES = 40
const cache = new Map<string, { value: unknown; expires: number }>()
const pending = new Map<string, Promise<unknown>>()

// Short-lived results make back navigation instant while bounding tab memory and staleness.
export function cachedJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) return Promise.reject(signal.reason)
  const saved = cache.get(url)
  if (saved && saved.expires > Date.now()) return Promise.resolve(saved.value as T)
  cache.delete(url)
  if (!signal && pending.has(url)) return pending.get(url) as Promise<T>

  const request = fetch(url, { signal }).then(async response => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`)
    const value: T = await response.json()
    if (!signal?.aborted) {
      cache.delete(url)
      cache.set(url, { value, expires: Date.now() + TTL })
      if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!)
    }
    return value
  })
  if (signal) return request
  const tracked = request.finally(() => pending.delete(url))
  pending.set(url, tracked)
  return tracked
}
