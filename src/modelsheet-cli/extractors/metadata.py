"""Metadata field extractors (id, name, provider, urls, timestamps)."""

import re
from typing import Optional

from .base import ConfigContext


# Provider mapping: HuggingFace org name -> display name
PROVIDER_MAP = {
    "meta-llama": "Meta",
    "Qwen": "Alibaba",
    "mistralai": "Mistral AI",
    "google": "Google",
    "microsoft": "Microsoft",
    "01-ai": "01.AI",
    "deepseek-ai": "DeepSeek",
    "THUDM": "Tsinghua",
    "internlm": "Shanghai AI Lab",
    "baichuan-inc": "Baichuan",
    "bigscience": "BigScience",
    "EleutherAI": "EleutherAI",
    "tiiuae": "TII",
    "stabilityai": "Stability AI",
    "NousResearch": "Nous Research",
    "teknium": "Teknium",
    "Open-Orca": "Open Orca",
    "lmsys": "LMSYS",
    "HuggingFaceH4": "Hugging Face",
    "mosaicml": "MosaicML",
    "databricks": "Databricks",
    "allenai": "Allen AI",
    "CohereForAI": "Cohere",
    "nvidia": "NVIDIA",
    "amazon": "Amazon",
    "apple": "Apple",
}


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
