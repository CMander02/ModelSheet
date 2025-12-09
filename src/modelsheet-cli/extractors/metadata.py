"""Metadata field extractors (id, name, provider, urls, timestamps)."""

import re
from typing import Optional

from .base import ConfigContext
from ..config import load_provider_map

# Load provider mapping from data/providers.json
# Maps HuggingFace org name -> normalized display name
# Frontend i18n will translate these display names to localized versions
PROVIDER_MAP = load_provider_map()


def extract_id(ctx: ConfigContext) -> str:
    """Extract model ID.

    Source: API modelId
    """
    return ctx.model_id


def extract_name(ctx: ConfigContext) -> str:
    """Extract display name from model ID.

    Source: modelId (String split)
    Logic: Remove org prefix before '/'
    """
    return ctx.model_id.split("/")[-1]


def extract_provider(ctx: ConfigContext) -> str:
    """Extract provider display name.

    Source: modelId (String split) + PROVIDER_MAP
    Logic: Split by '/', lookup org in mapping, fallback to org name

    Note: Frontend i18n will translate these display names to localized versions.
    """
    org = ctx.model_id.split("/")[0]
    return PROVIDER_MAP.get(org, org)


def extract_huggingface_url(ctx: ConfigContext) -> str:
    """Generate HuggingFace URL.

    Source: String format from modelId
    """
    return f"https://huggingface.co/{ctx.model_id}"


def extract_arxiv_url(ctx: ConfigContext) -> Optional[str]:
    """Extract arXiv URL from metadata tags.

    Source: API tags array
    Logic: Find tag matching 'arxiv:XXXX.XXXXX' pattern, convert to URL

    Examples:
        - arxiv:2401.04088 -> https://arxiv.org/abs/2401.04088
        - arxiv:2312.11805 -> https://arxiv.org/abs/2312.11805
    """
    tags = ctx.metadata.get("tags", [])
    if not isinstance(tags, list):
        return None
    # TODO Sometimes the tech report is not in arxiv, should find the correct website.
    # Pattern: arxiv:XXXX.XXXXX (year month . number)
    arxiv_pattern = re.compile(r"^arxiv:(\d{4}\.\d{4,5}(?:v\d+)?)$")

    for tag in tags:
        if isinstance(tag, str):
            match = arxiv_pattern.match(tag)
            if match:
                arxiv_id = match.group(1)
                return f"https://arxiv.org/abs/{arxiv_id}"

    return None


def extract_tech_report(ctx: ConfigContext) -> str:
    """Extract technical report URL.

    Source: To be implemented
    Note: Currently returns empty string, will be implemented later
    """
    # TODO: Implement tech report URL extraction
    return ""


def extract_created_at(ctx: ConfigContext) -> Optional[str]:
    """Extract creation timestamp.

    Source: API metadata createdAt
    """
    return ctx.metadata.get("createdAt")


# Pipeline tag to modality mapping
# Input/Output modalities: text, image, audio, video
PIPELINE_TAG_MODALITIES = {
    # Text only
    "text-generation": (["text"], ["text"]),
    "text2text-generation": (["text"], ["text"]),
    "fill-mask": (["text"], ["text"]),
    "summarization": (["text"], ["text"]),
    "translation": (["text"], ["text"]),
    "question-answering": (["text"], ["text"]),
    "conversational": (["text"], ["text"]),
    "feature-extraction": (["text"], ["text"]),
    "sentence-similarity": (["text"], ["text"]),
    "text-classification": (["text"], ["text"]),
    "token-classification": (["text"], ["text"]),
    "table-question-answering": (["text"], ["text"]),
    "zero-shot-classification": (["text"], ["text"]),

    # Audio input
    "automatic-speech-recognition": (["audio"], ["text"]),
    "audio-classification": (["audio"], ["text"]),

    # Audio output
    "text-to-speech": (["text"], ["audio"]),
    "text-to-audio": (["text"], ["audio"]),

    # Image input
    "image-classification": (["image"], ["text"]),
    "object-detection": (["image"], ["text"]),
    "image-segmentation": (["image"], ["text"]),
    "depth-estimation": (["image"], ["image"]),
    "image-feature-extraction": (["image"], ["text"]),
    "zero-shot-image-classification": (["image", "text"], ["text"]),
    "zero-shot-object-detection": (["image", "text"], ["text"]),

    # Image output
    "text-to-image": (["text"], ["image"]),
    "image-to-image": (["image"], ["image"]),
    "unconditional-image-generation": ([], ["image"]),

    # Vision-Language (multimodal)
    "image-text-to-text": (["image", "text"], ["text"]),
    "visual-question-answering": (["image", "text"], ["text"]),
    "document-question-answering": (["image", "text"], ["text"]),
    "image-to-text": (["image"], ["text"]),

    # Video
    "text-to-video": (["text"], ["video"]),
    "video-classification": (["video"], ["text"]),
    "image-to-video": (["image"], ["video"]),
    "video-text-to-text": (["video", "text"], ["text"]),

    # Audio-to-Audio
    "audio-to-audio": (["audio"], ["audio"]),
}


def extract_input_modalities(ctx: ConfigContext) -> list[str]:
    """Extract input modalities from pipeline_tag.

    Source: API metadata pipelineTag
    Returns: List of modalities: ["text"], ["image", "text"], ["audio"], ["video"], etc.
    """
    pipeline_tag = ctx.metadata.get("pipelineTag")
    if not pipeline_tag:
        return ["text"]  # Default to text for unknown

    modalities = PIPELINE_TAG_MODALITIES.get(pipeline_tag)
    if modalities:
        return modalities[0] if modalities[0] else ["text"]

    return ["text"]  # Default fallback


def extract_output_modalities(ctx: ConfigContext) -> list[str]:
    """Extract output modalities from pipeline_tag.

    Source: API metadata pipelineTag
    Returns: List of modalities: ["text"], ["image"], ["audio"], ["video"], etc.
    """
    pipeline_tag = ctx.metadata.get("pipelineTag")
    if not pipeline_tag:
        return ["text"]  # Default to text for unknown

    modalities = PIPELINE_TAG_MODALITIES.get(pipeline_tag)
    if modalities:
        return modalities[1] if modalities[1] else ["text"]

    return ["text"]  # Default fallback
