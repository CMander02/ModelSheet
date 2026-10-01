"""OLMoE SwiGLU experts, full-vector QK norms and untied output head.

Reference: transformers/models/olmoe/modeling_olmoe.py.
"""

from .base import ArchParamCalculator


class OlmoeParams(ArchParamCalculator):
    def calc(self) -> tuple[int | None, int | None]:
        c = self.cfg
        h, layers, vocab = self.h(), self.L(), self.vocab()
        intermediate = c.get("intermediate_size", 0)
        experts = c.get("num_experts", 0)
        active_experts = c.get("num_experts_per_tok", 0)
        heads = c.get("num_attention_heads", 0)
        if not all([h, layers, vocab, intermediate, experts, active_experts, heads]):
            return None, None

        kv_dim = c.get("num_key_value_heads", heads) * (h // heads)
        attention = 2 * h * (h + kv_dim)
        if c.get("attention_bias", False):
            attention += 2 * (h + kv_dim)
        norms = 3 * h + kv_dim  # input, post-attention, Q and K RMSNorms
        shared = vocab * h * (1 if c.get("tie_word_embeddings", False) else 2) + h
        shared += layers * (attention + norms + h * experts)
        expert = 3 * h * intermediate
        return shared + layers * experts * expert, shared + layers * active_experts * expert
