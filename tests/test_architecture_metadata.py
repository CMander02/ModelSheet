"""Regressions for released configs with nested or legacy architecture keys."""

import unittest

from modelsheet_cli.parser import ModelParser


class ArchitectureMetadataTests(unittest.TestCase):
    def test_nested_text_rope_parameters_are_preserved(self):
        model = ModelParser().parse("Qwen/Qwen3.8-Flash-Next", {
            "config.json": {
                "model_type": "qwen4_exp",
                "text_config": {
                    "model_type": "qwen4_exp_text",
                    "rope_parameters": {"rope_theta": 10000000, "rope_type": "default"},
                },
            },
        })
        self.assertEqual(model.position_encoding, "RoPE")

    def test_nemotron_h_backbone_uses_rmsnorm_with_legacy_epsilon_key(self):
        model = ModelParser().parse("nvidia/Nemotron-3-Labs-Ultra-Math-RL", {
            "config.json": {
                "model_type": "nemotron_h",
                "layer_norm_epsilon": 1e-5,
                "norm_eps": 1e-5,
            },
        })
        self.assertEqual(model.norm_type, "RMSNorm")
        self.assertEqual(model.norm_eps, 1e-5)


if __name__ == "__main__":
    unittest.main()
