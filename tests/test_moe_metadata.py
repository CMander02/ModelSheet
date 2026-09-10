"""Shared expert regression cases from the September 2026 catalog intake."""

import unittest

from modelsheet_cli.extractors.base import ConfigContext
from modelsheet_cli.extractors.moe import (
    extract_num_activated_experts,
    extract_num_shared_experts,
)


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


if __name__ == "__main__":
    unittest.main()
