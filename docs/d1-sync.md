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
curl "http://127.0.0.1:8788/api/search?q=qwen&page=1&limit=2"
curl "http://127.0.0.1:8788/api/model?id=Qwen/Qwen2.5-14B-Instruct-1M"
curl "http://127.0.0.1:8788/api/architectures"
curl "http://127.0.0.1:8788/api/architecture?id=qwen2"
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
npm run d1:seed:remote
npx wrangler d1 execute modelsheet --remote --command "select source_hash, model_count, architecture_count, synced_at from sync_runs order by id desc limit 1" --json
```

## References

- Cloudflare Pages Functions bindings: https://developers.cloudflare.com/pages/functions/bindings/
- Wrangler D1 commands: https://developers.cloudflare.com/d1/wrangler-commands/
