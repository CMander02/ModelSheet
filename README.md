# ModelSheet

**Open-source LLM model parameter reference and comparison tool.**

A browsable catalog of language models — parameters, architecture, context length, modalities — sourced directly from HuggingFace config files and kept up to date automatically.

→ **[Live site](https://modelsheet.pages.dev)**

---

## What it does

ModelSheet parses model configs from HuggingFace and structures them into a unified JSON catalog. A static React frontend lets you search, filter, and compare models side-by-side.

- **900+ models** cataloged, growing daily via automated scans
- Covers open-weight models across Qwen, Llama, Mistral, DeepSeek, Gemma, and more
- Closed frontier models (GPT-4o, Claude, Gemini) included as lean reference entries
- All data generated locally and committed to the repo — no runtime LLM calls, no hallucinations
- **Architecture Gallery** — Mermaid-rendered diagrams for major model families (BERT, GPT-2, Qwen series, DeepSeek series), derived from HuggingFace transformers source code

---

## CLI

The `modelsheet` CLI fetches configs from HuggingFace, parses them, and writes to `data/models.json`.

### Install

```bash
# Recommended: uv
uv sync
uv pip install -e .

# Or pip
pip install -e .
```

### Add models

```bash
# Single model
modelsheet add Qwen/Qwen2.5-7B

# Multiple at once
modelsheet add Qwen/Qwen2.5-7B mistralai/Mistral-7B-v0.3 deepseek-ai/DeepSeek-V3

# From file (.txt or .yaml)
modelsheet add --file models.txt

# Re-fetch and update all existing entries
modelsheet add --update-all
```

### Scan for new models

`scan` diffs the current HuggingFace org listings against your local snapshot and database, reporting new models without touching anything:

```bash
# Scan all tracked orgs (HuggingFace + ModelScope)
modelsheet scan

# HuggingFace only, specific org
modelsheet scan --source hf --org Qwen

# Show what was filtered out (quant variants, TTS, embeddings, …)
modelsheet scan --show-skipped

# Save the snapshot so next run diffs from here
modelsheet scan --commit

# Scan + immediately add new models to the DB
modelsheet scan --commit --add
```

### Build SQLite / D1 data

```bash
modelsheet db build    # writes data/modelsheet.sqlite
modelsheet db seed     # writes data/d1/seed.sql
modelsheet db verify   # checks counts, providers, architecture aliases, source hash
```

`data/modelsheet.sqlite` is a local build artifact and is intentionally ignored
by Git. `data/d1/seed.sql` is the portable SQL snapshot used by Cloudflare D1.

### Sync data to Cloudflare D1

Model discovery/scanning is handled outside this repository workflow. Once an
agent or operator pushes updated source data to `main`, GitHub Actions publishes
that snapshot to Cloudflare D1.

Workflow: [`.github/workflows/d1-sync.yml`](.github/workflows/d1-sync.yml)

Required GitHub repository secrets:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

The CI helper executes the generated seed through Cloudflare's D1 query API and
skips `PRAGMA` / transaction wrapper statements, because D1 remote imports reject
raw `BEGIN` / `COMMIT` SQL.

The workflow does:

```bash
uv run modelsheet db build
uv run modelsheet db seed
uv run modelsheet db verify
cd src/modelsheet-web
npx wrangler d1 migrations apply modelsheet --remote
cd ../..
python scripts/sync_d1_seed.py --seed data/d1/seed.sql --wrangler src/modelsheet-web/wrangler.toml
cd src/modelsheet-web
npx wrangler d1 execute modelsheet --remote --command "SELECT COUNT(*) AS model_count FROM models" --json
```

To publish manually after `npx wrangler login`:

```bash
uv sync
uv run modelsheet db build
uv run modelsheet db seed
uv run modelsheet db verify

cd src/modelsheet-web
npm ci
npx wrangler d1 migrations apply modelsheet --remote
npm run d1:seed:remote
npx wrangler d1 execute modelsheet --remote --command "SELECT COUNT(*) AS model_count FROM models" --json
```

### Export SQL from Cloudflare D1

Use Wrangler export when you need a SQL copy of the remote D1 database:

```bash
cd src/modelsheet-web
npx wrangler d1 export modelsheet --remote --output ../../data/d1/remote.sql --yes
```

`data/d1/remote.sql` is for inspection or backup; it should not replace
`data/models.json` as the source of truth.

### Modify local SQLite data

Prefer editing source files, then rebuilding:

```bash
# Edit data/models.json, data/providers.json, or data/architectures/*.yaml
uv run modelsheet db build
uv run modelsheet db seed
uv run modelsheet db verify
```

Direct edits to `data/modelsheet.sqlite` are only useful for temporary local
debugging. They are overwritten by the next `modelsheet db build`. If a change
must persist, put it in the source JSON/YAML and regenerate SQLite/seed SQL.

### Other commands

```bash
modelsheet show Qwen/Qwen2.5-7B     # detailed view of one model
modelsheet list                      # list all model IDs in DB
modelsheet remove --model <id>       # remove a model
modelsheet list | grep deepseek      # pipe-friendly output
```

Every command has a `--help` with examples:

```bash
modelsheet --help
modelsheet scan --help
modelsheet add --help
```

---

## Data format

`data/models.json` — one object per model:

```json
{
  "id": "Qwen/Qwen2.5-7B",
  "name": "Qwen2.5-7B",
  "provider": "Qwen Team",
  "huggingfaceUrl": "https://huggingface.co/Qwen/Qwen2.5-7B",
  "totalParameters": 7615616000,
  "contextLength": 131072,
  "architecture": "qwen2",
  "architectureFamily": "Qwen2",
  "numLayers": 28,
  "numHeads": 28,
  "numKvHeads": 4,
  "hiddenSize": 3584,
  "intermediateSize": 18944,
  "positionEncoding": "RoPE",
  "activation": "silu",
  "normType": "RMSNorm",
  "mlpFactor": 5.29,
  "gqaRatio": 7.0,
  "isMoe": false,
  "createdAt": "2024-09-18T09:53:43.000Z"
}
```

MoE models carry additional fields (`numExperts`, `numExpertsPerToken`, `activeParameters`, …). Closed models omit architecture internals and carry `techReport` instead of `huggingfaceUrl`.

---

## Automated updates

Model scanning is intentionally separate from GitHub Actions. A scheduled agent
can run `modelsheet scan --commit --add`, review/commit the resulting
`data/models.json` and `data/scan_snapshot.json`, then push to `main`. The
GitHub D1 sync workflow publishes that committed data to Cloudflare D1.

---

## Project structure

```
ModelSheet/
├── .github/workflows/
│   └── d1-sync.yml           # publish committed data snapshots to Cloudflare D1
├── src/
│   ├── modelsheet-cli/       # Python CLI (fetcher, parser, exporter, scanner)
│   └── modelsheet-web/       # React + Vite frontend
├── data/
│   ├── models.json           # model catalog (source of truth)
│   ├── providers.json        # org → provider name mapping
│   └── scan_snapshot.json    # snapshot for incremental diff
└── scripts/                  # one-shot data maintenance scripts
```

---

## Tech stack

| Layer | Tech |
|-------|------|
| CLI | Python 3.13, typer, httpx, rich |
| Frontend | React 19, Vite, TypeScript, shadcn/ui, Tailwind, Mermaid |
| Data | Static JSON, generated by CLI |
| Hosting | Cloudflare Pages |
| CI | GitHub Actions |

---

## Reference & inspiration

- [LLM Architecture Gallery](https://sebastianraschka.com/llm-architecture-gallery/) — Sebastian Raschka's hand-drawn architecture card collection; inspiration for the /arch page
- [Transformers Timeline](https://huggingface.co/spaces/yonigozlan/Transformers-Timeline) — HuggingFace Space tracking architecture release history
- [HuggingFace transformers](https://github.com/huggingface/transformers) — source of truth for module-level architecture details

---

## Roadmap

### Architecture Gallery
- [ ] Add LLaMA / LLaMA-2 / LLaMA-3 diagrams (GQA, SwiGLU, grouped RoPE)
- [ ] Add Mistral / Mixtral (sliding window attention, sparse MoE)
- [ ] Add Gemma / Gemma 2 (multi-query attention, logit soft-cap)
- [ ] Add original Transformer (encoder-decoder, "Attention Is All You Need")
- [ ] Deep-link from model table architecture column to /arch page
- [ ] Dark-mode aware Mermaid theme
- [ ] Architecture diff view (side-by-side two diagrams)

### Data & CLI
- [ ] `knowledgeCutoff` field (YYYY-MM-DD) for closed models
- [ ] Fill GPT-5 series, o-series gaps in closed-model catalog
- [ ] ModelScope fetch parity with HuggingFace fetcher

### Frontend
- [ ] Model timeline view (createdAt on x-axis)
- [ ] Mobile model card page layout improvements
- [ ] Shareable comparison URLs

---

## Contributing

The easiest contribution is adding missing models:

```bash
modelsheet add org/model-name
# verify data/models.json looks right
git add data/models.json
git commit -m "data: add org/model-name"
```

For CLI or frontend changes, open an issue first to discuss scope.

---

## License

MIT
