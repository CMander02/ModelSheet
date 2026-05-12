"""Model filtering rules for deciding which models to record.

Filtering works in three layers:
1. YAML-based name patterns  (data/filter-suffixes.yaml — editable via CLI)
2. Hardcoded pipeline tags    (ASR, TTS, embedding, etc.)
3. Hardcoded model types      (bert, whisper, vit, etc.)

Layer 1 is loaded from YAML and merges with built-in defaults.
Use `modelsheet filter` commands to manage the YAML file.
"""

import re
from pathlib import Path
from typing import Optional

import yaml

from .config import DATA_DIR

# ── Built-in defaults (used when YAML file is missing or as fallback) ─────────

_DEFAULT_RULES = [
    # Quantization
    {"pattern": r"\b(AWQ|GPTQ|GGUF|GGML)\b", "reason": "quantized (AWQ/GPTQ/GGUF/GGML)"},
    {"pattern": r"\bQ\d+_K_[SM]\b", "reason": "quantized (Q level)"},
    {"pattern": r"\bW\d+A\d+\b", "reason": "weight-only quantized"},
    {"pattern": r"\bINT[248]\b", "reason": "INT quantized"},
    {"pattern": r"\bFP[48]\b", "reason": "FP quantized"},
    {"pattern": r"\bNF4\b", "reason": "NF4 quantized"},
    {"pattern": r"\bBNB\b", "reason": "bitsandbytes quantized"},
    {"pattern": r"\bAQLM\b", "reason": "AQLM quantized"},
    {"pattern": r"\bEXL2\b", "reason": "EXL2 quantized"},
    {"pattern": r"\b(?:4|8)-?bit(?:s)?\b", "reason": "X-bit quantized"},
    {"pattern": r"\bSQ\b", "reason": "SmoothQuant quantized"},
    # ASR / TTS
    {"pattern": r"\b(whisper|asr|tts|speech|vocoder)\b", "reason": "ASR/TTS model"},
    # Embedding / Rerank
    {"pattern": r"\b(embed(?:ding)?s?|rerank(?:er)?|retriev(?:al|er))\b", "reason": "embedding/rerank model"},
    {"pattern": r"\b(bge|e5|gte|nomic-embed|sentence-?transformers?)\b", "reason": "embedding model"},
    # Reward / ORM / PRM
    {"pattern": r"\b[op]rm\b", "reason": "reward/ORM/PRM model"},
    {"pattern": r"\breward-?model\b", "reason": "reward model"},
    # Translation
    {"pattern": r"\b(nllb|m2m100|mbart|opus-mt)\b", "reason": "translation model"},
    # Diffusion (image gen)
    {"pattern": r"\b(stable-?diffusion|sdxl|sd-?v\d|sd\d|flux|kandinsky|dall-?e|midjourney|imagen|pixart|cogvideox)\b", "reason": "diffusion (image gen, not LM)"},
    # Classifier
    {"pattern": r"\b(classifier|discriminator)\b", "reason": "classifier/discriminator model"},
    # OCR (not MLLM)
    {"pattern": r"\b(qianfan-ocr|deepseek-ocr)\b", "reason": "OCR model (not MLLM)"},
    # Baidu 2-bit quantized (not at end of name, so no $ anchor)
    {"pattern": r"-2bits", "reason": "2-bit quantized (Baidu ERNIE)"},
    # Tensor parallelism variant (not at end of name, so no $ anchor)
    {"pattern": r"-tp\d+", "reason": "tensor parallelism variant"},
    # Weight+activation quantized (e.g. -W4A8C8)
    {"pattern": r"-w\d+a\d+c\d+", "reason": "weight+activation quantized (e.g. -W4A8C8)"},
    # PaliGemma fine-tune variants
    {"pattern": r"\bpaligemma-3b-ft-", "reason": "PaliGemma fine-tune checkpoint"},
    {"pattern": r"ft-docci", "reason": "PaliGemma2 ft-docci fine-tune checkpoint"},
    # Deployment backend variants
    {"pattern": r"-(jax|paddle|flax|pytorch|tflite|cpp|sfp-cpp|litert|keras)$", "reason": "deployment backend variant"},
    # MLX deployment (Apple ecosystem)
    {"pattern": r"-mlx(-?\w+)?$", "reason": "MLX deployment variant (Apple ecosystem)"},
    # Quantization-aware training
    {"pattern": r"-qat\b", "reason": "quantization-aware training variant"},
]


# Compiled cache
_compiled_rules_cache: Optional[list[tuple[re.Pattern, str]]] = None


# ── YAML loading ─────────────────────────────────────────────────────────────

def get_rules_path() -> Path:
    return DATA_DIR / "filter-suffixes.yaml"


def load_rules_from_yaml() -> list[dict]:
    """Load rules from YAML file, falling back to defaults if file missing.

    Returns:
        List of {"pattern": str, "reason": str} dicts.
    """
    path = get_rules_path()
    if not path.exists():
        return list(_DEFAULT_RULES)
    try:
        content = yaml.safe_load(path.read_text(encoding="utf-8"))
        rules = content.get("rules", []) if isinstance(content, dict) else []
        if rules:
            return rules
    except Exception:
        pass
    return list(_DEFAULT_RULES)


def save_rules_to_yaml(rules: list[dict]) -> None:
    """Save rules to YAML file."""
    path = get_rules_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    # Format with clean YAML
    lines = [
        "# =============================================================================",
        "# ModelSheet — Model Filter Rules (managed via `modelsheet filter`)",
        "# =============================================================================",
        "# Each rule has a `pattern` (case-insensitive regex matching model name)",
        "# and a `reason` (human-readable description shown in --show-skipped).",
        "# =============================================================================",
        "",
        "rules:",
    ]
    for rule in rules:
        lines.append(f'  - pattern: "{rule["pattern"]}"')
        lines.append(f'    reason: "{rule["reason"]}"')
        lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def get_compiled_rules() -> list[tuple[re.Pattern, str]]:
    """Return list of (compiled_regex, reason) tuples, cached."""
    global _compiled_rules_cache
    if _compiled_rules_cache is not None:
        return _compiled_rules_cache
    rules = load_rules_from_yaml()
    compiled = []
    for rule in rules:
        try:
            pat = re.compile(rule["pattern"], re.IGNORECASE)
            compiled.append((pat, rule.get("reason", "unknown")))
        except re.error as e:
            from rich.console import Console
            Console().print(f"[yellow]WARN: invalid filter pattern '{rule['pattern']}': {e}[/yellow]")
    _compiled_rules_cache = compiled
    return compiled


def clear_rules_cache():
    """Clear the compiled rules cache (call after modifying YAML)."""
    global _compiled_rules_cache
    _compiled_rules_cache = None


# ── Name-based skip reason (YAML + built-in) ────────────────────────────────

def skip_by_name(model_name: str) -> Optional[str]:
    """Check model name against all filter patterns.

    Args:
        model_name: The model name (part after "/" in org/model).

    Returns:
        Human-readable reason string if model should be skipped, None to keep it.
    """
    for pat, reason in get_compiled_rules():
        if pat.search(model_name):
            return f"{reason} ({model_name})"
    return None


# ── Pipeline tag skip set ──────────────────────────────────────────────────
# These don't change often — kept hardcoded.

_SKIP_PIPELINE_TAGS = {
    "automatic-speech-recognition",
    "audio-classification",
    "text-to-speech",
    "text-to-audio",
    "audio-to-audio",
    "feature-extraction",         # embedding models
    "sentence-similarity",        # embedding/rerank models
    "text-classification",        # often ORM/PRM/rerank
    "token-classification",
    "image-classification",
    "object-detection",
    "image-segmentation",
    "depth-estimation",
    "image-feature-extraction",
    "text-to-image",              # diffusion image (not LM)
    "image-to-image",
    "unconditional-image-generation",
    "text-to-video",
    "video-classification",
    "image-to-video",
    "zero-shot-image-classification",  # SigLIP, CLIP etc.
    "zero-shot-object-detection",      # OWLv2 etc.
    "time-series-forecasting",         # TimesFM
    "mask-generation",
    "visual-question-answering",       # VQA-only models
    "translation",                     # NLLB, M2M100 etc.
}

# Model types in config.json that are clearly not LMs
_SKIP_MODEL_TYPES = {
    "whisper", "wav2vec2", "hubert", "speech_encoder_decoder",
    "sew", "sew-d", "unispeech", "unispeech-sat",
    "speecht5", "bark", "musicgen", "audiogen",
    "bert", "roberta", "deberta", "deberta-v2", "xlm-roberta", "xlm-roberta-xl",
    "albert", "electra", "camembert", "ernie",
    "vit", "swin", "deit", "beit", "convnext", "clip",
    "unet2d", "unet2d-conditioned", "vae",
    "cross-encoder",
}

# Model types that should always be included (override name heuristics)
_ALWAYS_INCLUDE_MODEL_TYPES = {
    "mamba", "jamba", "zamba", "falcon_mamba",
    "rwkv", "rwkv4", "rwkv5", "rwkv6",
    "ssm",
}

# Pipeline tags for diffusion LMs (include even if name looks like diffusion)
_DIFFUSION_LM_PIPELINE_TAGS = {
    "text-generation",
    "text2text-generation",
}


# ── Main skip function ──────────────────────────────────────────────────────

def skip_reason(
    model_id: str,
    pipeline_tag: Optional[str] = None,
    tags: Optional[list[str]] = None,
    model_type: Optional[str] = None,
) -> Optional[str]:
    """Return a skip reason string if this model should be excluded, else None.

    Args:
        model_id: Full model ID (org/name)
        pipeline_tag: HuggingFace pipeline_tag from API metadata
        tags: List of HuggingFace tags from API metadata
        model_type: model_type from config.json

    Returns:
        Human-readable reason string if model should be skipped, None to keep it.
    """
    name = model_id.split("/")[-1]
    model_type_lower = (model_type or "").lower()

    # Always include explicitly-listed model types (mamba, rwkv, etc.)
    if model_type_lower in _ALWAYS_INCLUDE_MODEL_TYPES:
        return None

    # 1. YAML-based name patterns (user-editable suffix/pattern filter)
    name_reason = skip_by_name(name)
    if name_reason:
        return name_reason

    # 2. Skip pipeline tags (ASR, TTS, embedding, image-gen, etc.)
    if pipeline_tag and pipeline_tag in _SKIP_PIPELINE_TAGS:
        return f"pipeline_tag={pipeline_tag}"

    # 3. Skip config.json model_type for non-LM architectures
    if model_type_lower and model_type_lower in _SKIP_MODEL_TYPES:
        return f"model_type={model_type}"

    # 4. Name-based heuristics (applied only when we can't determine from config)
    #    Now handled by YAML rules — only pipeline_tag override needed here
    if pipeline_tag and pipeline_tag in _DIFFUSION_LM_PIPELINE_TAGS:
        return None

    return None
