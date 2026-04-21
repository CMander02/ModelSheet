"""
Add architectureFamily field to every model in data/models.json.

Maps the low-level `architecture` field (e.g. `qwen2_moe`, `qwen2_5_vl`) to a
high-level family name (e.g. `Qwen2`) that groups structurally-related
variants (MoE / VL / Omni / Thinking) together.

Usage:
    python scripts/add_architecture_family.py [--dry-run]
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODELS_FILE = ROOT / "data" / "models.json"

# Ordered: first match wins. Patterns are substring/prefix tests on the
# architecture string (case-insensitive). More specific entries come first.
# None means "architecture value not recognized" -> emit Unknown.
FAMILY_RULES: list[tuple[str, tuple[str, ...]]] = [
    # Qwen lineage
    ("Qwen3.5",      ("qwen3_5",)),
    ("Qwen3",        ("qwen3",)),           # qwen3, qwen3_moe, qwen3_vl, qwen3_vl_moe, qwen3_next, qwen3_omni_moe
    ("Qwen2",        ("qwen2",)),           # qwen2, qwen2_moe, qwen2_vl, qwen2_5_vl, qwen2_5_omni
    ("Qwen",         ("qwen",)),            # original Qwen-7B etc.

    # DeepSeek lineage
    ("DeepSeek-V3",  ("deepseek_v3", "deepseek_v32")),
    ("DeepSeek-V2",  ("deepseek_v2",)),
    ("DeepSeek",     ("deepseek",)),

    # GLM / ChatGLM lineage (kept together — same team, evolving arch)
    ("GLM",          ("glm4_moe", "glm4", "glm", "chatglm")),

    # InternLM lineage  (InternVL also shares the same ecosystem)
    ("InternLM",     ("internlm", "internvl")),

    # Gemma lineage
    ("Gemma",        ("gemma",)),           # gemma, gemma2, gemma3, gemma3_text, gemma3n

    # LLaMA lineage (meta / derivatives keeping the llama arch name)
    ("LLaMA",        ("llama", "nemotron-nas")),

    # Mistral / Mixtral / Voxtral / Pixtral / Codestral
    ("Mistral",      ("mistral", "mixtral", "voxtral", "pixtral", "codestral")),

    # Microsoft Phi
    ("Phi",          ("phi",)),             # phi3, phi4 etc.

    # IBM Granite
    ("Granite",      ("granite",)),

    # NVIDIA Nemotron
    ("Nemotron",     ("nemotron",)),

    # Baidu ERNIE
    ("ERNIE",        ("ernie",)),

    # AllenAI OLMo
    ("OLMo",         ("olmo", "olmoe", "molmo")),

    # Xiaomi MiMo
    ("MiMo",         ("mimo",)),

    # ByteDance
    ("Seed-OSS",     ("seed_oss",)),
    ("Valley",       ("valley",)),

    # Amazon Bedrock
    ("Nova",         ("nova",)),
    ("Titan",        ("titan",)),

    # Cursor
    ("Composer",     ("composer",)),

    # Others with distinct identity — individual model families
    ("xAI-Grok",     ("git",)),   # xai-org/grok-2 uses "git" model_type per HF config
    ("Liquid-LFM",   ("lfm",)),
    ("Arctic",       ("arctic",)),
    ("Solar",        ("solar",)),
    ("EXAONE",       ("exaone",)),
    ("Arcee",        ("arcee",)),
    ("Falcon",       ("falcon",)),
    ("Hunyuan",      ("hunyuan",)),
    ("ChatTS",       ("chatts",)),
    ("Kimi-VL",      ("kimi_vl",)),
    ("Kimi-Linear",  ("kimi_linear",)),
    ("Step-Audio",   ("step_audio",)),
    ("Step3-VL",     ("step3_vl",)),
    ("Baichuan-Omni", ("omni",)),   # baichuan audio model_type is bare "omni"
    ("Skywork",      ("skywork",)),
    ("Aquila",       ("aquila",)),
    ("Emu",          ("emu",)),
    ("Bailing",      ("bailing",)),   # inclusionAI Ling/Ring
    ("XVERSE",       ("xverse",)),
    ("Index",        ("index",)),
    ("LongCat",      ("longcat",)),
    ("RWKV",         ("rwkv",)),
    ("Megrez",       ("megrez",)),
    ("Dots-OCR",     ("dots_ocr",)),

    ("Orion",        ("orion",)),
    ("Zhinao",       ("zhinao",)),
    ("dots",         ("dots1",)),
    ("Step",         ("step1", "nextstep")),
    ("Moonshot-Kimi", ("moonshotkimia", "kimi_k2")),
    ("MiniMax",      ("minimax",)),
    ("Ola",          ("ola_qwen",)),
    ("Jamba",        ("jamba",)),
    ("Baichuan",     ("baichuan",)),
    ("MiniCPM",      ("minicpm",)),
    ("Ovis",         ("ovis",)),
    ("LLaVA",        ("llava",)),
    ("TimeMoE",      ("time_moe",)),
    ("GPT-OSS",      ("gpt_oss",)),
    ("nanochat",     ("nanochat",)),

    # Classic closed-weight references (kept for comparison entries in DB)
    ("GPT",          ("gpt3", "gpt4", "gpt3.5", "openai-gpt", "gpt2", "gpt", "chatgpt")),
    ("Claude",       ("claude",)),
    ("Gemini",       ("gemini",)),
    ("PaLM",         ("palm", "lamda")),
    ("Gopher",       ("gopher", "chinchilla")),
    ("Megatron",     ("megatron",)),
    ("BLOOM",        ("bloom",)),

    # Generic encoder-decoder / seq2seq (should be rare after cleanup)
    ("T5",           ("t5", "longt5")),
    ("BART",         ("bart", "pegasus", "blenderbot", "marian")),

    # Vision / audio baselines (rare — kept in DB as reference)
    ("Whisper",      ("whisper",)),
    ("Seamless",     ("seamless_m4t",)),
    ("CLIP",         ("clip",)),
    ("ViT",          ("vit",)),
    ("Swin",         ("swin",)),
    ("Longformer",   ("longformer",)),

    # SSM / hybrid
    ("Mamba",        ("mamba",)),

    # Switch Transformer (early MoE ref)
    ("SwitchTransformer", ("switch",)),

    # OPT / Galactica
    ("OPT",          ("opt",)),

    # Abstract placeholder entries
    ("Transformer",  ("transformer",)),
]


def classify(architecture: str | None) -> str:
    if not architecture:
        return "Unknown"
    a = architecture.strip().lower()
    for family, patterns in FAMILY_RULES:
        for p in patterns:
            if a.startswith(p) or a == p:
                return family
    return "Unknown"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Print mapping but do not write file")
    args = parser.parse_args()

    with MODELS_FILE.open(encoding="utf-8") as f:
        data = json.load(f)

    family_counter: Counter[str] = Counter()
    unknowns: list[tuple[str, str]] = []

    for m in data:
        arch = m.get("architecture")
        fam = classify(arch)
        m["architectureFamily"] = fam
        family_counter[fam] += 1
        if fam == "Unknown":
            unknowns.append((m["id"], str(arch)))

    # Summary
    print(f"Total models: {len(data)}")
    print(f"Families: {len(family_counter)}")
    print("\nFamily distribution:")
    for fam, c in family_counter.most_common():
        print(f"  {c:4d}  {fam}")

    if unknowns:
        print(f"\n-- Unknown ({len(unknowns)}) --")
        for mid, arch in unknowns:
            print(f"  {mid:60s} arch={arch}")

    if args.dry_run:
        print("\n[dry-run] not writing.")
        return 0

    with MODELS_FILE.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\nWrote {MODELS_FILE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
