# AGENTS.md

This file gives agent-facing guidance for working in this repository.

## Project Overview

ModelSheet is an open-source LLM model parameter reference and comparison tool.
It has three connected parts:

- A Python CLI that fetches HuggingFace / ModelScope model configs and maintains reviewable source data.
- A generated SQLite / Cloudflare D1 catalog used by Pages Functions.
- A React frontend for searching, comparing, browsing providers, and reading architecture pages.

The source of truth is still local data files:

- `data/models.json`: model catalog.
- `data/providers.json`: provider names, org mappings, scan config, i18n.
- `data/architectures/*.yaml`: one architecture DSL file per architecture family.

Generated artifacts:

- `data/modelsheet.sqlite`: local SQLite build artifact, ignored by Git.
- `data/d1/seed.sql`: reviewable SQL snapshot generated from SQLite and committed when data changes.
- `data/d1/seed.remote.sql`: temporary transaction-free D1 import file, ignored by Git.

Cloudflare D1 is a deployment target, not the canonical data source.

## Development Commands

### Python Setup

Use `uv` by default.

```bash
uv sync
uv pip install -e .
```

Run CLI commands through `uv run` when possible:

```bash
uv run modelsheet --help
uv run modelsheet add Qwen/Qwen2.5-7B
uv run modelsheet scan --source hf --org Qwen
```

### Model Data

```bash
uv run modelsheet add Qwen/Qwen2.5-7B
uv run modelsheet add Qwen/Qwen2.5-7B mistralai/Mistral-7B-v0.3
uv run modelsheet add --file models.txt
uv run modelsheet add --update-all

uv run modelsheet scan
uv run modelsheet scan --source hf --org Qwen
uv run modelsheet scan --show-skipped
uv run modelsheet scan --commit
uv run modelsheet scan --commit --add
```

Scanning is intentionally handled by an external scheduled agent/operator. Do
not reintroduce a GitHub Action that scans HuggingFace / ModelScope and commits
model data.

### SQLite / D1 Build

```bash
uv run modelsheet db build
uv run modelsheet db seed
uv run modelsheet db verify
```

Expected verification currently checks model count, provider count,
architecture count, architecture aliases, and source hash consistency.

### Frontend

```bash
cd src/modelsheet-web
npm ci
npm run build
```

Local Pages + D1 smoke flow:

```bash
cd src/modelsheet-web
npm run build
npm run d1:migrate:local
npm run d1:seed:local
npm run pages:dev -- --port 8788
```

Do not pass `--d1 DB=modelsheet` when `wrangler.toml` already defines the D1
binding. Passing an extra binding can point Pages Functions at a different local
D1 database than the one seeded by `wrangler d1 execute`.

Remote D1 publish flow after `npx wrangler login`:

```bash
uv run modelsheet db build
uv run modelsheet db seed
uv run modelsheet db verify

cd src/modelsheet-web
npm ci
npx wrangler d1 migrations apply modelsheet --remote
npm run d1:seed:remote
npx wrangler d1 execute modelsheet --remote --command "SELECT COUNT(*) AS model_count FROM models" --json
```

`npm run d1:seed:remote` first generates `data/d1/seed.remote.sql` using
`scripts/sync_d1_seed.py`, because Cloudflare D1 remote import rejects raw
`BEGIN` / `COMMIT` SQL from the normal reviewable seed file.

## Current Architecture

### CLI

The Python package is named `modelsheet`, with entry point
`modelsheet_cli.cli:app`. The source directory is mapped unusually:

```toml
{ "modelsheet_cli" = "src/modelsheet-cli" }
```

Important modules:

- `src/modelsheet-cli/cli.py`: Typer command surface.
- `src/modelsheet-cli/fetcher.py`: HuggingFace / ModelScope config and README fetching.
- `src/modelsheet-cli/parser.py`: config parsing into `ParsedModel`.
- `src/modelsheet-cli/exporter.py`: snake_case to frontend camelCase JSON.
- `src/modelsheet-cli/scanner.py`: org scan and diff logic.
- `src/modelsheet-cli/filters.py`: exclusion rules for quantized, ASR/TTS, embedding, reward, image diffusion, and related non-target models.
- `src/modelsheet-cli/db.py`: JSON/YAML -> SQLite -> D1 seed pipeline.
- `src/modelsheet-cli/extractors/`: metadata, architecture, MoE, and parameter extraction helpers.

Fetcher/parser/exporter changes can alter persisted model data. Run a small
sample or `db verify` before committing broad parser changes.

### D1 Schema

Schema lives in `src/modelsheet-web/migrations/0001_modelsheet_d1.sql`.

Main tables:

- `providers`: provider/company records, i18n names, org mappings, scan JSON, raw JSON.
- `models`: queryable model fields plus `raw_json`.
- `architectures`: architecture metadata plus rendered diagram JSON.
- `architecture_aliases`: alias -> architecture id mapping.
- `sync_runs`: source hash, model count, architecture count, sync timestamp.

There is no separate model-architecture join table in v1. Models keep their
`architecture` label, and architecture pages resolve via aliases.

### Cloudflare Pages Functions

API routes live under `src/modelsheet-web/functions/api/` and use
`context.env.DB` from the Pages D1 binding.

Current routes:

- `/api/search`
- `/api/models`
- `/api/model?id=...`
- `/api/providers`
- `/api/provider?id=...`
- `/api/architectures`
- `/api/architecture?id=...`

Shared D1 helpers are in `src/modelsheet-web/functions/_utils.ts`.

### Frontend

The React app is under `src/modelsheet-web/src/`.

Key pages:

- `HomePage.tsx`: model browsing table/list, search, filters, infinite load.
- `ModelCardPage.tsx`: single model detail.
- `ComparePage.tsx`: side-by-side model comparison.
- `ProviderPage.tsx` and `ProvidersPage.tsx`: provider browsing.
- `ArchPage.tsx` and `ArchDetailPage.tsx`: architecture gallery and detail pages.

Important frontend modules/components:

- `lib/model-data.ts`: model loading and table column definitions.
- `lib/architecture-data.ts`: architecture API loading, alias matching, diagram template rendering.
- `lib/types.ts`: shared frontend types.
- `lib/i18n.ts`: zh/en copy.
- `components/model-table.tsx`: desktop table with right-click column pinning and horizontal scroll.
- `components/mobile-model-list.tsx`: mobile card browsing.
- `components/architecture-diagram-renderer.tsx`: generic architecture diagram renderer.
- `components/arch-tree-diagram.tsx`: pure React architecture tree diagram UI.
- `components/site-footer.tsx`: global footer and Sebastian Raschka attribution.
- `components/brand-icon.tsx`: provider logo fallback system.

Architecture pages should use the generic renderer and D1/API data. Do not add
one React component per architecture unless there is a concrete reason.

## Architecture DSL

Architecture DSL files live in `data/architectures/*.yaml`. Example:
`data/architectures/qwen2.yaml`.

The CLI validates and compiles them into `architectures.diagram_nodes_json` and
`architecture_aliases` during `modelsheet db build`.

Core DSL shape:

```yaml
id: qwen2
family: Qwen2 / Qwen2.5
era: "2024"
type: decoder
normPlacement: pre
description:
  zh: "..."
  en: "..."
aliases: [qwen2, qwen2_moe, qwen2_vl, qwen2_5_vl]
defaultParams:
  numLayers: 28
  numHeads: 28
diagram:
  subtitle: "hidden: {{hiddenSize}}"
  nodes:
    - id: input
      type: leaf
      label: Input tokens
      color: input
```

Template placeholders only use `{{paramName}}`. Values come from
`defaultParams`; model detail pages may override with current model fields.

When adding or changing an architecture:

```bash
uv run modelsheet db build
uv run modelsheet db seed
uv run modelsheet db verify
cd src/modelsheet-web
npm run build
```

## Data Model Notes

Provider mapping comes from `data/providers.json`; this is the single source of
truth for CLI and frontend provider display names.

Typical model fields:

- Metadata: `id`, `name`, `provider`, URLs, `releasedAt`, `openness`.
- Parameters: `totalParameters`, `activeParameters`, `embeddingParameters`, `nonEmbeddingParameters`.
- Architecture: `architecture`, `architectureFamily`, layers, heads, hidden size, FFN size, RoPE/norm/activation.
- MoE: `isMoe`, experts, experts per token, active experts, MoE intermediate size.
- Provenance for manually curated closed/rumored models: `parameterConfidence`, `parameterSource`, `parameterSourceUrl`.

The parser uses API metadata when available for parameter counts. MoE parameter
calculation is specialized; verify both `totalParameters` and
`activeParameters` when touching MoE extraction.

## GitHub Actions

`.github/workflows/d1-sync.yml` publishes committed data snapshots to Cloudflare
D1. It must not scan for new models or commit generated model data.

Required secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The workflow runs `db build`, `db seed`, `db verify`, applies D1 migrations, and
uses `scripts/sync_d1_seed.py` to seed remote D1 through the Cloudflare D1 query
API.

## Provider Icon System

Provider icons are rendered via `src/modelsheet-web/src/components/brand-icon.tsx`.

Fallback order:

1. `@lobehub/icons` React avatar component.
2. Local static PNG/SVG under `src/modelsheet-web/public/icons/providers/`.
3. Generic `ProviderIcon` fallback.

If adding a custom icon, update the relevant maps in `brand-icon.tsx`.

## Project Structure

```text
ModelSheet/
├── .github/workflows/
│   └── d1-sync.yml
├── data/
│   ├── architectures/
│   ├── d1/
│   ├── models.json
│   ├── providers.json
│   └── scan_snapshot.json
├── docs/
│   └── d1-sync.md
├── scripts/
│   └── sync_d1_seed.py
├── src/
│   ├── modelsheet-cli/
│   └── modelsheet-web/
│       ├── functions/
│       ├── migrations/
│       └── src/
├── README.md
├── README.zh-CN.md
└── pyproject.toml
```

## Working Principles

- Preserve `data/models.json`, `data/providers.json`, and architecture YAML as reviewable source data.
- Do not rely on runtime LLM calls for catalog facts.
- Prefer existing repo patterns and helper APIs over new abstractions.
- Use structured parsers/APIs for JSON, YAML, TOML, and SQL where practical.
- Keep unrelated generated files and cache output out of commits.
- Run focused verification after changes:
  - CLI/data: `uv run modelsheet db build && uv run modelsheet db seed && uv run modelsheet db verify`
  - Frontend/API: `cd src/modelsheet-web && npm run build`
  - D1 remote when relevant: Wrangler count/hash queries.
- Git operations that mutate history or publish changes require explicit user request. Do not commit or push unless the user asks.

## Common Issues

- If Pages Functions cannot see D1 tables locally, check that `wrangler.toml`
  binding is used consistently and no extra `--d1` binding was passed.
- Remote `wrangler d1 execute --file data/d1/seed.sql` can fail on raw
  transaction statements. Use `npm run d1:seed:remote` or
  `scripts/sync_d1_seed.py --write-d1-file`.
- The CLI package path is `src/modelsheet-cli`, but imports use
  `modelsheet_cli`.
- Only one CLI instance should write `data/models.json` at a time. Temp config
  downloads are isolated under `data/temp/{org}/{model}/`, but final export is a
  serial write.
