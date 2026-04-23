"""Model filtering rules for deciding which models to record."""

import re
from typing import Optional


# Quantization keywords in model name (case-insensitive)
# Matches: AWQ, GPTQ, GGUF, Q4_K, Q8_0, Q4K, Q6K, W4A16, W8A8, INT4, INT8, FP8, BNB, NF4, etc.
_QUANTIZATION_PATTERNS = re.compile(
    r"""
    \b(
        AWQ | GPTQ | GGUF | GGML |
        Q\d+_K_[SM] | Q\d+_K | Q\d+[KM]? |   # Q4_K_M, Q4_K, Q8_0, Q4K, Q6K
        W\d+A\d+ |                              # W4A16, W8A8
        INT4 | INT8 | INT2 |
        FP8 | FP4 |
        NF4 |
        BNB |                                   # bitsandbytes
        SQ |                                    # SmoothQuant
        AQLM | EXL2 |                           # other quant formats
        (?:4|8)-?bit | (?:4|8)bits
    )\b
    """,
    re.VERBOSE | re.IGNORECASE,
)

# Pipeline tags that should be skipped
_SKIP_PIPELINE_TAGS = {
    "automatic-speech-recognition",
    "audio-classification",
    "text-to-speech",
    "text-to-audio",
    "audio-to-audio",
    "feature-extraction",        # embedding models
    "sentence-similarity",       # embedding/rerank models
    "text-classification",       # often ORM/PRM/rerank
    "token-classification",
    "image-classification",
    "object-detection",
    "image-segmentation",
    "depth-estimation",
    "image-feature-extraction",
    "text-to-image",             # diffusion image (not LM)
    "image-to-image",
    "unconditional-image-generation",
    "text-to-video",
    "video-classification",
    "image-to-video",
    "audio-to-audio",
}

# Keywords in model name that indicate skip-worthy model types
# These run AFTER quantization check as a secondary filter
_SKIP_NAME_PATTERNS = re.compile(
    r"""
    \b(
        # ASR / TTS
        whisper | asr | tts | speech | voice | vocoder |
        # Embedding / Rerank
        embed(?:ding)?s? | rerank(?:er)? | retriev(?:al|er) |
        bge | e5 | gte | nomic(?:-embed)? |
        sentence-?transformers? |
        # ORM / PRM (outcome/process reward model)
        \b(?:o|p)rm\b |
        reward-?model |
        # Diffusion (image) — not LM
        stable-?diffusion | sdxl | sd-?v\d | sd\d |
        flux | kandinsky | dall-?e | midjourney |
        imagen | pixart | cogvideox |
        # Classifier / discriminator
        classifier | discriminator
    )\b
    """,
    re.VERBOSE | re.IGNORECASE,
)

# Model types in config.json that should be skipped
# These are model_type values that are clearly not LMs
_SKIP_MODEL_TYPES = {
    # ASR
    "whisper", "wav2vec2", "hubert", "speech_encoder_decoder",
    "sew", "sew-d", "unispeech", "unispeech-sat",
    # TTS / Audio generation
    "speecht5", "bark", "musicgen", "audiogen",
    # Embedding only
    "bert", "roberta", "deberta", "deberta-v2", "xlm-roberta", "xlm-roberta-xl",
    "albert", "electra", "camembert", "ernie",
    # Vision encoder only (not VLM)
    "vit", "swin", "deit", "beit", "convnext", "clip",
    # Diffusion (image, not LM)
    "unet2d", "unet2d-conditioned", "vae",
    # Rerank / cross-encoder
    "cross-encoder",
}

# Model types that should always be included (override name heuristics)
# mamba, rwkv, ssm variants are always LMs
_ALWAYS_INCLUDE_MODEL_TYPES = {
    "mamba", "jamba", "zamba", "falcon_mamba",
    "rwkv", "rwkv4", "rwkv5", "rwkv6",
    "ssm",
}

# Pipeline tags for diffusion LMs (include these even if name looks like diffusion)
_DIFFUSION_LM_PIPELINE_TAGS = {
    "text-generation",
    "text2text-generation",
}


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

    # 1. Quantization: check model name
    if _QUANTIZATION_PATTERNS.search(name):
        return f"quantized model ({name})"

    # 2. Skip pipeline tags (ASR, TTS, embedding, image-gen, etc.)
    if pipeline_tag and pipeline_tag in _SKIP_PIPELINE_TAGS:
        return f"pipeline_tag={pipeline_tag}"

    # 3. Skip config.json model_type for non-LM architectures
    if model_type_lower and model_type_lower in _SKIP_MODEL_TYPES:
        return f"model_type={model_type}"

    # 4. Name-based heuristics (secondary filter — applied only when no config)
    if _SKIP_NAME_PATTERNS.search(name):
        # Don't skip if it's a text-generation pipeline (e.g. diffusion LM like MDLM)
        if pipeline_tag and pipeline_tag in _DIFFUSION_LM_PIPELINE_TAGS:
            return None
        return f"name heuristic ({name})"

    return None
