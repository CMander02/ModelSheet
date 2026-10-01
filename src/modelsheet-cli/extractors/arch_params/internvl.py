"""Whole-model active counts for InternVL with Qwen3 MoE / GPT-OSS backbones.

Subtract inactive routed experts from the repository tensor count. This keeps
the vision encoder, projector, Flash router, embeddings and output head in the
multimodal count. Source: OpenGVLab/InternVL3_5-241B-A28B-Flash/config.json.
"""

from .base import ArchParamCalculator


class InternVLParams(ArchParamCalculator):
    def calc(self) -> tuple[None, int | None]:
        c = self.cfg
        llm = c.get("llm_config", c.get("text_config", {}))
        total = self.metadata.get("totalParameters")
        experts = llm.get("num_experts", llm.get("n_routed_experts", llm.get("num_local_experts", 0)))
        if not experts:
            return None, total
        backbone = llm.get("model_type")
        if backbone not in {"qwen3_moe", "gpt_oss"} or not total:
            return None, None
        if llm.get("decoder_sparse_step", 1) != 1 or llm.get("mlp_only_layers"):
            return None, None
        required = ("hidden_size", "num_hidden_layers", "num_experts_per_tok")
        if not all(isinstance(llm.get(k), int) and llm[k] > 0 for k in required):
            return None, None
        intermediate = llm.get("moe_intermediate_size") if backbone == "qwen3_moe" else llm.get("intermediate_size")
        if not isinstance(intermediate, int) or intermediate <= 0:
            return None, None
        expert = 3 * llm["hidden_size"] * intermediate
        if backbone == "gpt_oss":
            expert += 2 * intermediate + llm["hidden_size"]  # gate/up and down biases
        inactive = llm["num_hidden_layers"] * (experts - llm["num_experts_per_tok"]) * expert
        return None, total - inactive
