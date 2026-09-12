# D1 sync workflow

ModelSheet keeps `data/models.json`, `data/providers.json`, and
`data/architectures/*.yaml` as reviewable source data. The D1 database is a
compiled deployment artifact.

## Local build

```bash
uv run modelsheet db build
uv run modelsheet db seed
uv run modelsheet db verify
```

This writes:

- `data/modelsheet.sqlite`: local generated SQLite database, ignored by git.
- `data/d1/seed.sql`: idempotent D1 seed SQL, intended for review/deploy.

## Local D1 smoke

From `src/modelsheet-web`:

```bash
npm run build
npm run d1:migrate:local
npm run d1:seed:local
npm run pages:dev -- --port 8788
```

Do not pass `--d1 DB=modelsheet` when `wrangler.toml` already contains the D1
binding. Passing the CLI binding flag creates a different local D1 database, so
Pages Functions will not see the tables seeded by `wrangler d1 execute`.

Useful checks:

```bash
curl "http://localhost:8788/api/search?q=qwen&page=1&limit=2"
curl "http://localhost:8788/api/model?id=Qwen/Qwen2.5-14B-Instruct-1M"
curl "http://localhost:8788/api/architectures"
curl "http://localhost:8788/api/architecture?id=qwen2"
```

## Remote setup

Create the remote database once:

```bash
npx wrangler d1 create modelsheet
```

Copy the returned database id into `src/modelsheet-web/wrangler.toml`, replacing
the placeholder `00000000-0000-0000-0000-000000000000`.

Apply schema and seed:

```bash
cd src/modelsheet-web
npm run d1:migrate:remote
npm run d1:seed:remote
npx wrangler d1 execute modelsheet --remote --command "select count(*) from models" --json
```

`npm run d1:seed:remote` first writes `data/d1/seed.remote.sql`, a generated
transaction-free copy of `data/d1/seed.sql`. Wrangler's remote D1 import rejects
raw `BEGIN` / `COMMIT` statements even though the local SQLite seed accepts them.

## Scheduled server sync

The normal daily flow is:

```bash
git pull --ff-only
uv sync
uv run modelsheet scan --commit --add
uv run modelsheet db build
uv run modelsheet db seed
uv run modelsheet db verify
```

Before writing remote D1, compare the newest local source hash printed by
`modelsheet db seed` with the remote hash:

```bash
cd src/modelsheet-web
npx wrangler d1 execute modelsheet --remote --command "select source_hash from sync_runs order by id desc limit 1" --json
```

If the hash is unchanged, skip the remote seed. If it changed:

```bash
cd src/modelsheet-web
npm run d1:seed:remote
npx wrangler d1 execute modelsheet --remote --command "select source_hash, model_count, architecture_count, synced_at from sync_runs order by id desc limit 1" --json
```

## Catalog reads and cache behavior

Pages Functions query the `DB` D1 binding. Search count and result queries run
in one D1 batch. Migration `0004_catalog_query_indexes.sql` adds indexes matching
the default release-date order, parameter order, provider browsing and architecture
filtering. Apply remote migrations before publishing the frontend/Functions build:

```bash
cd src/modelsheet-web
npm run test:api
npm run d1:migrate:remote
npm run build
```

The API tests use Node.js 22.13+ and build an in-memory SQLite database from the
committed migrations and seed, so they also check migration compatibility.

Read routes start a D1 session with `first-unconstrained`. When read replication
is enabled in the D1 dashboard, Cloudflare can serve those queries from a nearby
replica. Enabling replication is a database setting; the Pages deployment does
not enable it. Replicas may lag the primary; sessions preserve consistency within
each request.

Successful GET responses are cached with the Workers Cache API for 300 seconds
at the serving Cloudflare location. Query parameters are part of the cache key.
Browser HTTP caching is 60 seconds, and the frontend keeps up to 40 successful
query results for 60 seconds for back navigation. After a data sync, allow for
these cache lifetimes and replication lag before expecting every browser to show
the updated catalog. Errors use `no-store`.

Responses expose `X-ModelSheet-Cache: HIT|MISS|BYPASS` and `Server-Timing`.
Search misses include D1 query duration; cache hits avoid D1. Check the same URL
twice using `curl -i` to inspect a miss followed by a hit. Local Wrangler timings
measure the local runtime; deployed timings depend on the serving region and D1
replication settings. Cache API entries are local to each Cloudflare location.

The frontend uses bounded model-ID requests for comparisons, architecture-filtered
model requests for diagrams, and `view=cards` for provider pages. The unfiltered
`/api/models` endpoint remains available for catalog exports. Static assets bypass
Functions via `public/_routes.json`; Vite-generated assets use immutable caching.
Geist fonts are served with the application, with their license under
`src/assets/fonts/OFL.txt`.

## References

- Cloudflare Pages Functions bindings: https://developers.cloudflare.com/pages/functions/bindings/
- Wrangler D1 commands: https://developers.cloudflare.com/d1/wrangler-commands/
- D1 read replication: https://developers.cloudflare.com/d1/best-practices/read-replication/
- Workers Cache API: https://developers.cloudflare.com/workers/runtime-apis/cache/
- Pages Functions routing: https://developers.cloudflare.com/pages/functions/routing/
