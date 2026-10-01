"""Active text parameters for Qwen3 Next and Qwen3.5 MoE.

Count the hybrid Gated DeltaNet / gated GQA decoder, embeddings, LM head,
routers and shared experts. Vision encoding and optional MTP are separate
from the text generation path. Full-model totals come from API tensor counts.

Reference: transformers/models/qwen3_5_moe/modeling_qwen3_5_moe.py.
"""

from .base import ArchParamCalculator


class Qwen35MoeParams(ArchParamCalculator):
    def calc(self) -> tuple[None, int | None]:
        c = self.cfg
        required = (
            "hidden_size", "num_hidden_layers", "vocab_size", "head_dim",
            "num_attention_heads", "num_key_value_heads", "num_experts",
            "num_experts_per_tok", "moe_intermediate_size",
            "linear_num_key_heads", "linear_key_head_dim",
            "linear_num_value_heads", "linear_value_head_dim",
            "linear_conv_kernel_dim", "shared_expert_intermediate_size",
        )
        if not all(isinstance(c.get(k), int) and c[k] > 0 for k in required):
            return None, None

        h, layers, vocab = self.h(), self.L(), self.vocab()
        layer_types = c.get("layer_types")
        if layer_types is None:
            interval = c.get("full_attention_interval", 4)
            layer_types = [
                "full_attention" if (i + 1) % interval == 0 else "linear_attention"
                for i in range(layers)
            ]
        if len(layer_types) != layers or any(
            kind not in {"full_attention", "linear_attention"} for kind in layer_types
        ):
            return None, None

        head_dim = c["head_dim"]
        q_dim = c["num_attention_heads"] * head_dim
        kv_dim = c["num_key_value_heads"] * head_dim
        # Q includes the output gate; Q and K each have a per-head RMSNorm.
        full = h * (3 * q_dim + 2 * kv_dim) + 2 * head_dim
        if c.get("attention_bias", False):
            full += 2 * q_dim + 2 * kv_dim + h

        key_dim = c["linear_num_key_heads"] * c["linear_key_head_dim"]
        value_heads = c["linear_num_value_heads"]
        value_dim = value_heads * c["linear_value_head_dim"]
        conv_dim = 2 * key_dim + value_dim
        # QKV, Z, beta/alpha, output projections, convolution, dt/A and norm.
        linear = (
            h * (conv_dim + 2 * value_dim + 2 * value_heads)
            + conv_dim * c["linear_conv_kernel_dim"]
            + 2 * value_heads + c["linear_value_head_dim"]
        )
        expert = 3 * h * c["moe_intermediate_size"]
        shared = 3 * h * c["shared_expert_intermediate_size"]
        moe = c["num_experts_per_tok"] * expert + shared
        moe += h * c["num_experts"] + h  # router and shared-expert gate
        embeddings = vocab * h * (1 if c.get("tie_word_embeddings", False) else 2)
        active = embeddings + h  # final RMSNorm
        active += sum(full if kind == "full_attention" else linear for kind in layer_types)
        active += layers * (moe + 2 * h)  # two decoder RMSNorms
        return None, active
