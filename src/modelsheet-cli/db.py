"""Build and verify the local SQLite/D1 database from repository data files."""

from __future__ import annotations

import hashlib
import json
import re
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from .config import DATA_DIR, OUTPUT_FILE, PROVIDERS_FILE

SQLITE_FILE = DATA_DIR / "modelsheet.sqlite"
D1_DIR = DATA_DIR / "d1"
SEED_SQL_FILE = D1_DIR / "seed.sql"
ARCHITECTURES_DIR = DATA_DIR / "architectures"

ALLOWED_ARCH_TYPES = {"encoder", "decoder", "encoder-decoder"}
ALLOWED_NORM_PLACEMENTS = {"pre", "post"}
ALLOWED_NODE_TYPES = {"leaf", "group", "row"}
ALLOWED_TREE_COLORS = {
    "attn",
    "ffn",
    "norm",
    "emb",
    "out",
    "moe",
    "resid",
    "input",
    "cyan",
    "purple",
    "green",
    "steel",
    "orange",
    "sky",
    "blue",
    "indigo",
    "teal",
    "amber",
    "pink",
    "violet",
}

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL UNIQUE,
  name_en TEXT,
  name_zh TEXT,
  region TEXT NOT NULL DEFAULT 'other',
  orgs_json TEXT NOT NULL DEFAULT '[]',
  scan_json TEXT NOT NULL DEFAULT '{}',
  raw_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  huggingface_url TEXT,
  modelscope_url TEXT,
  arxiv_url TEXT,
  tech_report TEXT,
  total_parameters INTEGER,
  active_parameters INTEGER,
  embedding_parameters INTEGER,
  non_embedding_parameters INTEGER,
  context_length INTEGER,
  embedding_dim INTEGER,
  vocab_size INTEGER,
  architecture TEXT,
  architecture_family TEXT,
  num_layers INTEGER,
  num_heads INTEGER,
  num_kv_heads INTEGER,
  hidden_size INTEGER,
  intermediate_size INTEGER,
  position_encoding TEXT,
  activation TEXT,
  norm_type TEXT,
  norm_eps REAL,
  attention_dropout REAL,
  mlp_factor REAL,
  gqa_ratio REAL,
  torch_dtype TEXT,
  is_moe INTEGER NOT NULL DEFAULT 0,
  num_experts INTEGER,
  num_shared_experts INTEGER,
  num_experts_per_token INTEGER,
  num_activated_experts INTEGER,
  moe_intermediate_size_json TEXT,
  input_modalities_json TEXT NOT NULL DEFAULT '[]',
  output_modalities_json TEXT NOT NULL DEFAULT '[]',
  openness TEXT,
  task TEXT,
  knowledge_cutoff TEXT,
  parameter_confidence TEXT,
  parameter_source TEXT,
  parameter_source_url TEXT,
  name_note TEXT,
  created_at TEXT,
  updated_at TEXT,
  raw_json TEXT NOT NULL,
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

CREATE TABLE IF NOT EXISTS architectures (
  id TEXT PRIMARY KEY,
  family TEXT NOT NULL,
  era TEXT NOT NULL,
  type TEXT NOT NULL,
  norm_placement TEXT NOT NULL,
  description_zh TEXT NOT NULL,
  description_en TEXT NOT NULL,
  paper_url TEXT,
  hf_org TEXT,
  default_params_json TEXT NOT NULL DEFAULT '{}',
  source_links_json TEXT NOT NULL DEFAULT '[]',
  variants_json TEXT NOT NULL DEFAULT '[]',
  evidence_json TEXT NOT NULL DEFAULT '[]',
  features_json TEXT NOT NULL DEFAULT '{}',
  diagram_subtitle TEXT,
  diagram_nodes_json TEXT NOT NULL DEFAULT '[]',
  raw_yaml TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS architecture_aliases (
  alias TEXT PRIMARY KEY,
  architecture_id TEXT NOT NULL,
  FOREIGN KEY (architecture_id) REFERENCES architectures(id)
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_hash TEXT NOT NULL,
  model_count INTEGER NOT NULL,
  architecture_count INTEGER NOT NULL,
  synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_models_provider_id ON models(provider_id);
CREATE INDEX IF NOT EXISTS idx_models_architecture ON models(architecture);
CREATE INDEX IF NOT EXISTS idx_models_total_parameters ON models(total_parameters);
CREATE INDEX IF NOT EXISTS idx_models_created_at ON models(created_at);
CREATE INDEX IF NOT EXISTS idx_models_search ON models(name, provider, id);
CREATE INDEX IF NOT EXISTS idx_architecture_aliases_architecture_id
  ON architecture_aliases(architecture_id);
"""


@dataclass(frozen=True)
class ArchitectureSpec:
    id: str
    family: str
    era: str
    arch_type: str
    norm_placement: str
    description_zh: str
    description_en: str
    paper_url: str | None
    hf_org: str | None
    aliases: list[str]
    default_params: dict[str, Any]
    source_links: list[Any]
    variants: list[Any]
    evidence: list[Any]
    features: dict[str, Any]
    diagram_subtitle: str | None
    diagram_nodes: list[dict[str, Any]]
    raw_yaml: str


def provider_slug(name: str) -> str:
    """Match the frontend providerSlug() behavior."""
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower().strip()).strip("-")
    return slug or "provider"


def _json_text(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _configured_providers() -> dict[str, dict[str, Any]]:
    if not PROVIDERS_FILE.exists():
        return {}

    data = _load_json(PROVIDERS_FILE)
    providers: dict[str, dict[str, Any]] = {}

    for display_name, cfg in data.get("providers", {}).items():
        if isinstance(cfg, dict):
            providers[display_name] = cfg

    for key, value in data.items():
        if key in {"$schema", "$comment", "providers"}:
            continue
        if isinstance(value, dict) and "orgs" in value:
            providers[key] = value

    return providers


def _provider_rows(models: list[dict[str, Any]]) -> list[dict[str, Any]]:
    configured = _configured_providers()
    provider_names = {m.get("provider") for m in models if m.get("provider")}
    provider_names.update(configured.keys())

    rows = []
    used_ids: set[str] = set()
    for display_name in sorted(provider_names):
        cfg = configured.get(display_name, {})
        base_id = provider_slug(display_name)
        provider_id = base_id
        i = 2
        while provider_id in used_ids:
            provider_id = f"{base_id}-{i}"
            i += 1
        used_ids.add(provider_id)

        i18n = cfg.get("i18n", {}) if isinstance(cfg.get("i18n"), dict) else {}
        rows.append(
            {
                "id": provider_id,
                "display_name": display_name,
                "name_en": i18n.get("en", display_name),
                "name_zh": i18n.get("zh", display_name),
                "region": cfg.get("region", "other"),
                "orgs_json": _json_text(cfg.get("orgs", [])),
                "scan_json": _json_text(cfg.get("scan", {})),
                "raw_json": _json_text(cfg),
            }
        )
    return rows


def _validate_node(node: Any, path: str) -> dict[str, Any]:
    if not isinstance(node, dict):
        raise ValueError(f"{path}: node must be an object")

    node_type = node.get("type")
    if node_type not in ALLOWED_NODE_TYPES:
        raise ValueError(f"{path}: invalid node type {node_type!r}")
    if not node.get("id"):
        raise ValueError(f"{path}: node id is required")

    if node_type == "row":
        children = node.get("children")
        if not isinstance(children, list) or not children:
            raise ValueError(f"{path}: row.children must be a non-empty list")
        return {
            "id": str(node["id"]),
            "type": "row",
            "children": [
                _validate_node(child, f"{path}.children[{i}]")
                for i, child in enumerate(children)
            ],
        }

    color = node.get("color")
    if color not in ALLOWED_TREE_COLORS:
        raise ValueError(f"{path}: invalid color {color!r}")
    if not node.get("label"):
        raise ValueError(f"{path}: label is required")

    out: dict[str, Any] = {
        "id": str(node["id"]),
        "type": node_type,
        "label": str(node["label"]),
        "color": color,
    }
    for key in ("sub", "badge", "defaultExpanded"):
        if key in node:
            out[key] = node[key]

    if node_type == "group":
        children = node.get("children")
        if not isinstance(children, list) or not children:
            raise ValueError(f"{path}: group.children must be a non-empty list")
        out["children"] = [
            _validate_node(child, f"{path}.children[{i}]")
            for i, child in enumerate(children)
        ]

    return out


def _optional_list(data: dict[str, Any], key: str, path: Path) -> list[Any]:
    value = data.get(key) or []
    if not isinstance(value, list):
        raise ValueError(f"{path}: {key} must be a list")
    return value


def _optional_dict(data: dict[str, Any], key: str, path: Path) -> dict[str, Any]:
    value = data.get(key) or {}
    if not isinstance(value, dict):
        raise ValueError(f"{path}: {key} must be an object")
    return value


def load_architectures(
    architectures_dir: Path = ARCHITECTURES_DIR,
) -> list[ArchitectureSpec]:
    if not architectures_dir.exists():
        return []

    specs: list[ArchitectureSpec] = []
    seen_ids: set[str] = set()
    seen_aliases: dict[str, str] = {}

    for path in sorted(architectures_dir.glob("*.yaml")):
        raw_yaml = path.read_text(encoding="utf-8")
        data = yaml.safe_load(raw_yaml)
        if not isinstance(data, dict):
            raise ValueError(f"{path}: architecture YAML must be an object")

        arch_id = str(data.get("id") or "").strip()
        if not arch_id:
            raise ValueError(f"{path}: id is required")
        if arch_id in seen_ids:
            raise ValueError(f"{path}: duplicate architecture id {arch_id!r}")
        seen_ids.add(arch_id)

        arch_type = data.get("type")
        if arch_type not in ALLOWED_ARCH_TYPES:
            raise ValueError(f"{path}: invalid type {arch_type!r}")

        norm_placement = data.get("normPlacement")
        if norm_placement not in ALLOWED_NORM_PLACEMENTS:
            raise ValueError(f"{path}: invalid normPlacement {norm_placement!r}")

        description = data.get("description")
        if not isinstance(description, dict):
            raise ValueError(f"{path}: description.zh and description.en are required")
        description_zh = str(description.get("zh") or "").strip()
        description_en = str(description.get("en") or "").strip()
        if not description_zh or not description_en:
            raise ValueError(f"{path}: description.zh and description.en are required")

        default_params = data.get("defaultParams") or {}
        if not isinstance(default_params, dict):
            raise ValueError(f"{path}: defaultParams must be an object")

        diagram = data.get("diagram") or {}
        if not isinstance(diagram, dict):
            raise ValueError(f"{path}: diagram must be an object")
        nodes = diagram.get("nodes")
        if not isinstance(nodes, list) or not nodes:
            raise ValueError(f"{path}: diagram.nodes must be a non-empty list")
        diagram_nodes = [
            _validate_node(node, f"{path}:diagram.nodes[{i}]")
            for i, node in enumerate(nodes)
        ]

        aliases = [arch_id, *[str(a) for a in data.get("aliases", [])]]
        aliases = list(dict.fromkeys(alias.lower() for alias in aliases if alias))
        for alias in aliases:
            owner = seen_aliases.get(alias)
            if owner and owner != arch_id:
                raise ValueError(
                    f"{path}: alias {alias!r} already belongs to {owner!r}"
                )
            seen_aliases[alias] = arch_id

        specs.append(
            ArchitectureSpec(
                id=arch_id,
                family=str(data.get("family") or arch_id),
                era=str(data.get("era") or ""),
                arch_type=arch_type,
                norm_placement=norm_placement,
                description_zh=description_zh,
                description_en=description_en,
                paper_url=data.get("paperUrl"),
                hf_org=data.get("hfOrg"),
                aliases=aliases,
                default_params=default_params,
                source_links=_optional_list(data, "sourceLinks", path),
                variants=_optional_list(data, "variants", path),
                evidence=_optional_list(data, "evidence", path),
                features=_optional_dict(data, "features", path),
                diagram_subtitle=diagram.get("subtitle"),
                diagram_nodes=diagram_nodes,
                raw_yaml=raw_yaml,
            )
        )

    return specs


def source_hash(
    models_file: Path = OUTPUT_FILE,
    providers_file: Path = PROVIDERS_FILE,
    architectures_dir: Path = ARCHITECTURES_DIR,
) -> str:
    h = hashlib.sha256()
    for path in (models_file, providers_file):
        if path.exists():
            h.update(path.name.encode("utf-8"))
            h.update(path.read_bytes())
    if architectures_dir.exists():
        for path in sorted(architectures_dir.glob("*.yaml")):
            h.update(str(path.relative_to(DATA_DIR)).encode("utf-8"))
            h.update(path.read_bytes())
    return h.hexdigest()


def _scalar_int(value: Any) -> int | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    return None


def _scalar_float(value: Any) -> float | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    return None


def _model_row(model: dict[str, Any], provider_id_by_name: dict[str, str]) -> tuple[Any, ...]:
    provider = model.get("provider") or "unknown"
    moe_intermediate_size = model.get("moeIntermediateSize")
    if moe_intermediate_size is not None:
        moe_intermediate_size_json = _json_text(moe_intermediate_size)
    else:
        moe_intermediate_size_json = None

    return (
        model["id"],
        model.get("name") or model["id"].split("/")[-1],
        provider_id_by_name.get(provider) or provider_slug(provider),
        provider,
        model.get("huggingfaceUrl"),
        model.get("modelscopeUrl"),
        model.get("arxivUrl"),
        model.get("techReport"),
        _scalar_int(model.get("totalParameters")),
        _scalar_int(model.get("activeParameters")),
        _scalar_int(model.get("embeddingParameters")),
        _scalar_int(model.get("nonEmbeddingParameters")),
        _scalar_int(model.get("contextLength")),
        _scalar_int(model.get("embeddingDim")),
        _scalar_int(model.get("vocabSize")),
        model.get("architecture"),
        model.get("architectureFamily"),
        _scalar_int(model.get("numLayers")),
        _scalar_int(model.get("numHeads")),
        _scalar_int(model.get("numKvHeads")),
        _scalar_int(model.get("hiddenSize")),
        _scalar_int(model.get("intermediateSize")),
        model.get("positionEncoding"),
        model.get("activation"),
        model.get("normType"),
        _scalar_float(model.get("normEps")),
        _scalar_float(model.get("attentionDropout")),
        _scalar_float(model.get("mlpFactor")),
        _scalar_float(model.get("gqaRatio")),
        model.get("torchDtype"),
        1 if model.get("isMoe") else 0,
        _scalar_int(model.get("numExperts")),
        _scalar_int(model.get("numSharedExperts")),
        _scalar_int(model.get("numExpertsPerToken")),
        _scalar_int(model.get("numActivatedExperts")),
        moe_intermediate_size_json,
        _json_text(model.get("inputModalities") or []),
        _json_text(model.get("outputModalities") or []),
        model.get("openness"),
        model.get("task"),
        model.get("knowledgeCutoff"),
        model.get("parameterConfidence"),
        model.get("parameterSource"),
        model.get("parameterSourceUrl"),
        model.get("nameNote"),
        model.get("createdAt"),
        model.get("updatedAt"),
        _json_text(model),
    )


def build_sqlite(
    sqlite_file: Path = SQLITE_FILE,
    models_file: Path = OUTPUT_FILE,
) -> dict[str, Any]:
    if not models_file.exists():
        raise FileNotFoundError(f"models file not found: {models_file}")

    models = _load_json(models_file)
    if not isinstance(models, list):
        raise ValueError(f"{models_file}: expected a JSON array")
    duplicate_ids = sorted(
        model_id
        for model_id in {m.get("id") for m in models if isinstance(m, dict)}
        if sum(1 for m in models if isinstance(m, dict) and m.get("id") == model_id) > 1
    )
    if duplicate_ids:
        raise ValueError(f"duplicate model ids: {', '.join(duplicate_ids[:10])}")

    architectures = load_architectures()
    provider_rows = _provider_rows(models)
    provider_id_by_name = {row["display_name"]: row["id"] for row in provider_rows}
    digest = source_hash(models_file=models_file)

    sqlite_file.parent.mkdir(parents=True, exist_ok=True)
    if sqlite_file.exists():
        sqlite_file.unlink()

    conn = sqlite3.connect(sqlite_file)
    try:
        conn.executescript(SCHEMA_SQL)
        conn.executemany(
            """
            INSERT INTO providers (
              id, display_name, name_en, name_zh, region, orgs_json, scan_json, raw_json
            ) VALUES (
              :id, :display_name, :name_en, :name_zh, :region,
              :orgs_json, :scan_json, :raw_json
            )
            """,
            provider_rows,
        )
        conn.executemany(
            """
            INSERT INTO models (
              id, name, provider_id, provider, huggingface_url, modelscope_url,
              arxiv_url, tech_report, total_parameters, active_parameters,
              embedding_parameters, non_embedding_parameters, context_length,
              embedding_dim, vocab_size, architecture, architecture_family,
              num_layers, num_heads, num_kv_heads, hidden_size, intermediate_size,
              position_encoding, activation, norm_type, norm_eps, attention_dropout,
              mlp_factor, gqa_ratio, torch_dtype, is_moe, num_experts,
              num_shared_experts, num_experts_per_token, num_activated_experts,
              moe_intermediate_size_json, input_modalities_json, output_modalities_json,
              openness, task, knowledge_cutoff, parameter_confidence, parameter_source,
              parameter_source_url, name_note, created_at, updated_at, raw_json
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?
            )
            """,
            [_model_row(m, provider_id_by_name) for m in models if isinstance(m, dict)],
        )
        conn.executemany(
            """
            INSERT INTO architectures (
              id, family, era, type, norm_placement, description_zh, description_en,
              paper_url, hf_org, default_params_json, source_links_json,
              variants_json, evidence_json, features_json, diagram_subtitle,
              diagram_nodes_json, raw_yaml
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    a.id,
                    a.family,
                    a.era,
                    a.arch_type,
                    a.norm_placement,
                    a.description_zh,
                    a.description_en,
                    a.paper_url,
                    a.hf_org,
                    _json_text(a.default_params),
                    _json_text(a.source_links),
                    _json_text(a.variants),
                    _json_text(a.evidence),
                    _json_text(a.features),
                    a.diagram_subtitle,
                    _json_text(a.diagram_nodes),
                    a.raw_yaml,
                )
                for a in architectures
            ],
        )
        conn.executemany(
            "INSERT INTO architecture_aliases (alias, architecture_id) VALUES (?, ?)",
            [(alias, a.id) for a in architectures for alias in a.aliases],
        )
        conn.execute(
            """
            INSERT INTO sync_runs (source_hash, model_count, architecture_count)
            VALUES (?, ?, ?)
            """,
            (digest, len(models), len(architectures)),
        )
        conn.commit()
    finally:
        conn.close()

    return {
        "sqlite_file": sqlite_file,
        "source_hash": digest,
        "model_count": len(models),
        "provider_count": len(provider_rows),
        "architecture_count": len(architectures),
    }


def _sql_literal(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def _insert_statement(table: str, row: sqlite3.Row) -> str:
    columns = row.keys()
    values = ", ".join(_sql_literal(row[column]) for column in columns)
    column_sql = ", ".join(columns)
    return f"INSERT INTO {table} ({column_sql}) VALUES ({values});"


def write_seed_sql(
    sqlite_file: Path = SQLITE_FILE,
    seed_file: Path = SEED_SQL_FILE,
) -> dict[str, Any]:
    if not sqlite_file.exists():
        raise FileNotFoundError(f"sqlite database not found: {sqlite_file}")

    seed_file.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(sqlite_file)
    conn.row_factory = sqlite3.Row
    try:
        lines = [
            "-- Generated by modelsheet db seed. Do not edit manually.",
            "PRAGMA foreign_keys=OFF;",
            "BEGIN TRANSACTION;",
            "DELETE FROM architecture_aliases;",
            "DELETE FROM architectures;",
            "DELETE FROM models;",
            "DELETE FROM providers;",
            "DELETE FROM sync_runs;",
        ]
        for table in ("providers", "models", "architectures", "architecture_aliases", "sync_runs"):
            rows = conn.execute(f"SELECT * FROM {table}").fetchall()
            lines.extend(_insert_statement(table, row) for row in rows)
        lines.extend(["COMMIT;", "PRAGMA foreign_keys=ON;", ""])
        seed_file.write_text("\n".join(lines), encoding="utf-8")

        sync = conn.execute(
            "SELECT source_hash, model_count, architecture_count FROM sync_runs ORDER BY id DESC LIMIT 1"
        ).fetchone()
    finally:
        conn.close()

    return {
        "seed_file": seed_file,
        "source_hash": sync["source_hash"] if sync else None,
        "model_count": sync["model_count"] if sync else 0,
        "architecture_count": sync["architecture_count"] if sync else 0,
    }


def verify_sqlite(
    sqlite_file: Path = SQLITE_FILE,
    models_file: Path = OUTPUT_FILE,
) -> dict[str, Any]:
    if not sqlite_file.exists():
        raise FileNotFoundError(f"sqlite database not found: {sqlite_file}")
    if not models_file.exists():
        raise FileNotFoundError(f"models file not found: {models_file}")

    models = _load_json(models_file)
    architectures = load_architectures()
    expected_model_count = len(models)
    expected_architecture_count = len(architectures)

    ids = [m.get("id") for m in models if isinstance(m, dict)]
    duplicate_ids = sorted({model_id for model_id in ids if ids.count(model_id) > 1})
    if duplicate_ids:
        raise ValueError(f"duplicate model ids: {', '.join(duplicate_ids[:10])}")

    conn = sqlite3.connect(sqlite_file)
    try:
        model_count = conn.execute("SELECT COUNT(*) FROM models").fetchone()[0]
        provider_count = conn.execute("SELECT COUNT(*) FROM providers").fetchone()[0]
        architecture_count = conn.execute("SELECT COUNT(*) FROM architectures").fetchone()[0]
        alias_count = conn.execute("SELECT COUNT(*) FROM architecture_aliases").fetchone()[0]
        missing_provider_refs = conn.execute(
            """
            SELECT COUNT(*)
            FROM models m
            LEFT JOIN providers p ON p.id = m.provider_id
            WHERE p.id IS NULL
            """
        ).fetchone()[0]
        bad_alias_refs = conn.execute(
            """
            SELECT COUNT(*)
            FROM architecture_aliases aa
            LEFT JOIN architectures a ON a.id = aa.architecture_id
            WHERE a.id IS NULL
            """
        ).fetchone()[0]
        sync = conn.execute(
            "SELECT source_hash FROM sync_runs ORDER BY id DESC LIMIT 1"
        ).fetchone()
    finally:
        conn.close()

    if model_count != expected_model_count:
        raise ValueError(f"model count mismatch: sqlite={model_count}, json={expected_model_count}")
    if architecture_count != expected_architecture_count:
        raise ValueError(
            "architecture count mismatch: "
            f"sqlite={architecture_count}, yaml={expected_architecture_count}"
        )
    if missing_provider_refs:
        raise ValueError(f"{missing_provider_refs} model(s) reference missing providers")
    if bad_alias_refs:
        raise ValueError(f"{bad_alias_refs} alias(es) reference missing architectures")

    return {
        "model_count": model_count,
        "provider_count": provider_count,
        "architecture_count": architecture_count,
        "alias_count": alias_count,
        "source_hash": sync[0] if sync else None,
    }
