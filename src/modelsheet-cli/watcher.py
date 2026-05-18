"""HuggingFace organization model watcher — polls for new/updated models."""

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import httpx
from rich.console import Console
from rich.table import Table

from .config import DATA_DIR, PROJECT_ROOT, load_provider_map, HF_MIRROR_API_URL
from .fetcher import get_hf_token

console = Console()

HF_API_URL = "https://huggingface.co/api/models"
WATCH_DB = DATA_DIR / "watch_state.db"

# Priority orgs to monitor (derives from providers.json at runtime, this is the fallback)
DEFAULT_PRIORITY_ORGS = [
    "meta-llama",
    "Qwen",
    "deepseek-ai",
    "mistralai",
    "google",
    "microsoft",
    "THUDM",
    "internlm",
    "01-ai",
    "CohereForAI",
    "nvidia",
    "apple",
    "xai-org",
    "ByteDance-Seed",
    "moonshotai",
    "tencent",
    "inceptionlabs",
]


def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(WATCH_DB)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS seen_models (
            model_id TEXT PRIMARY KEY,
            org TEXT NOT NULL,
            last_modified TEXT,
            first_seen TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS watch_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_at TEXT NOT NULL,
            orgs_checked INTEGER,
            new_models INTEGER
        )
    """)
    conn.commit()
    return conn


def _get_orgs_from_providers() -> list[str]:
    """Extract all org slugs from providers.json."""
    providers_file = DATA_DIR / "providers.json"
    if not providers_file.exists():
        return DEFAULT_PRIORITY_ORGS

    with open(providers_file, encoding="utf-8") as f:
        data = json.load(f)

    orgs = []
    for provider_config in data.get("providers", {}).values():
        orgs.extend(provider_config.get("orgs", []))
    return orgs


def _fetch_org_recent_models(
    client: httpx.Client,
    org: str,
    limit: int = 20,
) -> list[dict]:
    """Fetch the most recently modified models for an org."""
    params = {
        "author": org,
        "sort": "lastModified",
        "direction": -1,
        "limit": limit,
    }
    last_error = None
    for url in (HF_API_URL, HF_MIRROR_API_URL):
        try:
            resp = client.get(url, params=params, timeout=5)
            resp.raise_for_status()
            if url == HF_MIRROR_API_URL:
                console.print(f"[dim]  HF watch fallback → hf-mirror: {org}[/dim]")
            return resp.json()
        except Exception as exc:
            last_error = exc
            continue
    console.print(f"[yellow]  Warning: failed to fetch {org}: {last_error}[/yellow]")
    return []


def run_watch(
    orgs: Optional[list[str]] = None,
    limit_per_org: int = 20,
    quiet: bool = False,
) -> list[dict]:
    """Poll HuggingFace for new or updated models across orgs.

    Returns a list of newly discovered model dicts.
    """
    token = get_hf_token()
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    target_orgs = orgs or _get_orgs_from_providers()

    if not quiet:
        console.print(f"[bold]Checking {len(target_orgs)} organisations on HuggingFace…[/bold]")

    new_models: list[dict] = []
    now = datetime.now(timezone.utc).isoformat()

    with sqlite3.connect(WATCH_DB) as conn:
        # Ensure schema exists
        conn.execute("""
            CREATE TABLE IF NOT EXISTS seen_models (
                model_id TEXT PRIMARY KEY,
                org TEXT NOT NULL,
                last_modified TEXT,
                first_seen TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS watch_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_at TEXT NOT NULL,
                orgs_checked INTEGER,
                new_models INTEGER
            )
        """)

        with httpx.Client(
            headers=headers,
            follow_redirects=True,
            proxy="http://127.0.0.1:7890",
        ) as client:
            for org in target_orgs:
                if not quiet:
                    console.print(f"  [dim]→ {org}[/dim]", end="")

                models = _fetch_org_recent_models(client, org, limit=limit_per_org)

                org_new = 0
                for m in models:
                    model_id = m.get("id") or m.get("modelId", "")
                    last_modified = m.get("lastModified", "")

                    row = conn.execute(
                        "SELECT last_modified FROM seen_models WHERE model_id = ?",
                        (model_id,),
                    ).fetchone()

                    if row is None:
                        # Brand new model never seen before
                        conn.execute(
                            "INSERT INTO seen_models VALUES (?, ?, ?, ?)",
                            (model_id, org, last_modified, now),
                        )
                        new_models.append({
                            "model_id": model_id,
                            "org": org,
                            "last_modified": last_modified,
                            "status": "new",
                        })
                        org_new += 1
                    elif row[0] != last_modified:
                        # Model was updated since last check
                        conn.execute(
                            "UPDATE seen_models SET last_modified = ? WHERE model_id = ?",
                            (last_modified, model_id),
                        )
                        new_models.append({
                            "model_id": model_id,
                            "org": org,
                            "last_modified": last_modified,
                            "status": "updated",
                        })
                        org_new += 1

                if not quiet:
                    if org_new:
                        console.print(f" [green]+{org_new}[/green]")
                    else:
                        console.print(" [dim]no change[/dim]")

        conn.execute(
            "INSERT INTO watch_runs (run_at, orgs_checked, new_models) VALUES (?, ?, ?)",
            (now, len(target_orgs), len(new_models)),
        )

    return new_models


def print_watch_results(new_models: list[dict]) -> None:
    if not new_models:
        console.print("[green]✓ No new or updated models found.[/green]")
        return

    table = Table(title=f"{len(new_models)} model(s) detected", show_lines=True)
    table.add_column("Status", style="bold", width=8)
    table.add_column("Model ID")
    table.add_column("Org", width=20)
    table.add_column("Last Modified", width=22)

    for m in new_models:
        status_style = "green" if m["status"] == "new" else "yellow"
        table.add_row(
            f"[{status_style}]{m['status']}[/{status_style}]",
            m["model_id"],
            m["org"],
            m["last_modified"],
        )

    console.print(table)
