"""MoE (Mixture of Experts) field extractors."""

from typing import Optional

from .base import ConfigContext, get_first_of


def extract_is_moe(ctx: ConfigContext) -> bool:
    """Check if model uses MoE architecture.

    Source: config.json (multiple keys)
    Logic: Check if num_experts/num_local_experts/n_routed_experts exists and > 1
           OR model_type contains 'moe'
    """
    return (
        ctx.config.get("num_local_experts", 0) > 1
        or ctx.config.get("num_experts", 0) > 1
        or ctx.config.get("n_routed_experts", 0) > 1
        or "moe" in ctx.config.get("model_type", "").lower()
    )


def extract_num_experts(ctx: ConfigContext) -> Optional[int]:
    """Extract number of routed experts.

    Source: config.json n_routed_experts
    Fallback: num_local_experts, num_experts
    """
    return get_first_of(
        ctx.config,
        "n_routed_experts",
        "num_local_experts",
        "num_experts",
    )


def extract_num_shared_experts(ctx: ConfigContext) -> Optional[int]:
    """Extract number of shared experts (always activated).

    Source: config.json n_shared_experts
    Note: DeepSeek-style models use shared experts that are always active
    """
    return ctx.config.get("n_shared_experts")


def extract_num_experts_per_token(ctx: ConfigContext) -> Optional[int]:
    """Extract number of experts activated per token.

    Source: config.json num_experts_per_tok
    Fallback: num_experts_per_token
    """
    return get_first_of(
        ctx.config,
        "num_experts_per_tok",
        "num_experts_per_token",
    )


def extract_moe_intermediate_size(ctx: ConfigContext) -> Optional[int]:
    """Extract MoE expert FFN intermediate size.

    Source: config.json moe_intermediate_size
    Note: May differ from regular intermediate_size for MoE experts
    """
    return ctx.config.get("moe_intermediate_size")


def extract_num_activated_experts(ctx: ConfigContext) -> Optional[int]:
    """Extract total number of activated experts per token.

    Source: Calculated from config.json
    Formula: num_experts_per_tok + n_shared_experts

    Note: This is the total number of experts used per forward pass,
          including both routed experts and shared experts (always active).
    """
    if not extract_is_moe(ctx):
        return None

    num_routed = extract_num_experts_per_token(ctx)
    num_shared = extract_num_shared_experts(ctx) or 0

    if num_routed is None:
        return None

    return num_routed + num_shared
