"""Field extractors for model configuration parsing."""

from .base import ConfigContext, get_first_of
from .metadata import (
    extract_id,
    extract_name,
    extract_provider,
    extract_huggingface_url,
    extract_tech_report,
    extract_arxiv_url,
    extract_created_at,
    extract_input_modalities,
    extract_output_modalities,
)
from .architecture import (
    extract_architecture,
    extract_vocab_size,
    extract_num_layers,
    extract_num_heads,
    extract_num_kv_heads,
    extract_hidden_size,
    extract_embedding_dim,
    extract_intermediate_size,
    extract_context_length,
    extract_activation,
    extract_norm_type,
    extract_norm_eps,
    extract_position_encoding,
    extract_attention_dropout,
    extract_mlp_factor,
    extract_gqa_ratio,
    extract_torch_dtype,
)
from .moe import (
    extract_is_moe,
    extract_num_experts,
    extract_num_shared_experts,
    extract_num_experts_per_token,
    extract_num_activated_experts,
    extract_moe_intermediate_size,
)
from .parameters import (
    extract_total_parameters,
    extract_active_parameters,
    extract_embedding_parameters,
    extract_non_embedding_parameters,
)

__all__ = [
    # Base
    "ConfigContext",
    "get_first_of",
    # Metadata
    "extract_id",
    "extract_name",
    "extract_provider",
    "extract_huggingface_url",
    "extract_tech_report",
    "extract_arxiv_url",
    "extract_created_at",
    "extract_input_modalities",
    "extract_output_modalities",
    # Architecture
    "extract_architecture",
    "extract_vocab_size",
    "extract_num_layers",
    "extract_num_heads",
    "extract_num_kv_heads",
    "extract_hidden_size",
    "extract_embedding_dim",
    "extract_intermediate_size",
    "extract_context_length",
    "extract_activation",
    "extract_norm_type",
    "extract_norm_eps",
    "extract_position_encoding",
    "extract_attention_dropout",
    "extract_mlp_factor",
    "extract_gqa_ratio",
    "extract_torch_dtype",
    # MoE
    "extract_is_moe",
    "extract_num_experts",
    "extract_num_shared_experts",
    "extract_num_experts_per_token",
    "extract_num_activated_experts",
    "extract_moe_intermediate_size",
    # Parameters
    "extract_total_parameters",
    "extract_active_parameters",
    "extract_embedding_parameters",
    "extract_non_embedding_parameters",
]
