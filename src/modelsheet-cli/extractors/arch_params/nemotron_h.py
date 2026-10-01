"""Nemotron-H text generation path, with Mamba-2 and latent ReLU-squared MoE.

Reference: NVIDIA-Nemotron-3-Super-120B-A12B-BF16/modeling_nemotron_h.py.
Active counts exclude the optional MTP draft model and non-parameter buffers.
Full stored totals continue to come from the repository API.
"""

from .base import ArchParamCalculator


class NemotronHParams(ArchParamCalculator):
    def calc(self) -> tuple[None, int | None]:
        c = self.cfg
        experts = c.get("n_routed_experts", 0)
        if not experts:
            return None, self.metadata.get("totalParameters", c.get("num_parameters"))
        required = (
            "hidden_size", "num_hidden_layers", "vocab_size", "mamba_num_heads",
            "mamba_head_dim", "n_groups", "ssm_state_size", "conv_kernel",
            "num_attention_heads", "num_key_value_heads", "head_dim",
            "moe_intermediate_size", "num_experts_per_tok",
        )
        if not all(isinstance(c.get(k), int) and c[k] > 0 for k in required):
            return None, None
        pattern = c.get("hybrid_override_pattern", "")
        if len(pattern) != self.L() or set(pattern) - set("ME*-"):
            return None, None
        if c.get("mlp_hidden_act", "relu2") != "relu2":
            return None, None

        h = self.h()
        mamba_heads = c["mamba_num_heads"]
        inner = mamba_heads * c["mamba_head_dim"]
        conv = inner + 2 * c["n_groups"] * c["ssm_state_size"]
        in_dim = inner + conv + mamba_heads
        mamba = h * (in_dim + inner) + conv * c["conv_kernel"]
        mamba += inner + 3 * mamba_heads  # gated RMSNorm, dt, A and D
        if c.get("use_conv_bias", True):
            mamba += conv
        if c.get("mamba_proj_bias", False):
            mamba += in_dim + h

        q_dim = c["num_attention_heads"] * c["head_dim"]
        kv_dim = c["num_key_value_heads"] * c["head_dim"]
        attention = 2 * h * (q_dim + kv_dim)
        if c.get("attention_bias", False):
            attention += q_dim + 2 * kv_dim + h

        latent = c.get("moe_latent_size") or h
        intermediate = c["moe_intermediate_size"]
        # ReLU² experts have up/down projections; shared experts stay at full width.
        moe = 2 * latent * intermediate * c["num_experts_per_tok"] + h * experts
        if latent != h:
            moe += 2 * h * latent
        shared_width = c.get("moe_shared_expert_intermediate_size", intermediate)
        shared_count = c.get("n_shared_experts", 0)
        moe += 2 * h * shared_width * shared_count
        dense = 2 * h * c.get("intermediate_size", intermediate)
        if c.get("mlp_bias", False):
            moe += c["num_experts_per_tok"] * (intermediate + latent)
            moe += shared_count * (shared_width + h)
            dense += c.get("intermediate_size", intermediate) + h

        components = {"M": mamba, "*": attention, "E": moe, "-": dense}
        active = self.vocab() * h * (1 if c.get("tie_word_embeddings", False) else 2)
        active += h + self.L() * h  # final and per-block RMSNorms
        active += sum(components[kind] for kind in pattern)
        return None, active
