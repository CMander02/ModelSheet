"""
Backfill parameter provenance metadata for closed-source / historical
placeholder models.

Adds three optional fields:
    parameterConfidence: "official" | "reported" | "rumored"
    parameterSource:     free-form short description
    parameterSourceUrl:  optional URL

Semantics:
    official  — from the model's own config/paper/spec sheet
                (default; field may be omitted)
    reported  — acknowledged third-party disclosure (SemiAnalysis,
                industry reports, trusted leaks)
    rumored   — community speculation / best guess

If totalParameters is None we don't add a confidence — the frontend treats
null as "undisclosed".

Usage: python scripts/backfill_param_confidence.py [--dry-run]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODELS_FILE = ROOT / "data" / "models.json"


# Keyed by model id. Each value is a partial dict merged into the model.
META: dict[str, dict] = {
    # --- OpenAI ---
    "openai/gpt-1": {
        "parameterConfidence": "official",
        "parameterSource": "Radford et al. 2018",
    },
    "openai/gpt-3": {
        "parameterConfidence": "official",
        "parameterSource": "Brown et al. 2020",
        "parameterSourceUrl": "https://arxiv.org/abs/2005.14165",
    },
    "openai/instructgpt": {
        "parameterConfidence": "reported",
        "parameterSource": "InstructGPT paper; same base as GPT-3 175B",
        "parameterSourceUrl": "https://arxiv.org/abs/2203.02155",
    },
    "openai/chatgpt": {
        "parameterConfidence": "rumored",
        "parameterSource": "Generally believed to use GPT-3.5 Turbo (size not disclosed)",
    },
    "openai/gpt-4": {
        "parameterConfidence": "rumored",
        "parameterSource": "SemiAnalysis (2023): ~1.8T MoE, 16 experts",
        "parameterSourceUrl": "https://www.semianalysis.com/p/gpt-4-architecture-infrastructure",
    },
    "openai/gpt-4-turbo": {
        "parameterConfidence": "rumored",
        "parameterSource": "Assumed same backbone as GPT-4 (~1.8T MoE); not confirmed by OpenAI",
    },
    "openai-community/openai-gpt": {
        "parameterConfidence": "official",
        "parameterSource": "Original OpenAI GPT (2018)",
    },

    # --- Anthropic ---
    "anthropic/claude-1": {
        "parameterConfidence": "rumored",
        "parameterSource": "Leaked deck estimate ~52B; Anthropic has never confirmed",
    },

    # --- Google / DeepMind ---
    "google/palm-540b": {
        "parameterConfidence": "official",
        "parameterSource": "Chowdhery et al. 2022",
        "parameterSourceUrl": "https://arxiv.org/abs/2204.02311",
    },
    "google/lamda-137b": {
        "parameterConfidence": "official",
        "parameterSource": "Thoppilan et al. 2022",
        "parameterSourceUrl": "https://arxiv.org/abs/2201.08239",
    },
    "deepmind/gopher-280b": {
        "parameterConfidence": "official",
        "parameterSource": "Rae et al. 2022",
        "parameterSourceUrl": "https://arxiv.org/abs/2112.11446",
    },
    "deepmind/chinchilla-70b": {
        "parameterConfidence": "official",
        "parameterSource": "Hoffmann et al. 2022",
        "parameterSourceUrl": "https://arxiv.org/abs/2203.15556",
    },
    "google/gemini-1.0-ultra": {
        # totalParameters is null already — no confidence needed
        "parameterSource": "Google has not disclosed parameter counts for Gemini 1.x",
    },
    "google/gemini-1.5-pro": {
        "parameterSource": "Google has not disclosed parameter counts for Gemini 1.x",
    },

    # --- Amazon Bedrock (fully closed, sizes undisclosed) ---
    "amazon/nova-micro": {
        "parameterSource": "AWS has not disclosed parameter counts for Nova family",
    },
    "amazon/nova-lite": {
        "parameterSource": "AWS has not disclosed parameter counts for Nova family",
    },
    "amazon/nova-pro": {
        "parameterSource": "AWS has not disclosed parameter counts for Nova family",
    },
    "amazon/nova-premier": {
        "parameterSource": "AWS has not disclosed parameter counts for Nova family",
    },
    "amazon/titan-text-express": {
        "parameterSource": "AWS has not disclosed parameter counts for Titan family",
    },
    "amazon/titan-text-lite": {
        "parameterSource": "AWS has not disclosed parameter counts for Titan family",
    },
    "amazon/titan-text-premier": {
        "parameterSource": "AWS has not disclosed parameter counts for Titan family",
    },

    # --- Cursor Composer (closed) ---
    "cursor/composer-1": {
        "parameterSource": "Cursor has not disclosed architecture details; described as a frontier MoE",
    },
    "cursor/composer-1-mini": {
        "parameterSource": "Cursor has not disclosed architecture details",
    },

    # --- Microsoft / NVIDIA research ---
    "nvidia-microsoft/megatron-turing-nlg-530b": {
        "parameterConfidence": "official",
        "parameterSource": "Smith et al. 2022 (NVIDIA + Microsoft)",
        "parameterSourceUrl": "https://arxiv.org/abs/2201.11990",
    },

    # --- BigScience (open weights, left at default "official") ---
    "bigscience/bloom": {
        "parameterConfidence": "official",
        "parameterSource": "BigScience 2022 (open weights available on HF)",
    },

    # --- Historical academic reference ---
    "paper/transformer": {
        "parameterConfidence": "official",
        "parameterSource": "Vaswani et al. 2017 base model",
        "parameterSourceUrl": "https://arxiv.org/abs/1706.03762",
    },
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Don't write file")
    args = parser.parse_args()

    with MODELS_FILE.open(encoding="utf-8") as f:
        data = json.load(f)

    by_id = {m["id"]: m for m in data}
    applied = []
    missing = []

    for mid, meta in META.items():
        model = by_id.get(mid)
        if not model:
            missing.append(mid)
            continue
        for k, v in meta.items():
            model[k] = v
        applied.append(mid)

    print(f"Applied meta on {len(applied)} models.")
    for mid in applied:
        m = by_id[mid]
        conf = m.get("parameterConfidence", "(default/official)")
        src = m.get("parameterSource", "")
        print(f"  {mid:45s} confidence={conf:10s} source={src[:60]!r}")

    if missing:
        print(f"\nMissing from DB (check ID):")
        for mid in missing:
            print(f"  {mid}")

    if args.dry_run:
        print("\n[dry-run] not writing.")
        return 0

    with MODELS_FILE.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\nWrote {MODELS_FILE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
