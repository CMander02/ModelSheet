"""Parameter calculation extractors."""

from typing import Optional, Tuple

from .base import ConfigContext, get_first_of
from .architecture import extract_hidden_size, extract_num_layers, extract_intermediate_size
from .moe import (
    extract_is_moe,
    extract_num_experts,
    extract_num_shared_experts,
    extract_num_experts_per_token,
    extract_moe_intermediate_size,
)


def _calc_dense_params(ctx: ConfigContext) -> Tuple[Optional[int], Optional[int]]:
    """Calculate parameters for dense (non-MoE) models.

    Returns:
        Tuple of (total_parameters, active_parameters) - same value for dense models
    """
    h = extract_hidden_size(ctx)
    l = extract_num_layers(ctx)
    v = ctx.config.get("vocab_size")
    i = extract_intermediate_size(ctx)

    if not all([h, l, v, i]):
        return None, None

    # Embedding layer
    embedding = v * h

    # Attention per layer: Q, K, V, O projections
    attention = l * (4 * h * h)

    # FFN per layer: up and down projections (SwiGLU has 3 matrices)
    # Standard: 2 * h * i
    # SwiGLU: 3 * h * i
    hidden_act = ctx.config.get("hidden_act", "")
    if "glu" in hidden_act.lower() or "swiglu" in hidden_act.lower() or "silu" in hidden_act.lower():
        ffn = l * (3 * h * i)
    else:
        ffn = l * (2 * h * i)

    total = embedding + attention + ffn
    return total, total


def _calc_moe_params(ctx: ConfigContext) -> Tuple[Optional[int], Optional[int]]:
    """Calculate parameters for MoE models.

    Handles:
        - Routed experts
        - Shared experts (always active)

    Returns:
        Tuple of (total_parameters, active_parameters)
    """
    h = extract_hidden_size(ctx)
    l = extract_num_layers(ctx)
    v = ctx.config.get("vocab_size")

    n_routed_experts = extract_num_experts(ctx)
    n_shared_experts = extract_num_shared_experts(ctx) or 0
    num_experts_per_tok = extract_num_experts_per_token(ctx) or 1
    moe_intermediate_size = extract_moe_intermediate_size(ctx) or extract_intermediate_size(ctx)

    if not all([h, l, v, n_routed_experts, moe_intermediate_size]):
        return None, None

    # Embedding layer
    embedding = v * h

    # Attention (same for all layers)
    attention = l * (4 * h * h)

    # MoE FFN layers
    # Each expert has: gate_proj + up_proj + down_proj (3 matrices for SwiGLU)
    params_per_routed_expert = 3 * h * moe_intermediate_size
    params_per_shared_expert = 3 * h * moe_intermediate_size if n_shared_experts > 0 else 0

    # Total: all experts in all MoE layers
    total_routed = l * n_routed_experts * params_per_routed_expert
    total_shared = l * n_shared_experts * params_per_shared_expert

    # Active: only activated experts + all shared experts
    active_routed = l * num_experts_per_tok * params_per_routed_expert
    active_shared = total_shared  # Shared experts always active

    total = embedding + attention + total_routed + total_shared
    active = embedding + attention + active_routed + active_shared

    return total, active


def _estimate_moe_active_from_total(ctx: ConfigContext, total: int) -> Optional[int]:
    """Estimate active parameters when we have explicit total from API.

    Uses ratio-based estimation since we know the total but not the breakdown.
    """
    n_routed_experts = extract_num_experts(ctx)
    num_experts_per_tok = extract_num_experts_per_token(ctx)

    if not all([n_routed_experts, num_experts_per_tok]):
        return None

    # Estimate: assume ~70% of params are in MoE layers (typical for large MoE)
    ratio = num_experts_per_tok / n_routed_experts
    moe_fraction = 0.7
    non_moe_params = total * (1 - moe_fraction)
    moe_params_active = total * moe_fraction * ratio

    return int(non_moe_params + moe_params_active)


def _calc_parameters(ctx: ConfigContext) -> Tuple[Optional[int], Optional[int]]:
    """Calculate total and active parameters.

    Priority:
        1. HuggingFace API safetensors.total (most accurate)
        2. config.json num_parameters (explicit)
        3. Calculated from architecture

    Returns:
        Tuple of (total_parameters, active_parameters)
    """
    is_moe = extract_is_moe(ctx)

    # Priority 1: API metadata (most accurate)
    if "totalParameters" in ctx.metadata:
        total = ctx.metadata["totalParameters"]
        if not is_moe:
            return total, total
        active = _estimate_moe_active_from_total(ctx, total)
        return total, active

    # Priority 2: Explicit in config
    if "num_parameters" in ctx.config:
        total = ctx.config["num_parameters"]
        if not is_moe:
            return total, total
        active = _estimate_moe_active_from_total(ctx, total)
        return total, active

    # Priority 3: Calculate from architecture
    if is_moe:
        return _calc_moe_params(ctx)
    else:
        return _calc_dense_params(ctx)


def extract_total_parameters(ctx: ConfigContext) -> Optional[int]:
    """Extract total parameter count.

    Source: API safetensors.total > config.json num_parameters > calculated
    """
    total, _ = _calc_parameters(ctx)
    return total


def extract_active_parameters(ctx: ConfigContext) -> Optional[int]:
    """Extract active parameter count (per token).

    Source: Calculated based on architecture
    Note: For dense models, equals total_parameters
          For MoE models, only counts activated experts
    """
    _, active = _calc_parameters(ctx)
    return active
