"""Metadata field extractors (id, name, provider, urls, timestamps)."""

import json
import re
from pathlib import Path
from typing import Optional

from .base import ConfigContext
from ..config import DATA_DIR, load_provider_map, build_hf_org_to_ms_org_map, MS_BASE_URL

# Load provider mapping from data/providers.json
# Maps HuggingFace org name -> normalized display name
# Frontend i18n will translate these display names to localized versions
PROVIDER_MAP = load_provider_map()
HF_ORG_TO_MS_ORG_MAP = build_hf_org_to_ms_org_map()


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


def _extract_arxiv_id_from_readme(readme: str) -> Optional[str]:
    """Extract arxiv ID from README content.

    Searches for:
    1. arxiv.org URLs: https://arxiv.org/[abs/pdf/html]/XXXX.XXXXX[vN]
    2. HuggingFace paper URLs: https://huggingface.co/papers/XXXX.XXXXX

    Args:
        readme: README.md content

    Returns:
        arxiv ID without version suffix (e.g., "2401.04088")
    """
    # Pattern for arxiv.org URLs (abs, pdf, or html)
    # Matches: https://arxiv.org/abs/2401.04088, https://arxiv.org/pdf/2401.04088v1
    arxiv_url_pattern = re.compile(
        r"https?://arxiv\.org/(?:abs|pdf|html)/(\d{4}\.\d{4,5})(?:v\d+)?"
    )

    # Pattern for HuggingFace paper URLs
    # Matches: https://huggingface.co/papers/2401.04088
    hf_paper_pattern = re.compile(
        r"https?://huggingface\.co/papers/(\d{4}\.\d{4,5})(?:v\d+)?"
    )

    # Try arxiv.org URLs first
    match = arxiv_url_pattern.search(readme)
    if match:
        return match.group(1)

    # Try HuggingFace paper URLs
    match = hf_paper_pattern.search(readme)
    if match:
        return match.group(1)

    return None


def extract_arxiv_url(ctx: ConfigContext) -> Optional[str]:
    """Extract arXiv URL from metadata tags or README.

    Priority:
        1. API tags array (arxiv:XXXX.XXXXX format)
        2. README.md content (arxiv.org URLs or HuggingFace paper URLs)

    Examples:
        - arxiv:2401.04088 -> https://arxiv.org/abs/2401.04088
        - https://arxiv.org/pdf/2312.11805v1 -> https://arxiv.org/abs/2312.11805
        - https://huggingface.co/papers/2401.04088 -> https://arxiv.org/abs/2401.04088
    """
    # Priority 1: Check tags
    tags = ctx.metadata.get("tags", [])
    if isinstance(tags, list):
        # Pattern: arxiv:XXXX.XXXXX (year month . number), strip version if present
        arxiv_tag_pattern = re.compile(r"^arxiv:(\d{4}\.\d{4,5})(?:v\d+)?$")

        for tag in tags:
            if isinstance(tag, str):
                match = arxiv_tag_pattern.match(tag)
                if match:
                    arxiv_id = match.group(1)
                    return f"https://arxiv.org/abs/{arxiv_id}"

    # Priority 2: Check README content
    readme = ctx.metadata.get("readme")
    if readme:
        arxiv_id = _extract_arxiv_id_from_readme(readme)
        if arxiv_id:
            return f"https://arxiv.org/abs/{arxiv_id}"

    return None


def extract_modelscope_url(ctx: ConfigContext) -> Optional[str]:
    """Generate ModelScope URL for CN-region models.

    Uses hf_org → ms_org mapping from providers.json.
    ModelScope URL format: https://modelscope.cn/models/<ms_org>/<model_name>
    """
    hf_org = ctx.model_id.split("/")[0]
    model_name = ctx.model_id.split("/")[-1]
    ms_orgs = HF_ORG_TO_MS_ORG_MAP.get(hf_org)
    if not ms_orgs:
        return None
    ms_org = ms_orgs[0]
    return f"{MS_BASE_URL}/models/{ms_org}/{model_name}"


def extract_tech_report(ctx: ConfigContext) -> str:
    """Extract technical report URL.

    Source: To be implemented
    Note: Currently returns empty string, will be implemented later
    """
    # TODO: Implement tech report URL extraction
    return ""


def extract_released_at(ctx: ConfigContext) -> Optional[str]:
    """Extract the public release timestamp.

    Hugging Face metadata is the preferred source for open models. Closed-model
    fetchers use the earliest date found in the technical blog or report.
    """
    return ctx.metadata.get("releasedAt")


# Pipeline tag to modality mapping (loaded from data/pipeline_tags.json)
# Maps HF pipeline_tag → {display, input, output}
_PIPELINE_TAG_DATA: Optional[dict] = None

def _get_pipeline_tag_data() -> dict:
    global _PIPELINE_TAG_DATA
    if _PIPELINE_TAG_DATA is not None:
        return _PIPELINE_TAG_DATA
    path = DATA_DIR / "pipeline_tags.json"
    if path.exists():
        with open(path) as f:
            _PIPELINE_TAG_DATA = json.load(f)
    else:
        _PIPELINE_TAG_DATA = {}
    return _PIPELINE_TAG_DATA


def extract_pipeline_tag(ctx: ConfigContext) -> Optional[str]:
    """Extract raw HuggingFace pipeline_tag.

    Source: API metadata pipelineTag
    """
    return ctx.metadata.get("pipelineTag")


def extract_task(ctx: ConfigContext) -> Optional[str]:
    """Extract display name for the pipeline_tag (the "task" column).

    Source: pipeline_tags.json lookup
    """
    pipeline_tag = ctx.metadata.get("pipelineTag")
    if not pipeline_tag:
        return None
    data = _get_pipeline_tag_data().get(pipeline_tag)
    if data:
        return data.get("display", pipeline_tag)
    return pipeline_tag


def extract_input_modalities(ctx: ConfigContext) -> list[str]:
    """Extract input modalities from pipeline_tag.

    Source: API metadata pipelineTag → pipeline_tags.json
    Returns: List of modalities or ["text"] as default.
    """
    pipeline_tag = ctx.metadata.get("pipelineTag")
    if not pipeline_tag:
        return ["text"]
    data = _get_pipeline_tag_data().get(pipeline_tag)
    if data:
        mods = data.get("input", [])
        return mods if mods else ["text"]
    return ["text"]


def extract_output_modalities(ctx: ConfigContext) -> list[str]:
    """Extract output modalities from pipeline_tag.

    Source: API metadata pipelineTag → pipeline_tags.json
    Returns: List of modalities or ["text"] as default.
    """
    pipeline_tag = ctx.metadata.get("pipelineTag")
    if not pipeline_tag:
        return ["text"]
    data = _get_pipeline_tag_data().get(pipeline_tag)
    if data:
        mods = data.get("output", [])
        return mods if mods else ["text"]
    return ["text"]
