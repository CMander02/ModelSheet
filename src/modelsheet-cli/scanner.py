"""Scan HuggingFace and ModelScope orgs for new models and diff against database."""

import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional

import httpx
from rich.console import Console

from .config import DATA_DIR, OUTPUT_FILE, PROVIDERS_FILE, load_provider_map, HF_MIRROR_API_URL
from .filters import skip_reason

console = Console()

HF_API_URL = "https://huggingface.co/api"
HF_MIRROR_API_BASE = HF_MIRROR_API_URL.removesuffix("/models")
MS_API_URL = "https://modelscope.cn"

# Snapshot file stores org→[model_ids] from last scan
SNAPSHOT_FILE = DATA_DIR / "scan_snapshot.json"

MAX_WORKERS = 4


def _get_hf_token() -> Optional[str]:
    return os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")


def _get_ms_token() -> Optional[str]:
    return os.environ.get("MS_TOKEN") or os.environ.get("MODELSCOPE_API_TOKEN")


# ---------------------------------------------------------------------------
# HuggingFace scanning
# ---------------------------------------------------------------------------

def fetch_hf_org_models(
    org: str,
    client: httpx.Client,
    limit: int = 500,
) -> list[dict]:
    """Fetch all model cards for an org from HuggingFace API.

    Returns list of dicts with keys: id, pipeline_tag, tags, createdAt.
    """
    models = []
    params = {
        "author": org,
        "limit": limit,
        "full": "false",
        "cardData": "false",
        "sort": "createdAt",
        "direction": -1,
    }
    last_error = None
    for api_base in (HF_API_URL, HF_MIRROR_API_BASE):
        try:
            resp = client.get(f"{api_base}/models", params=params)
            resp.raise_for_status()
            data = resp.json()
            if api_base == HF_MIRROR_API_BASE:
                console.print(f"[dim]  HF org fallback → hf-mirror: {org}[/dim]")
            for m in data:
                models.append({
                    "id": m.get("id", ""),
                    "pipeline_tag": m.get("pipeline_tag"),
                    "tags": m.get("tags", []),
                    "created_at": m.get("createdAt"),
                    "source": "huggingface",
                })
            return models
        except Exception as e:
            last_error = e
            continue

    console.print(f"[yellow]  WARN HF {org}: {last_error}[/yellow]")

    return models


# ---------------------------------------------------------------------------
# ModelScope scanning
# ---------------------------------------------------------------------------

def fetch_ms_org_models(
    org: str,
    client: httpx.Client,
    limit: int = 200,
) -> list[dict]:
    """Fetch all models for an org from ModelScope API (PUT-based).

    ModelScope API changed from GET to PUT. Uses:
      PUT {MS_API_URL}/api/v1/models/
      Body: {"Path": org, "PageNumber": n, "PageSize": limit}

    Returns list of dicts compatible with HF format.
    """
    models = []
    url = f"{MS_API_URL}/api/v1/models/"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    token = _get_ms_token()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    page = 1
    while True:
        try:
            body = json.dumps({
                "Path": org,
                "PageNumber": page,
                "PageSize": limit,
            })
            resp = client.put(url, content=body, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            items = (data.get("Data", {}) or {}).get("Models", [])
            if not items:
                break
            for m in items:
                path = m.get("Path", "")
                name = m.get("Name", "")
                ms_id = f"{path}/{name}" if path and name else (m.get("Path") or m.get("Name") or "")
                tasks = m.get("Tasks") or []
                pipeline_tag = tasks[0]["Name"] if tasks and isinstance(tasks[0], dict) else None
                models.append({
                    "id": ms_id,
                    "pipeline_tag": pipeline_tag,
                    "tags": m.get("Tags", []),
                    "created_at": m.get("CreatedTime"),
                    "source": "modelscope",
                })
            total = (data.get("Data", {}) or {}).get("TotalCount", 0)
            if len(items) < limit or page * limit >= total:
                break
            page += 1
        except Exception as e:
            console.print(f"[yellow]  WARN MS {org}: {e}[/yellow]")
            break

    return models


# ---------------------------------------------------------------------------
# Snapshot management
# ---------------------------------------------------------------------------

def rewrite_ms_name(ms_id: str, rewrites: dict[str, str]) -> str:
    """Apply ms_name_rewrites rules to convert a MS model ID to HF style.

    Two types of rules supported:
    1. Exact match: if the whole ms_id equals the key → use the value as-is
    2. Suffix strip: if the key starts with '-' (e.g. '-Pretrained'),
       remove that suffix from the name portion (after '/').

    Applied in order; first match wins.
    Returns the original ms_id if no rule matches.
    """
    for pattern, replacement in (rewrites or {}).items():
        # Type 1: exact full-ID match
        if '/' not in pattern and not pattern.startswith('-'):
            # It's a name-only match — compare against name portion
            name = ms_id.split('/')[-1] if '/' in ms_id else ms_id
            if name == pattern:
                return ms_id.replace(name, replacement)
        elif '/' in pattern and ms_id == pattern:
            return replacement
        # Type 2: suffix strip (key starts with '-')
        elif pattern.startswith('-') and ms_id.endswith(pattern):
            return ms_id[: -len(pattern)] + replacement
    return ms_id


def load_ms_name_rewrites() -> dict[str, dict[str, str]]:
    """Load ms_name_rewrites from providers.json, keyed by MS org name.

    Returns:
        {ms_org: {pattern: replacement, ...}}
    """
    from .config import PROVIDERS_FILE
    try:
        data = json.loads(PROVIDERS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}
    result: dict[str, dict[str, str]] = {}
    for cfg in data.get("providers", {}).values():
        rewrites = cfg.get("ms_name_rewrites") or {}
        if not rewrites:
            continue
        for ms_org in cfg.get("scan", {}).get("ms", []):
            result[ms_org] = rewrites
    return result


def load_snapshot() -> dict:
    """Load previous scan snapshot. Keys: hf/<org> or ms/<org> → [model_ids]."""
    if not SNAPSHOT_FILE.exists():
        return {}
    try:
        return json.loads(SNAPSHOT_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_snapshot(snapshot: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    SNAPSHOT_FILE.write_text(
        json.dumps(snapshot, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


# ---------------------------------------------------------------------------
# Filtering helpers
# ---------------------------------------------------------------------------

def _apply_filters(models: list[dict]) -> tuple[list[dict], list[tuple[str, str]]]:
    """Split models into (keep, skipped) based on filter rules.

    Returns:
        kept: models that pass all filters
        skipped: list of (model_id, reason) tuples
    """
    kept = []
    skipped = []
    for m in models:
        reason = skip_reason(
            model_id=m["id"],
            pipeline_tag=m.get("pipeline_tag"),
            tags=m.get("tags"),
        )
        if reason:
            skipped.append((m["id"], reason))
        else:
            kept.append(m)
    return kept, skipped


# ---------------------------------------------------------------------------
# Main scan logic
# ---------------------------------------------------------------------------

def scan_orgs(
    orgs: list[tuple[str, str]],   # list of (source, org) — source: "hf" or "ms"
    apply_filters: bool = True,
    show_skipped: bool = False,
) -> dict:
    """Scan orgs, diff against snapshot, and return new model candidates.

    Args:
        orgs: list of (source, org_name) pairs
        apply_filters: whether to apply skip filters
        show_skipped: whether to print skipped model details

    Returns:
        dict with keys:
            new_models: list of model dicts that are new since last snapshot
            all_models: full list of models found (after filtering)
            skipped: list of (model_id, reason) tuples
            snapshot_updated: new snapshot dict (call save_snapshot to persist)
    """
    snapshot = load_snapshot()
    all_fetched: list[dict] = []
    all_skipped: list[tuple[str, str]] = []

    # Build HTTP client
    headers = {}
    token = _get_hf_token()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    with httpx.Client(timeout=30, follow_redirects=True) as hf_client:
        with httpx.Client(timeout=30, follow_redirects=True) as ms_client:

            def fetch_org(source_org):
                source, org = source_org
                if source == "hf":
                    models = fetch_hf_org_models(org, hf_client)
                else:
                    models = fetch_ms_org_models(org, ms_client)
                return source, org, models

            with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
                futures = {executor.submit(fetch_org, so): so for so in orgs}
                for future in as_completed(futures):
                    source, org, models = future.result()
                    console.print(f"  {source}/{org}: {len(models)} models found")
                    all_fetched.extend(models)

    # Apply filters
    if apply_filters:
        kept, skipped = _apply_filters(all_fetched)
        all_skipped.extend(skipped)
    else:
        kept = all_fetched

    if show_skipped and all_skipped:
        console.print(f"\n[dim]Filtered out {len(all_skipped)} models:[/dim]")
        for mid, reason in all_skipped[:20]:
            console.print(f"  [dim]- {mid}: {reason}[/dim]")
        if len(all_skipped) > 20:
            console.print(f"  [dim]... and {len(all_skipped) - 20} more[/dim]")

    # Load database to find already-tracked models
    known_ids: set[str] = set()
    if OUTPUT_FILE.exists():
        try:
            db = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
            known_ids = {m["id"] for m in db}
        except Exception:
            pass

    # Build new snapshot
    # Map "hf"/"ms" source codes to model dict source values
    _SOURCE_MAP = {"hf": "huggingface", "ms": "modelscope"}
    new_snapshot = dict(snapshot)
    for source, org in orgs:
        key = f"{source}/{org}"
        model_source = _SOURCE_MAP.get(source, source)
        org_models = [m["id"] for m in kept if m.get("source") == model_source
                      and m["id"].split("/")[0].lower() == org.lower()]
        new_snapshot[key] = org_models

    # Compute diff: models in new snapshot but not in previous snapshot AND not in DB
    prev_all_ids: set[str] = set()
    for key, ids in snapshot.items():
        prev_all_ids.update(ids)

    # Load ms_name_rewrites rules for cross-source dedup
    ms_rewrites = load_ms_name_rewrites()
    # Build reverse map: ms_org → [hf_orgs]
    ms_to_hf_orgs: dict[str, list[str]] = {}
    try:
        prov_data = json.loads(PROVIDERS_FILE.read_text(encoding="utf-8"))
        for cfg in prov_data.get("providers", {}).values():
            ms_orgs = cfg.get("scan", {}).get("ms", [])
            hf_orgs = cfg.get("orgs", []) + cfg.get("scan", {}).get("hf", [])
            for ms_o in ms_orgs:
                ms_to_hf_orgs[ms_o] = list(dict.fromkeys(hf_orgs))  # dedup, preserve order
    except Exception:
        pass

    # Build reverse lookup: rewrite → original MS ID for reporting
    rewrite_matched: dict[str, str] = {}  # ms_id → hf_equivalent
    matched_by_rewrite: set[str] = set()

    new_model_candidates = []
    for m in kept:
        if m["id"] in known_ids or m["id"] in prev_all_ids:
            continue
        # For MS models, check if name rewrite maps to an already-tracked HF model
        if m.get("source") == "modelscope":
            ms_org = m["id"].split("/")[0]
            ms_name = m["id"].split("/")[-1] if "/" in m["id"] else ""
            org_rewrites = ms_rewrites.get(ms_org, {})
            rewritten_name = ms_name
            if org_rewrites:
                full_rewritten = rewrite_ms_name(m["id"], org_rewrites)
                rewritten_name = full_rewritten.split("/")[-1] if "/" in full_rewritten else full_rewritten
            # Check against all candidate HF orgs
            hf_orgs = ms_to_hf_orgs.get(ms_org, [])
            found_in_db = False
            for hf_org in hf_orgs:
                hf_candidate = f"{hf_org}/{rewritten_name}"
                if hf_candidate in known_ids:
                    found_in_db = True
                    rewrite_matched[m["id"]] = hf_candidate
                    matched_by_rewrite.add(m["id"])
                    console.print(
                        f"  [dim]↳ MS {m['id']} matched HF [cyan]{hf_candidate}[/cyan] via rewrite & org map[/dim]"
                    )
                    break
            if found_in_db:
                continue
        new_model_candidates.append(m)

    # Also find models in DB that now appear on source (for cross-reference)
    return {
        "new_models": new_model_candidates,
        "all_models": kept,
        "skipped": all_skipped,
        "snapshot_updated": new_snapshot,
    }


def get_scan_orgs_from_providers(source_filter: Optional[str] = None) -> list[tuple[str, str]]:
    """Build (source, org) list from providers.json.

    providers.json entries may have a "scan" field:
        "scan": {
            "hf": ["Qwen"],
            "ms": ["qwen-bot"]
        }
    If no "scan" field, falls back to using the "orgs" list for HF.

    Args:
        source_filter: if "hf" or "ms", only return that source

    Returns:
        List of (source, org) tuples
    """
    try:
        from .config import PROVIDERS_FILE
        data = json.loads(PROVIDERS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []

    hf_entries = []
    ms_entries = []
    for _display_name, info in data.get("providers", {}).items():
        scan = info.get("scan", {})
        hf_orgs = scan.get("hf", info.get("orgs", []))
        ms_orgs = scan.get("ms", [])
        is_cn = info.get("region") == "cn"

        if source_filter != "ms":
            for org in hf_orgs:
                hf_entries.append(("hf", org, is_cn))
        if source_filter != "hf":
            for org in ms_orgs:
                ms_entries.append(("ms", org, is_cn))

    # CN providers: ms first, then hf. Global providers: hf only (no ms entries).
    # Within each source, cn orgs appear before global orgs.
    result = []
    for source, org, _ in sorted(ms_entries, key=lambda x: (not x[2],)):
        result.append((source, org))
    for source, org, is_cn in sorted(hf_entries, key=lambda x: (not x[2],)):
        result.append((source, org))

    return result


# ---------------------------------------------------------------------------
# Watchlist management (for monitoring/tracking orgs outside providers.json)
# ---------------------------------------------------------------------------

def load_watchlist() -> dict:
    """Load the watchlist config."""
    from .config import WATCHLIST_FILE
    if WATCHLIST_FILE.exists():
        try:
            return json.loads(WATCHLIST_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"orgs": [], "snapshots": {}}


def save_watchlist(watchlist: dict) -> None:
    """Save the watchlist config."""
    from .config import WATCHLIST_FILE
    WATCHLIST_FILE.write_text(
        json.dumps(watchlist, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def watchlist_add_org(slug: str, sources: Optional[list[str]] = None) -> bool:
    """Add an org slug to the watchlist. Returns True if newly added.

    Args:
        slug: Org slug (e.g. 'mistralai')
        sources: List of sources to scan (e.g. ['hf'] or ['hf', 'ms']).
                 Defaults to ['hf'].
    """
    wl = load_watchlist()
    orgs = wl.setdefault("orgs", [])
    slug = slug.strip().lower()
    sources = sources or ["hf"]
    if slug in orgs:
        return False
    orgs.append(slug)
    wl.setdefault("sources", {})[slug] = sources
    wl.setdefault("snapshots", {})[slug] = []
    save_watchlist(wl)
    return True


def watchlist_add_orgs(slugs: list[str], sources: Optional[list[str]] = None) -> list[str]:
    """Add multiple org slugs to the watchlist. Returns list of newly added."""
    wl = load_watchlist()
    orgs = wl.setdefault("orgs", [])
    srcs = wl.setdefault("sources", {})
    sources = sources or ["hf"]
    added = []
    for slug in slugs:
        slug = slug.strip().lower()
        if slug not in orgs:
            orgs.append(slug)
            srcs[slug] = sources
            wl.setdefault("snapshots", {}).setdefault(slug, [])
            added.append(slug)
    if added:
        save_watchlist(wl)
    return added


def watchlist_remove_org(slug: str) -> bool:
    """Remove an org slug from the watchlist. Returns True if removed."""
    wl = load_watchlist()
    orgs = wl.get("orgs", [])
    slug = slug.strip().lower()
    if slug not in orgs:
        return False
    wl["orgs"] = [o for o in orgs if o != slug]
    wl.get("snapshots", {}).pop(slug, None)
    wl.get("sources", {}).pop(slug, None)
    save_watchlist(wl)
    return True


def watchlist_remove_orgs(slugs: list[str]) -> list[str]:
    """Remove multiple org slugs from the watchlist. Returns list of removed."""
    wl = load_watchlist()
    orgs = wl.get("orgs", [])
    removed = []
    for slug in slugs:
        slug = slug.strip().lower()
        if slug in orgs:
            removed.append(slug)
    if removed:
        wl["orgs"] = [o for o in orgs if o.lower().strip() not in removed]
        for slug in removed:
            wl.get("snapshots", {}).pop(slug, None)
            wl.get("sources", {}).pop(slug, None)
        save_watchlist(wl)
    return removed


def watchlist_get_orgs() -> list[str]:
    """Get the list of watched org slugs."""
    wl = load_watchlist()
    return sorted(wl.get("orgs", []))


def get_scan_orgs_from_watchlist(source_filter: Optional[str] = None) -> list[tuple[str, str]]:
    """Get (source, org) tuples from the watchlist for scanning.

    Args:
        source_filter: if 'hf' or 'ms', only return that source

    Returns:
        List of (source, org) tuples
    """
    wl = load_watchlist()
    srcs = wl.get("sources", {})
    result = []
    for org in wl.get("orgs", []):
        org_sources = srcs.get(org, ["hf"])
        for source in org_sources:
            if source_filter and source != source_filter:
                continue
            result.append((source, org))
    return result


def get_watchlist_snapshot(org: str, wl: dict = None) -> set[str]:
    """Get the snapshot of known model IDs for a watched org."""
    if wl is None:
        wl = load_watchlist()
    return set(wl.get("snapshots", {}).get(org, []))


def update_watchlist_snapshot(org: str, model_ids: list[str]):
    """Update the snapshot for a watched org."""
    wl = load_watchlist()
    wl.setdefault("snapshots", {})[org] = sorted(model_ids)
    save_watchlist(wl)
