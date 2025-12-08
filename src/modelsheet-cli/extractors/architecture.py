"""Architecture field extractors with fallback key support."""

from typing import Optional

from .base import ConfigContext, get_first_of


def extract_architecture(ctx: ConfigContext) -> Optional[str]:
    """Extract model architecture type.

    Source: config.json model_type
    Fallback: architectures[0] (more verbose)

    Note: model_type gives short name (e.g., qwen2)
          architectures[0] gives full class name (e.g., Qwen2ForCausalLM)
    """
    model_type = ctx.config.get("model_type")
    if model_type:
        return model_type
    # Fallback to architectures[0]
    architectures = ctx.config.get("architectures")
    if architectures and isinstance(architectures, list) and len(architectures) > 0:
        return architectures[0]
    return None


def extract_vocab_size(ctx: ConfigContext) -> Optional[int]:
    """Extract vocabulary size.

    Source: config.json vocab_size
    """
    return ctx.config.get("vocab_size")


def extract_num_layers(ctx: ConfigContext) -> Optional[int]:
    """Extract number of transformer layers.

    Source: config.json num_hidden_layers
    Fallback: n_layer (GPT-NeoX/Falcon), num_layers
    """
    return get_first_of(
        ctx.config,
        "num_hidden_layers",
        "n_layer",
        "num_layers",
    )


def extract_num_heads(ctx: ConfigContext) -> Optional[int]:
    """Extract number of attention heads.

    Source: config.json num_attention_heads
    Fallback: n_head (GPT-NeoX/Falcon)
    """
    return get_first_of(
        ctx.config,
        "num_attention_heads",
        "n_head",
    )


def extract_num_kv_heads(ctx: ConfigContext) -> Optional[int]:
    """Extract number of key-value heads for GQA.

    Source: config.json num_key_value_heads
    Default: If not present, equals num_attention_heads (no GQA)
    """
    kv_heads = ctx.config.get("num_key_value_heads")
    if kv_heads is not None:
        return kv_heads
    # Default to num_heads if not specified (no GQA)
    return extract_num_heads(ctx)


def extract_hidden_size(ctx: ConfigContext) -> Optional[int]:
    """Extract hidden layer dimension.

    Source: config.json hidden_size
    Fallback: n_embd (GPT-2), d_model (T5)
    """
    return get_first_of(
        ctx.config,
        "hidden_size",
        "n_embd",
        "d_model",
    )


def extract_embedding_dim(ctx: ConfigContext) -> Optional[int]:
    """Extract embedding dimension.

    Source: config.json hidden_size
    Note: Usually equals hidden_size for modern transformers
    """
    return extract_hidden_size(ctx)


def extract_intermediate_size(ctx: ConfigContext) -> Optional[int]:
    """Extract FFN intermediate layer size.

    Source: config.json intermediate_size
    Fallback: n_inner (GPT-2)
    """
    return get_first_of(
        ctx.config,
        "intermediate_size",
        "n_inner",
    )


def extract_context_length(ctx: ConfigContext) -> Optional[int]:
    """Extract maximum context length.

    Source: config.json (multiple possible keys)
    Priority: max_position_embeddings > seq_length > n_ctx > model_max_length
    """
    return get_first_of(
        ctx.config,
        "max_position_embeddings",
        "seq_length",
        "n_ctx",
        "n_positions",
        "max_sequence_length",
        "model_max_length",
    )


def extract_activation(ctx: ConfigContext) -> Optional[str]:
    """Extract activation function name.

    Source: config.json hidden_act
    Fallback: activation_function
    """
    return get_first_of(
        ctx.config,
        "hidden_act",
        "activation_function",
    )


def extract_norm_type(ctx: ConfigContext) -> Optional[str]:
    """Detect normalization type from config keys.

    Source: config.json (key name detection)
    Logic:
        - Contains rms_norm_eps -> RMSNorm
        - Contains layer_norm_eps/layer_norm_epsilon -> LayerNorm
    """
    if "rms_norm_eps" in ctx.config:
        return "RMSNorm"
    if "layer_norm_eps" in ctx.config or "layer_norm_epsilon" in ctx.config:
        return "LayerNorm"
    # Infer from model type
    model_type = ctx.config.get("model_type", "").lower()
    if model_type in ["llama", "mistral", "mixtral", "qwen", "qwen2", "deepseek", "gemma"]:
        return "RMSNorm"
    return None


def extract_norm_eps(ctx: ConfigContext) -> Optional[float]:
    """Extract normalization epsilon value.

    Source: config.json rms_norm_eps
    Fallback: layer_norm_eps, layer_norm_epsilon
    """
    return get_first_of(
        ctx.config,
        "rms_norm_eps",
        "layer_norm_eps",
        "layer_norm_epsilon",
    )


def extract_position_encoding(ctx: ConfigContext) -> Optional[str]:
    """Detect position encoding type.

    Source: config.json (key name detection)
    Logic:
        - Contains rope_theta/rope_scaling -> RoPE
        - Contains alibi/use_alibi -> ALiBi
        - Contains rotary_pct -> RoPE (partial)
    """
    if ctx.config.get("rope_scaling") or ctx.config.get("rope_theta"):
        return "RoPE"
    if ctx.config.get("use_alibi") or ctx.config.get("alibi"):
        return "ALiBi"
    if ctx.config.get("rotary_pct"):
        return "RoPE"
    return None


def extract_attention_dropout(ctx: ConfigContext) -> Optional[float]:
    """Extract attention dropout rate.

    Source: config.json attention_dropout
    """
    return ctx.config.get("attention_dropout")


def extract_mlp_factor(ctx: ConfigContext) -> Optional[float]:
    """Calculate MLP expansion factor.

    Source: Calculated from config.json
    Formula: intermediate_size / hidden_size
    Precision: 2 decimal places
    """
    hidden_size = extract_hidden_size(ctx)
    intermediate_size = extract_intermediate_size(ctx)

    if hidden_size and intermediate_size and hidden_size > 0:
        return round(intermediate_size / hidden_size, 2)
    return None


def extract_gqa_ratio(ctx: ConfigContext) -> Optional[float]:
    """Calculate GQA (Grouped Query Attention) ratio.

    Source: Calculated from config.json
    Formula: num_attention_heads / num_key_value_heads
    Precision: 1 decimal place (changed from 2)

    Note: Ratio of 1.0 means MHA, >1 means GQA, equals num_heads means MQA
    """
    num_heads = extract_num_heads(ctx)
    num_kv_heads = ctx.config.get("num_key_value_heads")

    # Only calculate if explicit kv_heads is provided
    if num_heads and num_kv_heads and num_kv_heads > 0:
        return round(num_heads / num_kv_heads, 1)
    return None
