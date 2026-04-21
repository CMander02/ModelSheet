"""
Backfill the `provider` field in data/models.json based on the current
providers.json mapping.

For every model, derive the HF org from its id (first path segment) and map
it to the canonical display name via providers.json.  Falls back to the raw
org name when no mapping exists (so we surface coverage gaps).

Usage: python scripts/backfill_provider.py [--dry-run]
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODELS_FILE = ROOT / "data" / "models.json"
PROVIDERS_FILE = ROOT / "data" / "providers.json"


def build_org_map() -> dict[str, str]:
    with PROVIDERS_FILE.open(encoding="utf-8") as f:
        p = json.load(f)
    org_to_display: dict[str, str] = {}
    for display_name, cfg in p.get("providers", {}).items():
        for org in cfg.get("orgs", []):
            org_to_display[org] = display_name
    return org_to_display


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Don't write file")
    args = parser.parse_args()

    org_map = build_org_map()
    with MODELS_FILE.open(encoding="utf-8") as f:
        data = json.load(f)

    changed: list[tuple[str, str, str]] = []
    unmapped = Counter()

    for m in data:
        mid = m.get("id", "")
        org = mid.split("/")[0] if "/" in mid else ""
        if not org:
            continue
        display = org_map.get(org, org)
        if display == org:
            unmapped[org] += 1
        old = m.get("provider")
        if old != display:
            changed.append((mid, str(old), display))
            m["provider"] = display

    print(f"Total models: {len(data)}")
    print(f"Provider changes: {len(changed)}")
    for mid, old, new in changed[:30]:
        print(f"  {mid:60s}  {old!r} -> {new!r}")
    if len(changed) > 30:
        print(f"  ... and {len(changed) - 30} more")

    if unmapped:
        print(f"\nUnmapped orgs (kept as-is, consider adding to providers.json):")
        for org, n in unmapped.most_common():
            print(f"  {n:4d}  {org}")

    if args.dry_run:
        print("\n[dry-run] not writing.")
        return 0

    with MODELS_FILE.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\nWrote {MODELS_FILE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
