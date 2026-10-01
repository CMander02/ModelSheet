"""Shared expert regression cases from the September 2026 catalog intake."""

import unittest

from modelsheet_cli.extractors.base import ConfigContext
from modelsheet_cli.extractors.moe import (
    extract_num_activated_experts,
    extract_num_shared_experts,
)
from modelsheet_cli.extractors.parameters import extract_active_parameters, extract_total_parameters


class SharedExpertTests(unittest.TestCase):
    def test_llada_and_qwen_include_the_always_active_shared_expert(self):
        cases = [
            ({"model_type": "llada2_moe", "num_experts_per_tok": 8,
              "num_shared_experts": 1}, 9),
            ({"model_type": "qwen4_exp", "num_experts": 512,
              "num_experts_per_tok": 10,
              "shared_expert_intermediate_size": 640}, 11),
            ({"model_type": "bailing_moe_v3_vl", "num_experts": 512,
              "num_experts_per_tok": 8,
              "moe_shared_expert_intermediate_size": 768}, 9),
        ]
        for config, expected in cases:
            with self.subTest(architecture=config["model_type"]):
                ctx = ConfigContext.from_configs("org/model", {"config.json": config})
                self.assertEqual(extract_num_shared_experts(ctx), 1)
                self.assertEqual(extract_num_activated_experts(ctx), expected)

    def test_disabled_or_unset_shared_ffn_does_not_add_an_expert(self):
        for config in [
            {"num_shared_experts": 0, "shared_expert_intermediate_size": 512},
            {"shared_expert_intermediate_size": -1},
        ]:
            with self.subTest(config=config):
                ctx = ConfigContext.from_configs("org/model", {"config.json": {
                    "model_type": "test_moe", "num_experts_per_tok": 8, **config,
                }})
                self.assertEqual(extract_num_activated_experts(ctx), 8)


class HybridMoeParameterTests(unittest.TestCase):
    def test_intern_s2_matches_published_tensor_shapes(self):
        # https://huggingface.co/internlm/Intern-S2-397B/blob/main/config.json
        # Safetensors headers: non-expert text weights total 9,824,459,520;
        # each routed expert has 12,582,912 weights. 60 layers use top-10.
        text_config = {
            "model_type": "qwen3_5_moe_text", "hidden_size": 4096,
            "num_hidden_layers": 60, "vocab_size": 251392, "head_dim": 256,
            "num_attention_heads": 32, "num_key_value_heads": 2,
            "num_experts": 512, "num_experts_per_tok": 10,
            "moe_intermediate_size": 1024, "shared_expert_intermediate_size": 1024,
            "linear_num_key_heads": 16, "linear_key_head_dim": 128,
            "linear_num_value_heads": 64, "linear_value_head_dim": 128,
            "linear_conv_kernel_dim": 4, "full_attention_interval": 4,
            "layer_types": ["linear_attention"] * 3 + ["full_attention"],
        }
        text_config["layer_types"] *= 15
        ctx = ConfigContext.from_configs("internlm/Intern-S2-397B", {
            "config.json": {"model_type": "qwen3_5_moe", "text_config": text_config,
                            "tie_word_embeddings": False},
            "_metadata": {"totalParameters": 403_423_094_768},
        })
        self.assertEqual(extract_total_parameters(ctx), 403_423_094_768)
        self.assertEqual(extract_active_parameters(ctx), 17_374_206_720)

    def test_incomplete_hybrid_config_leaves_active_count_unknown(self):
        ctx = ConfigContext.from_configs("org/model", {
            "config.json": {"model_type": "qwen3_5_moe", "num_experts": 512},
            "_metadata": {"totalParameters": 403_423_094_768},
        })
        self.assertEqual(extract_total_parameters(ctx), 403_423_094_768)
        self.assertIsNone(extract_active_parameters(ctx))


if __name__ == "__main__":
    unittest.main()
