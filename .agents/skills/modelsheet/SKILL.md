---
name: modelsheet
description: Operate and maintain the ModelSheet model catalog. Use for adding or updating models and providers, scanning Hugging Face or ModelScope organizations, correcting release dates and parameter metadata, troubleshooting the ModelSheet CLI, editing architecture DSL files, rebuilding SQLite/D1 artifacts, validating frontend data, or completing catalog work manually when the CLI cannot handle a source.
---

# ModelSheet

Maintain ModelSheet through its reviewable source data, CLI, generated database, and frontend. Prefer the CLI for repeatable work and use the agent-assisted fallback for announced, closed, incomplete, or unsupported models.

## Start Safely

1. Work from the repository root.
2. Read the repository `AGENTS.md` before changing files.
3. Run `git status --short --branch` and preserve unrelated changes.
4. Inspect the relevant model, provider, architecture, and nearby records before editing.
5. Use `uv` for Python commands and the repository package manager for frontend commands.

Read [references/cli-reference.md](references/cli-reference.md) when command flags, database publishing, or troubleshooting details are needed.

## Choose the Workflow

- Use **CLI-first ingestion** for public Hugging Face or ModelScope repositories with usable configuration files.
- Use **organization scanning** to discover candidates from tracked providers or watchlists.
- Use **closed-model fetching** for supported OpenAI, Anthropic, and Google model-card pages.
- Use **agent-assisted curation** for newly announced models, closed models, missing configs, unsupported architectures, incomplete metadata, or persistent CLI failures.
- Use **architecture curation** when a model family needs a new DSL file or alias.
- Use **provider curation** for canonical names, aliases, localized display names, scan organizations, and icon routing.

## Run the CLI-First Workflow

1. Confirm the source repository and canonical model ID.
2. Preview filter behavior when the model name may match an exclusion rule:

   ```powershell
   uv run modelsheet filter test org/model
   ```

3. Add one representative model first:

   ```powershell
   uv run modelsheet model add org/model
   ```

4. Inspect the resulting `data/models.json` entry. Verify identity, provider, URLs, `releasedAt`, parameter counts, architecture, MoE fields, modalities, and openness.
5. Add the remaining explicit IDs only after the representative result is sound.
6. Rebuild and verify generated data:

   ```powershell
   uv run modelsheet db build
   uv run modelsheet db seed
   uv run modelsheet db verify
   ```

7. Build the frontend when data, API output, provider mappings, icons, or UI behavior changed:

   ```powershell
   Set-Location src/modelsheet-web
   npm run build
   ```

8. Review the complete diff. Keep `data/models.json`, `data/providers.json`, and architecture YAML human-reviewable. Include `data/d1/seed.sql` when source data changes.

## Discover Models

Use scans to produce reviewable candidates:

```powershell
uv run modelsheet scan --source hf --org Qwen
uv run modelsheet scan --show-skipped
uv run modelsheet scan --watchlist
```

Review candidates and filter decisions before saving a snapshot or adding models. Run `--commit` or `--add` only when the requested workflow authorizes those mutations.

Keep scanning under an external scheduled agent or operator. Preserve the deployment workflow as a publisher of committed snapshots.

## Curate Facts

Use authoritative, model-specific sources and retain source URLs where the schema supports provenance.

### Release Date

- Write the public release timestamp to `releasedAt`.
- Do not add alternative release-date fields.
- Prefer the Hugging Face repository `createdAt` when the repository is the official release surface for that exact model.
- Otherwise use the earliest date among the official technical blog, model announcement, technical report, or paper that publicly releases the model.
- Use an official ModelScope creation timestamp when it is the available first-party release surface and stronger evidence is unavailable.
- Distinguish an original model release from a later quantization, conversion, mirror, checkpoint, or documentation update.

### Parameters and Architecture

- Prefer official repository configs and structured APIs for open-weight models.
- Cross-check total and active parameters for MoE models. Verify expert count, experts per token, shared experts, and active experts together.
- Use official technical reports or model cards when config metadata is absent.
- For closed or reported models, set `parameterConfidence`, `parameterSource`, and `parameterSourceUrl` when appropriate.
- Leave unsupported facts unset. Preserve uncertainty explicitly and avoid inferred precision.

### Providers

- Treat `data/providers.json` as the canonical provider mapping.
- Add organization aliases and scan identifiers to the provider record instead of duplicating provider names in model entries.
- Populate both English and Chinese display names with the organization’s established names.
- Route model and provider icons through `brand-icon.tsx`; use a product icon for a model family and a company icon for its provider when both exist.

## Use the Agent-Assisted Fallback

Follow this workflow when the CLI cannot produce a trustworthy entry.

1. Capture the exact command, error, affected files, and any partial diff.
2. Classify the failure:
   - environment or dependency setup;
   - network, authentication, rate limit, or source availability;
   - missing or nonstandard configuration;
   - parser or exporter defect;
   - intentional filter rule;
   - database or frontend validation failure.
3. Query structured first-party sources directly. Use the Hugging Face API, ModelScope API, repository files, official announcement, technical blog, or report as applicable.
4. Compare the target with a nearby model from the same provider or architecture family.
5. Edit only the canonical source files:
   - `data/models.json` for model facts;
   - `data/providers.json` for providers, aliases, localization, and scan configuration;
   - `data/architectures/*.yaml` for architecture DSL definitions and aliases.
6. Build the smallest complete record supported by evidence. Keep canonical IDs and field naming consistent with adjacent entries.
7. If the failure represents a reusable parser, fetcher, exporter, filter, or database defect, repair the CLI and rerun one representative model before applying a broad update.
8. Regenerate SQLite and D1 artifacts from source files. Never repair generated SQL as the source of truth.
9. Build and, when relevant, render-test the frontend.

## Handle Common Failure Paths

- **Repository exists and config is valid:** inspect `fetcher.py`, `parser.py`, extractors, and `exporter.py`; repair the general path and retry.
- **Repository exists without a usable config:** collect official metadata manually and add only supported fields.
- **Model is filtered:** inspect `data/filter-suffixes.yaml`; change a rule only when the catalog scope requires the model class.
- **Provider resolves incorrectly:** update provider aliases or scan mappings in `data/providers.json` and rebuild the database.
- **Architecture is unknown:** map a verified alias to an existing family or add one architecture YAML file using the generic DSL renderer.
- **Network or rate limit blocks ingestion:** retry the first-party API or use another official release surface; retain evidence URLs.
- **Database verification reports a hash or count mismatch:** rebuild SQLite, regenerate the seed, and rerun verification from unchanged source data.
- **Local Pages cannot see D1:** use the binding in `wrangler.toml` consistently and seed the same local database.
- **Remote D1 rejects transaction statements:** generate and import the transaction-free remote seed through `npm run d1:seed:remote`.

## Validate Before Handoff

- Confirm JSON and YAML parse successfully.
- Confirm every model resolves to the intended canonical provider.
- Confirm localized provider names render in all supported languages.
- Confirm `releasedAt` represents the model’s public release.
- Confirm total and active parameters are coherent, especially for MoE and quantized variants.
- Confirm architecture aliases resolve and diagrams compile.
- Run `db build`, `db seed`, and `db verify`.
- Run the frontend build for API, data, icon, or UI changes.
- Use `localhost` for local Pages validation.
- Run `git diff --check` and inspect source plus generated diffs.
- Commit or push only when explicitly requested. When publishing mixed work, keep reusable code fixes and catalog data in separate commits.
