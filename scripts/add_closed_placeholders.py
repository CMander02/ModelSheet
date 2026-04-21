"""
Add closed-weight model placeholders that can't be fetched from HuggingFace.

Currently covers:
- Amazon Bedrock Nova / Titan families
- Cursor Composer models

Usage: python scripts/add_closed_placeholders.py
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODELS_FILE = ROOT / "data" / "models.json"


PLACEHOLDERS = [
    # --- Amazon Bedrock Nova family ---
    {
        "id": "amazon/nova-micro",
        "name": "Nova Micro",
        "provider": "Amazon",
        "architecture": "nova",
        "architectureFamily": "Nova",
        "contextLength": 128000,
        "inputModalities": ["text"],
        "outputModalities": ["text"],
        "isMoe": False,
        "createdAt": "2024-12-03T00:00:00.000Z",
    },
    {
        "id": "amazon/nova-lite",
        "name": "Nova Lite",
        "provider": "Amazon",
        "architecture": "nova",
        "architectureFamily": "Nova",
        "contextLength": 300000,
        "inputModalities": ["text", "image", "video"],
        "outputModalities": ["text"],
        "isMoe": False,
        "createdAt": "2024-12-03T00:00:00.000Z",
    },
    {
        "id": "amazon/nova-pro",
        "name": "Nova Pro",
        "provider": "Amazon",
        "architecture": "nova",
        "architectureFamily": "Nova",
        "contextLength": 300000,
        "inputModalities": ["text", "image", "video"],
        "outputModalities": ["text"],
        "isMoe": False,
        "createdAt": "2024-12-03T00:00:00.000Z",
    },
    {
        "id": "amazon/nova-premier",
        "name": "Nova Premier",
        "provider": "Amazon",
        "architecture": "nova",
        "architectureFamily": "Nova",
        "contextLength": 1000000,
        "inputModalities": ["text", "image", "video"],
        "outputModalities": ["text"],
        "isMoe": False,
        "createdAt": "2025-04-30T00:00:00.000Z",
    },

    # --- Amazon Titan family (text / embedding-skipped) ---
    {
        "id": "amazon/titan-text-express",
        "name": "Titan Text Express",
        "provider": "Amazon",
        "architecture": "titan",
        "architectureFamily": "Titan",
        "contextLength": 8192,
        "inputModalities": ["text"],
        "outputModalities": ["text"],
        "isMoe": False,
        "createdAt": "2023-09-28T00:00:00.000Z",
    },
    {
        "id": "amazon/titan-text-lite",
        "name": "Titan Text Lite",
        "provider": "Amazon",
        "architecture": "titan",
        "architectureFamily": "Titan",
        "contextLength": 4096,
        "inputModalities": ["text"],
        "outputModalities": ["text"],
        "isMoe": False,
        "createdAt": "2023-09-28T00:00:00.000Z",
    },
    {
        "id": "amazon/titan-text-premier",
        "name": "Titan Text Premier",
        "provider": "Amazon",
        "architecture": "titan",
        "architectureFamily": "Titan",
        "contextLength": 32000,
        "inputModalities": ["text"],
        "outputModalities": ["text"],
        "isMoe": False,
        "createdAt": "2024-04-30T00:00:00.000Z",
    },

    # --- Cursor Composer family (closed, IDE-first coding agent models) ---
    {
        "id": "cursor/composer-1",
        "name": "Composer 1",
        "provider": "Cursor",
        "architecture": "composer",
        "architectureFamily": "Composer",
        "contextLength": 200000,
        "inputModalities": ["text"],
        "outputModalities": ["text"],
        "isMoe": True,
        "createdAt": "2025-10-29T00:00:00.000Z",
    },
    {
        "id": "cursor/composer-1-mini",
        "name": "Composer 1 Mini",
        "provider": "Cursor",
        "architecture": "composer",
        "architectureFamily": "Composer",
        "contextLength": 200000,
        "inputModalities": ["text"],
        "outputModalities": ["text"],
        "isMoe": True,
        "createdAt": "2025-10-29T00:00:00.000Z",
    },
]


def main() -> int:
    with MODELS_FILE.open(encoding="utf-8") as f:
        data = json.load(f)

    existing_ids = {m["id"] for m in data}
    added = []
    skipped = []

    for entry in PLACEHOLDERS:
        if entry["id"] in existing_ids:
            skipped.append(entry["id"])
            continue
        data.append(entry)
        added.append(entry["id"])

    with MODELS_FILE.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Added {len(added)}:")
    for i in added:
        print(f"  + {i}")
    if skipped:
        print(f"Already present ({len(skipped)}):")
        for i in skipped:
            print(f"  = {i}")
    print(f"Total models in DB: {len(data)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
