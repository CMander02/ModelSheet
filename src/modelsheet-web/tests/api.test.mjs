import assert from "node:assert/strict"
import { test } from "node:test"
import { DatabaseSync } from "node:sqlite"
import { readFileSync, readdirSync } from "node:fs"
import { onRequest as search } from "../node_modules/.tmp/api-tests/functions/api/search.js"
import { onRequest as models } from "../node_modules/.tmp/api-tests/functions/api/models.js"
import { onRequest as provider } from "../node_modules/.tmp/api-tests/functions/api/provider.js"
import { onRequest as architectures } from "../node_modules/.tmp/api-tests/functions/api/architectures.js"
import { onRequest as architecture } from "../node_modules/.tmp/api-tests/functions/api/architecture.js"
import { onRequest as middleware, cacheKey } from "../node_modules/.tmp/api-tests/functions/api/_middleware.js"
import { cachedJson } from "../node_modules/.tmp/api-tests/src/lib/api-cache.js"

const sqlite = new DatabaseSync(":memory:")
const migrations = new URL("../migrations/", import.meta.url)
for (const file of readdirSync(migrations).filter(file => file.endsWith(".sql")).sort()) {
  sqlite.exec(readFileSync(new URL(file, migrations), "utf8"))
}
sqlite.exec(readFileSync(new URL("../../../data/d1/seed.sql", import.meta.url), "utf8"))
const corpus = sqlite.prepare(`SELECT m.raw_json, m.name, m.provider, m.id, p.name_en, p.name_zh, p.orgs_json
  FROM models m LEFT JOIN providers p ON p.id = m.provider_id`).all()

function database() {
  const calls = { batch: 0, sessions: [], sql: [] }
  const db = {
    prepare(sql) {
      const statement = {
        params: [],
        bind(...params) { this.params = params; return this },
        async all() {
          calls.sql.push({ sql, params: this.params })
          return { results: sqlite.prepare(sql).all(...this.params), meta: { duration: 1 } }
        },
        async first() { return (await this.all()).results[0] ?? null },
      }
      return statement
    },
    async batch(statements) {
      calls.batch++
      return Promise.all(statements.map(statement => statement.all()))
    },
    withSession(constraint) { calls.sessions.push(constraint); return this },
  }
  return { db, calls }
}

const request = (path) => new Request(`http://localhost${path}`)
async function invoke(handler, path) {
  const { db, calls } = database()
  const response = await handler({ request: request(path), env: { DB: db } })
  assert.equal(response.status, 200, await response.clone().text())
  return { body: await response.json(), response, calls }
}
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0
function sortReference(items, key, dir) {
  return items.slice().sort((a, b) => {
    const av = typeof a[key] === "string" ? a[key].toLowerCase() : a[key]
    const bv = typeof b[key] === "string" ? b[key].toLowerCase() : b[key]
    const tie = () => compare(a.name, b.name) || compare(a.id, b.id)
    if (av == null && bv == null) return tie()
    if (av == null) return 1
    if (bv == null) return -1
    return compare(av, bv) * (dir === "asc" ? 1 : -1) || tie()
  })
}

test("search preserves literal, bilingual and provider alias matching", async () => {
  for (const q of ["", "Qwen", "通义千问", "meta-llama", "DeepSeek", "_", "%", "no-such-model-xyz"]) {
    const expected = corpus.filter(row => [row.name, row.provider, row.id, row.name_en, row.name_zh, row.orgs_json]
      .some(value => String(value ?? "").toLowerCase().includes(q.toLowerCase())))
      .map(row => JSON.parse(row.raw_json))
    const { body, calls } = await invoke(search, `/api/search?${new URLSearchParams({ q })}`)
    assert.equal(body.total, expected.length, q)
    assert.deepEqual(body.items.map(m => m.id), sortReference(expected, "releasedAt", "desc").slice(0, 30).map(m => m.id), q)
    assert.equal(calls.batch, 1)
    assert.deepEqual(calls.sessions, ["first-unconstrained"])
  }
})

test("sorting and page boundaries agree with catalog facts, including missing values", async () => {
  const all = corpus.map(row => JSON.parse(row.raw_json))
  for (const key of ["releasedAt", "name", "totalParameters", "activeParameters", "contextLength", "numHeads", "embeddingDim", "normEps", "openness"]) {
    for (const dir of ["asc", "desc"]) {
      const expected = sortReference(all, key, dir)
      for (const page of [1, 2, Math.ceil(all.length / 30)]) {
        const { body } = await invoke(search, `/api/search?sort=${key}&dir=${dir}&page=${page}`)
        assert.deepEqual(body.items.map(m => m.id), expected.slice((page - 1) * 30, page * 30).map(m => m.id), `${key} ${dir} page ${page}`)
      }
    }
  }
})

test("default browse and parameter sort use indexes without a temporary sort", async () => {
  for (const sort of ["releasedAt", "totalParameters"]) {
    const { calls } = await invoke(search, `/api/search?sort=${sort}`)
    const { sql, params } = calls.sql.find(call => call.sql.includes("m.raw_json"))
    const plan = sqlite.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...params).map(row => row.detail).join("\n")
    assert.match(plan, /USING INDEX idx_models_browse_/)
    assert.doesNotMatch(plan, /TEMP B-TREE/)
  }
})

test("bounded requests preserve selected model details and architecture aliases", async () => {
  const ids = corpus.slice(0, 2).map(row => row.id)
  const selected = await invoke(models, `/api/models?${new URLSearchParams({ ids: ids.join(",") })}`)
  assert.deepEqual(selected.body.map(m => m.id).sort(), ids.sort())
  for (const item of selected.body) assert.deepEqual(item, JSON.parse(corpus.find(row => row.id === item.id).raw_json))

  for (const id of ["qwen2", "qwen2_moe", "QWEN2", "deepseek_v3", "unknown-architecture"]) {
    const canonical = sqlite.prepare("SELECT architecture_id FROM architecture_aliases WHERE alias = ?").get(id.toLowerCase())?.architecture_id ?? id.toLowerCase()
    const aliases = new Set([canonical, ...sqlite.prepare("SELECT alias FROM architecture_aliases WHERE architecture_id = ?").all(canonical).map(row => row.alias)])
    const expected = corpus.map(row => JSON.parse(row.raw_json)).filter(m => aliases.has(m.architecture?.toLowerCase())).map(m => m.id).sort()
    const { body } = await invoke(models, `/api/models?architecture=${id}`)
    assert.deepEqual(body.map(m => m.id).sort(), expected)
  }
  const response = await models({ request: request(`/api/models?ids=${Array.from({ length: 81 }, (_, i) => i).join(",")}`), env: {} })
  assert.equal(response.status, 400)
})

test("architecture navigation summaries omit diagrams; detail alias resolution stays intact", async () => {
  const full = await invoke(architectures, "/api/architectures")
  const summary = await invoke(architectures, "/api/architectures?view=summary")
  assert.deepEqual(summary.body.map(a => [a.id, a.family, a.modelTypeAliases]), full.body.map(a => [a.id, a.family, a.modelTypeAliases]))
  assert.ok(summary.body.every(a => a.diagramNodes.length === 0))
  assert.ok(JSON.stringify(summary.body).length < JSON.stringify(full.body).length / 2)
  const alias = sqlite.prepare("SELECT alias, architecture_id FROM architecture_aliases WHERE alias <> architecture_id LIMIT 1").get()
  const detail = await invoke(architecture, `/api/architecture?id=${alias.alias}`)
  assert.equal(detail.body.id, alias.architecture_id)
  assert.ok(detail.body.diagramNodes.length > 0)
})

test("provider name lookup returns the models for the resolved provider ID", async () => {
  const p = sqlite.prepare("SELECT p.id, p.display_name FROM providers p JOIN models m ON m.provider_id = p.id WHERE p.id <> p.display_name GROUP BY p.id LIMIT 1").get()
  const { body } = await invoke(provider, `/api/provider?${new URLSearchParams({ slug: p.display_name })}`)
  const expected = sqlite.prepare("SELECT COUNT(*) AS total FROM models WHERE provider_id = ?").get(p.id).total
  assert.equal(body.models.length, expected)
  const cards = await invoke(provider, `/api/provider?${new URLSearchParams({ slug: p.display_name, view: "cards" })}`)
  assert.equal(cards.body.models.length, expected)
  for (const card of cards.body.models) {
    const full = body.models.find(model => model.id === card.id)
    for (const key of ["name", "provider", "totalParameters", "activeParameters", "contextLength", "architecture", "isMoe", "inputModalities", "outputModalities", "releasedAt"]) {
      assert.deepEqual(card[key] ?? null, full[key] ?? null, `${card.id}: ${key}`)
    }
  }
  assert.ok(JSON.stringify(cards.body).length < JSON.stringify(body).length / 2)
})

test("API failures remain errors and static search still works", async () => {
  const failed = await search({ request: request("/api/search"), env: { DB: { batch() { throw new Error("database unavailable") }, prepare() { return { bind() {} } } } } })
  assert.equal(failed.status, 500)
  const staticModels = corpus.slice(0, 4).map(row => JSON.parse(row.raw_json))
  const response = await search({ request: request("/api/search?limit=2"), env: { ASSETS: { fetch: async () => Response.json(staticModels) } } })
  const body = await response.json()
  assert.equal(body.total, 4)
  assert.equal(body.items.length, 2)
})

test("edge cache reuses equivalent URLs and never stores errors or non-GET responses", async () => {
  const saved = new Map()
  const originalCaches = globalThis.caches
  const pending = []
  let calls = 0
  globalThis.caches = { default: {
    async match(key) { return saved.get(key.url)?.clone() },
    async put(key, value) { saved.set(key.url, value) },
  } }
  const invokeCache = (url, status = 200, method = "GET") => middleware({
    request: new Request(`http://localhost${url}`, { method }), env: {},
    next: async () => { calls++; return Response.json({ calls }, { status }) },
    waitUntil: promise => pending.push(promise),
  })
  try {
    const first = await invokeCache("/api/search?q=%20Qwen%20&limit=30")
    await Promise.all(pending)
    const hit = await invokeCache("/api/search?limit=30&q=qwen")
    assert.equal(calls, 1)
    assert.equal(first.headers.get("X-ModelSheet-Cache"), "MISS")
    assert.equal(hit.headers.get("X-ModelSheet-Cache"), "HIT")
    assert.match(hit.headers.get("Cache-Control"), /s-maxage=300/)
    assert.equal(cacheKey(request("/api/models?architecture=qwen2")).url, "http://localhost/api/models?architecture=qwen2")
    const error = await invokeCache("/api/model?id=missing", 404)
    assert.equal(error.headers.get("Cache-Control"), "no-store")
    await invokeCache("/api/model?id=missing", 404)
    assert.equal(calls, 3)
    await invokeCache("/api/search?q=qwen&limit=30", 200, "POST")
    assert.equal(calls, 4)
  } finally { globalThis.caches = originalCaches }
})

test("client cache deduplicates requests, expires, and supports cancellation", async () => {
  const originalFetch = globalThis.fetch
  const originalNow = Date.now
  let now = originalNow()
  let calls = 0
  Date.now = () => now
  globalThis.fetch = async () => { calls++; return Response.json({ calls }) }
  try {
    const url = "/api/test-cache"
    assert.deepEqual(await Promise.all([cachedJson(url), cachedJson(url)]), [{ calls: 1 }, { calls: 1 }])
    assert.deepEqual(await cachedJson(url), { calls: 1 })
    now += 60_001
    assert.deepEqual(await cachedJson(url), { calls: 2 })
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(cachedJson(url, controller.signal))
    assert.equal(calls, 2)
    globalThis.fetch = async () => new Response("error", { status: 500 })
    await assert.rejects(cachedJson("/api/fail"), /500/)
    globalThis.fetch = async () => Response.json({ recovered: true })
    assert.deepEqual(await cachedJson("/api/fail"), { recovered: true })
  } finally { globalThis.fetch = originalFetch; Date.now = originalNow }
})
