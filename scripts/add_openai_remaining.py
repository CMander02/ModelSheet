#!/usr/bin/env python3
"""Add remaining OpenAI models and backfill knowledgeCutoff on existing entries."""

import json
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).parent.parent
MODELS_FILE = ROOT / "data" / "models.json"

def pc(s):
    return datetime.strptime(s, "%b %d, %Y").strftime("%Y-%m-%d")

NEW_ENTRIES = [
    # GPT-5.4 family
    {"id": "openai/gpt-5.4", "name": "GPT-5.4", "provider": "OpenAI",
     "techReport": "https://developers.openai.com/api/docs/models/gpt-5.4",
     "contextLength": 1050000, "architecture": "gpt5", "architectureFamily": "GPT",
     "inputModalities": ["text", "image"], "outputModalities": ["text"],
     "createdAt": "2026-03-05T00:00:00.000Z", "isMoe": False,
     "knowledgeCutoff": pc("Aug 31, 2025")},
    {"id": "openai/gpt-5.4-pro", "name": "GPT-5.4 pro", "provider": "OpenAI",
     "techReport": "https://developers.openai.com/api/docs/models/gpt-5.4-pro",
     "contextLength": 1050000, "architecture": "gpt5", "architectureFamily": "GPT",
     "inputModalities": ["text", "image"], "outputModalities": ["text"],
     "createdAt": "2026-03-05T00:00:00.000Z", "isMoe": False,
     "knowledgeCutoff": pc("Aug 31, 2025")},
    {"id": "openai/gpt-5.4-mini", "name": "GPT-5.4 mini", "provider": "OpenAI",
     "techReport": "https://developers.openai.com/api/docs/models/gpt-5.4-mini",
     "contextLength": 400000, "architecture": "gpt5", "architectureFamily": "GPT",
     "inputModalities": ["text", "image"], "outputModalities": ["text"],
     "createdAt": "2026-03-05T00:00:00.000Z", "isMoe": False,
     "knowledgeCutoff": pc("Aug 31, 2025")},
    {"id": "openai/gpt-5.4-nano", "name": "GPT-5.4 nano", "provider": "OpenAI",
     "techReport": "https://developers.openai.com/api/docs/models/gpt-5.4-nano",
     "contextLength": 400000, "architecture": "gpt5", "architectureFamily": "GPT",
     "inputModalities": ["text", "image"], "outputModalities": ["text"],
     "createdAt": "2026-03-05T00:00:00.000Z", "isMoe": False,
     "knowledgeCutoff": pc("Aug 31, 2025")},
    # GPT-5 family
    {"id": "openai/gpt-5", "name": "GPT-5", "provider": "OpenAI",
     "techReport": "https://developers.openai.com/api/docs/models/gpt-5",
     "contextLength": 400000, "architecture": "gpt5", "architectureFamily": "GPT",
     "inputModalities": ["text", "image"], "outputModalities": ["text"],
     "createdAt": "2025-08-07T00:00:00.000Z", "isMoe": False,
     "knowledgeCutoff": pc("Sep 30, 2024")},
    {"id": "openai/gpt-5-mini", "name": "GPT-5 mini", "provider": "OpenAI",
     "techReport": "https://developers.openai.com/api/docs/models/gpt-5-mini",
     "contextLength": 400000, "architecture": "gpt5", "architectureFamily": "GPT",
     "inputModalities": ["text", "image"], "outputModalities": ["text"],
     "createdAt": "2025-08-07T00:00:00.000Z", "isMoe": False,
     "knowledgeCutoff": pc("May 31, 2024")},
    {"id": "openai/gpt-5-nano", "name": "GPT-5 nano", "provider": "OpenAI",
     "techReport": "https://developers.openai.com/api/docs/models/gpt-5-nano",
     "contextLength": 400000, "architecture": "gpt5", "architectureFamily": "GPT",
     "inputModalities": ["text", "image"], "outputModalities": ["text"],
     "createdAt": "2025-08-07T00:00:00.000Z", "isMoe": False,
     "knowledgeCutoff": pc("May 31, 2024")},
    {"id": "openai/gpt-5-pro", "name": "GPT-5 pro", "provider": "OpenAI",
     "techReport": "https://developers.openai.com/api/docs/models/gpt-5-pro",
     "contextLength": 400000, "architecture": "gpt5", "architectureFamily": "GPT",
     "inputModalities": ["text", "image"], "outputModalities": ["text"],
     "createdAt": "2025-08-07T00:00:00.000Z", "isMoe": False,
     "knowledgeCutoff": pc("Sep 30, 2024")},
    # GPT-5.1 / 5.2
    {"id": "openai/gpt-5.1", "name": "GPT-5.1", "provider": "OpenAI",
     "techReport": "https://developers.openai.com/api/docs/models/gpt-5.1",
     "contextLength": 400000, "architecture": "gpt5", "architectureFamily": "GPT",
     "inputModalities": ["text", "image"], "outputModalities": ["text"],
     "createdAt": "2025-10-01T00:00:00.000Z", "isMoe": False,
     "knowledgeCutoff": pc("Sep 30, 2024")},
    {"id": "openai/gpt-5.2", "name": "GPT-5.2", "provider": "OpenAI",
     "techReport": "https://developers.openai.com/api/docs/models/gpt-5.2",
     "contextLength": 400000, "architecture": "gpt5", "architectureFamily": "GPT",
     "inputModalities": ["text", "image"], "outputModalities": ["text"],
     "createdAt": "2025-12-01T00:00:00.000Z", "isMoe": False,
     "knowledgeCutoff": pc("Aug 31, 2025")},
    {"id": "openai/gpt-5.2-pro", "name": "GPT-5.2 pro", "provider": "OpenAI",
     "techReport": "https://developers.openai.com/api/docs/models/gpt-5.2-pro",
     "contextLength": 400000, "architecture": "gpt5", "architectureFamily": "GPT",
     "inputModalities": ["text", "image"], "outputModalities": ["text"],
     "createdAt": "2025-12-01T00:00:00.000Z", "isMoe": False,
     "knowledgeCutoff": pc("Aug 31, 2025")},
    # Codex family
    {"id": "openai/gpt-5-codex", "name": "GPT-5-Codex", "provider": "OpenAI",
     "techReport": "https://developers.openai.com/api/docs/models/gpt-5-codex",
     "contextLength": 400000, "architecture": "gpt5", "architectureFamily": "GPT",
     "inputModalities": ["text", "image"], "outputModalities": ["text"],
     "createdAt": "2025-05-01T00:00:00.000Z", "isMoe": False,
     "knowledgeCutoff": pc("Sep 30, 2024")},
    {"id": "openai/gpt-5.1-codex", "name": "GPT-5.1 Codex", "provider": "OpenAI",
     "techReport": "https://developers.openai.com/api/docs/models/gpt-5.1-codex",
     "contextLength": 400000, "architecture": "gpt5", "architectureFamily": "GPT",
     "inputModalities": ["text", "image"], "outputModalities": ["text"],
     "createdAt": "2025-10-01T00:00:00.000Z", "isMoe": False,
     "knowledgeCutoff": pc("Sep 30, 2024")},
    {"id": "openai/gpt-5.1-codex-max", "name": "GPT-5.1-Codex-Max", "provider": "OpenAI",
     "techReport": "https://developers.openai.com/api/docs/models/gpt-5.1-codex-max",
     "contextLength": 400000, "architecture": "gpt5", "architectureFamily": "GPT",
     "inputModalities": ["text", "image"], "outputModalities": ["text"],
     "createdAt": "2025-10-01T00:00:00.000Z", "isMoe": False,
     "knowledgeCutoff": pc("Sep 30, 2024")},
    {"id": "openai/gpt-5.1-codex-mini", "name": "GPT-5.1 Codex mini", "provider": "OpenAI",
     "techReport": "https://developers.openai.com/api/docs/models/gpt-5.1-codex-mini",
     "contextLength": 400000, "architecture": "gpt5", "architectureFamily": "GPT",
     "inputModalities": ["text", "image"], "outputModalities": ["text"],
     "createdAt": "2025-10-01T00:00:00.000Z", "isMoe": False,
     "knowledgeCutoff": pc("Sep 30, 2024")},
    {"id": "openai/gpt-5.2-codex", "name": "GPT-5.2-Codex", "provider": "OpenAI",
     "techReport": "https://developers.openai.com/api/docs/models/gpt-5.2-codex",
     "contextLength": 400000, "architecture": "gpt5", "architectureFamily": "GPT",
     "inputModalities": ["text", "image"], "outputModalities": ["text"],
     "createdAt": "2025-12-01T00:00:00.000Z", "isMoe": False,
     "knowledgeCutoff": pc("Aug 31, 2025")},
    {"id": "openai/gpt-5.3-codex", "name": "GPT-5.3-Codex", "provider": "OpenAI",
     "techReport": "https://developers.openai.com/api/docs/models/gpt-5.3-codex",
     "contextLength": 400000, "architecture": "gpt5", "architectureFamily": "GPT",
     "inputModalities": ["text", "image"], "outputModalities": ["text"],
     "createdAt": "2026-01-01T00:00:00.000Z", "isMoe": False,
     "knowledgeCutoff": pc("Aug 31, 2025")},
    {"id": "openai/codex-mini-latest", "name": "codex-mini-latest", "provider": "OpenAI",
     "techReport": "https://developers.openai.com/api/docs/models/codex-mini-latest",
     "contextLength": 200000, "architecture": "gpt5", "architectureFamily": "GPT",
     "inputModalities": ["text", "image"], "outputModalities": ["text"],
     "createdAt": "2025-05-16T00:00:00.000Z", "isMoe": False,
     "knowledgeCutoff": pc("Jun 01, 2024")},
    # o-series gaps
    {"id": "openai/o1-preview", "name": "o1 Preview", "provider": "OpenAI",
     "techReport": "https://developers.openai.com/api/docs/models/o1-preview",
     "contextLength": 128000, "architecture": "o1", "architectureFamily": "o-series",
     "inputModalities": ["text"], "outputModalities": ["text"],
     "createdAt": "2024-09-12T00:00:00.000Z", "isMoe": False,
     "knowledgeCutoff": pc("Oct 01, 2023")},
    {"id": "openai/o3-mini", "name": "o3-mini", "provider": "OpenAI",
     "techReport": "https://developers.openai.com/api/docs/models/o3-mini",
     "contextLength": 200000, "architecture": "o3", "architectureFamily": "o-series",
     "inputModalities": ["text"], "outputModalities": ["text"],
     "createdAt": "2025-01-31T00:00:00.000Z", "isMoe": False,
     "knowledgeCutoff": pc("Oct 01, 2023")},
    # GPT-4.5 / 3.5
    {"id": "openai/gpt-4.5-preview", "name": "GPT-4.5 Preview", "provider": "OpenAI",
     "techReport": "https://developers.openai.com/api/docs/models/gpt-4.5-preview",
     "contextLength": 128000, "architecture": "gpt4", "architectureFamily": "GPT",
     "inputModalities": ["text", "image"], "outputModalities": ["text"],
     "createdAt": "2025-02-27T00:00:00.000Z", "isMoe": False,
     "knowledgeCutoff": pc("Oct 01, 2023")},
    {"id": "openai/gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "provider": "OpenAI",
     "techReport": "https://developers.openai.com/api/docs/models/gpt-3.5-turbo",
     "contextLength": 16385, "architecture": "gpt3.5", "architectureFamily": "GPT",
     "inputModalities": ["text"], "outputModalities": ["text"],
     "createdAt": "2022-11-30T00:00:00.000Z", "isMoe": False,
     "knowledgeCutoff": pc("Sep 01, 2021")},
]

UPDATES = {
    "openai/gpt-4o":       {"knowledgeCutoff": "2023-10-01"},
    "openai/gpt-4o-mini":  {"knowledgeCutoff": "2023-10-01"},
    "openai/gpt-4.1":      {"knowledgeCutoff": "2024-06-01"},
    "openai/gpt-4.1-mini": {"knowledgeCutoff": "2024-06-01"},
    "openai/gpt-4.1-nano": {"knowledgeCutoff": "2024-06-01"},
    "openai/o1":           {"knowledgeCutoff": "2023-10-01", "contextLength": 200000},
    "openai/o1-mini":      {"knowledgeCutoff": "2023-10-01"},
    "openai/o1-pro":       {"knowledgeCutoff": "2023-10-01", "contextLength": 200000},
    "openai/o3":           {"knowledgeCutoff": "2024-06-01", "contextLength": 200000},
    "openai/o3-pro":       {"knowledgeCutoff": "2024-06-01", "contextLength": 200000},
    "openai/o4-mini":      {"knowledgeCutoff": "2024-06-01", "contextLength": 200000},
    "openai/gpt-4":        {"knowledgeCutoff": "2023-09-01"},
    "openai/gpt-4-turbo":  {"knowledgeCutoff": "2023-12-01"},
}


def main():
    with open(MODELS_FILE, encoding="utf-8") as f:
        models = json.load(f)

    existing_ids = {m["id"] for m in models}

    # Apply updates
    updated = []
    for m in models:
        if m["id"] in UPDATES:
            m.update(UPDATES[m["id"]])
            updated.append(m["id"])

    # Add new entries
    added, skipped = [], []
    for entry in NEW_ENTRIES:
        if entry["id"] in existing_ids:
            skipped.append(entry["id"])
        else:
            models.append(entry)
            added.append(entry["id"])

    models.sort(key=lambda m: (m.get("createdAt", ""), m["id"]))

    with open(MODELS_FILE, "w", encoding="utf-8") as f:
        json.dump(models, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Added {len(added)} new entries:")
    for mid in added:
        print(f"  + {mid}")
    print(f"\nBackfilled knowledgeCutoff on {len(updated)} existing entries:")
    for mid in updated:
        print(f"  ~ {mid}")
    if skipped:
        print(f"\nSkipped (already exist): {skipped}")


if __name__ == "__main__":
    main()
