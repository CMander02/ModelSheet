"""Apply a generated ModelSheet D1 seed SQL file through Cloudflare's D1 API."""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import tomllib
import urllib.error
import urllib.request
from pathlib import Path


SKIP_PREFIXES = (
    "pragma ",
    "begin",
    "commit",
    "rollback",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", default="data/d1/seed.sql", help="Path to seed.sql")
    parser.add_argument(
        "--wrangler",
        default="src/modelsheet-web/wrangler.toml",
        help="Path to wrangler.toml containing the D1 database_id",
    )
    parser.add_argument(
        "--database-id",
        default=os.environ.get("CLOUDFLARE_D1_DATABASE_ID"),
        help="Cloudflare D1 database UUID. Defaults to wrangler.toml.",
    )
    parser.add_argument(
        "--account-id",
        default=os.environ.get("CLOUDFLARE_ACCOUNT_ID"),
        help="Cloudflare account ID. Defaults to CLOUDFLARE_ACCOUNT_ID.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=50,
        help="Number of SQL statements per D1 query request.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse inputs and print the planned batch count without calling Cloudflare.",
    )
    parser.add_argument(
        "--write-d1-file",
        help="Write a transaction-free SQL file that Wrangler can import into D1, then exit.",
    )
    return parser.parse_args()


def database_id_from_wrangler(path: Path) -> str | None:
    if not path.exists():
        return None

    data = tomllib.loads(path.read_text(encoding="utf-8"))
    for database in data.get("d1_databases", []):
        database_id = database.get("database_id")
        if database_id:
            return database_id
    return None


def iter_sql_statements(sql: str) -> list[str]:
    statements: list[str] = []
    buffer: list[str] = []

    for line in sql.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("--"):
            continue

        buffer.append(line)
        candidate = "\n".join(buffer).strip()
        if sqlite3.complete_statement(candidate):
            statement = candidate.rstrip(";").strip()
            buffer = []
            if not statement:
                continue
            lowered = statement.lower()
            if lowered.startswith(SKIP_PREFIXES):
                continue
            statements.append(statement)

    if buffer:
        raise ValueError("seed SQL ended with an incomplete statement")

    return statements


def chunks(items: list[str], size: int) -> list[list[str]]:
    if size <= 0:
        raise ValueError("--batch-size must be positive")
    return [items[index : index + size] for index in range(0, len(items), size)]


def write_d1_file(path: Path, statements: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(";\n".join(statements) + ";\n", encoding="utf-8")


def d1_query(account_id: str, database_id: str, token: str, sql: str) -> dict:
    url = (
        "https://api.cloudflare.com/client/v4/accounts/"
        f"{account_id}/d1/database/{database_id}/query"
    )
    body = json.dumps({"sql": sql}).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        payload = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"D1 query failed with HTTP {error.code}: {payload}") from error


def response_ok(payload: dict) -> tuple[bool, str]:
    if not payload.get("success", False):
        return False, json.dumps(payload.get("errors", payload), ensure_ascii=False)

    for result in payload.get("result", []):
        if isinstance(result, dict) and not result.get("success", True):
            return False, json.dumps(result, ensure_ascii=False)

    return True, ""


def main() -> int:
    args = parse_args()
    root = Path.cwd()
    seed_path = (root / args.seed).resolve()
    wrangler_path = (root / args.wrangler).resolve()
    database_id = args.database_id or database_id_from_wrangler(wrangler_path)
    account_id = args.account_id
    token = os.environ.get("CLOUDFLARE_API_TOKEN")

    if not seed_path.exists():
        raise FileNotFoundError(seed_path)

    statements = iter_sql_statements(seed_path.read_text(encoding="utf-8"))
    batches = chunks(statements, args.batch_size)
    print(f"Prepared {len(statements)} statements in {len(batches)} batches")

    if args.write_d1_file:
        target = (root / args.write_d1_file).resolve()
        write_d1_file(target, statements)
        print(f"Wrote D1-compatible SQL: {target}")
        return 0

    if args.dry_run:
        return 0
    if not database_id:
        raise RuntimeError("D1 database_id not provided and not found in wrangler.toml")
    if not account_id:
        raise RuntimeError("CLOUDFLARE_ACCOUNT_ID is required")
    if not token:
        raise RuntimeError("CLOUDFLARE_API_TOKEN is required")

    for index, batch in enumerate(batches, start=1):
        payload = d1_query(account_id, database_id, token, ";\n".join(batch))
        ok, error = response_ok(payload)
        if not ok:
            raise RuntimeError(f"D1 batch {index}/{len(batches)} failed: {error}")
        print(f"Applied batch {index}/{len(batches)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
