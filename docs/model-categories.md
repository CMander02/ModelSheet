# Model categories

The catalog uses `modelCategory: language | decision`. Older records default to
`language`. Category describes the interface a model is trained to expose; its
`architecture` continues to identify the backbone and its `task` describes the task.

Decision models accept state and candidate actions or typed questions, returning
choices, scores, rankings, routing results or abstention. Reviewed families include
Intern-Decision, Laya, GLiNER2.5-Decide and CLM; Jev and Solar Decide are closed API
references. Use official model cards to determine capabilities and calibration.

| Field | Meaning |
|---|---|
| `baseModel` | Official backbone or fine-tuning origin |
| `decisionTypes` | `choice`, `score`, `ranking`, `routing`, `abstention` |
| `inferenceMode` | `single-forward`, `contrastive`, `api` |
| `license` | Publisher license identifier |
| `sourceUrl` | Official model card or documentation |
| `descriptionZh`, `descriptionEn` | Interface, inference and calibration notes |
| `curatedFields` | Reviewed overrides retained by later CLI refreshes |

SQLite/D1 indexes `model_category` with release order and stores `base_model` and
`decision_types_json` as queryable columns. The full record stays in `raw_json`.
Migration `0005_model_categories.sql` adds these fields with legacy defaults.

`/api/search` accepts category, decisionType, openness and provider filters. Search
also matches baseModel. Filters compose with pagination and sorting, and are part
of the edge-cache key. `/api/models` accepts category for complete family lists.
The home page browses language models; `/decisions` provides the decision catalog.
The shared detail and comparison pages show decision fields and source links.

## Ingestion and monitoring

`categories.py` contains reviewed publisher/family rules. They allow these decision
checkpoints through encoder/classifier pipeline filters while preserving generic
classifier and quantization exclusions. CLI export persists category. Models with
unusual checkpoint layouts need reviewed facts in `data/models.json`; preserve
unknown counts and limits. CLM distributes projection heads separately from Qwen.
GLiNER parameter counts include the full checkpoint; marketing backbone sizes can
differ. Laya context defaults and calibration limitations are documented separately.

After review, run database build, seed and verify, then the frontend build and API
tests. Push reviewed source changes to main to trigger D1 publication. The external
daily monitor discovers candidates and records category in its review queue; review
and ingestion remain explicit steps. Run `monitor add` for new publishers and
`monitor start` to regenerate the scheduled units from current source.

Apple AFM 3 Core Advanced stores a 1–4B active range rather than a fixed active
count. Rumored GPT-5.6 Sol retains its sourced 2–4T estimate and 3T center value.
Parameter ranges display in model lists, details and comparisons with provenance.
