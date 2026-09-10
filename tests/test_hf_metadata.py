"""Regression coverage for parameter counts from Hugging Face metadata."""

import unittest
from unittest.mock import patch

from modelsheet_cli.fetcher import ModelFetcher
from modelsheet_cli.parser import ModelParser
from modelsheet_cli.config import build_hf_org_to_ms_org_map


class HuggingFaceMetadataTests(unittest.TestCase):
    def test_iflytek_modelscope_links_match_the_publishing_org(self):
        providers = {"providers": {"iFlyTek": {
            "region": "cn",
            "orgs": ["iFlytek", "XHToken"],
            "scan": {"ms": ["iFlytek", "XHToken"]},
        }}}
        with patch("modelsheet_cli.config.load_providers_data", return_value=providers):
            mapping = build_hf_org_to_ms_org_map()
        self.assertEqual(mapping["XHToken"][0], "XHToken")
        self.assertEqual(mapping["iFlytek"][0], "iFlytek")

    def test_ui_venus_uses_tensor_counts_when_summary_is_stale(self):
        raw = {
            "safetensors": {
                "parameters": {"BF16": 9_409_813_744},
                "total": 1_469_680,
            }
        }
        with ModelFetcher() as fetcher:
            metadata = fetcher._extract_hf_metadata(raw)
        model = ModelParser().parse("inclusionAI/UI-Venus-2-9B", {
            "config.json": {
                "model_type": "qwen3_5",
                "text_config": {
                    "hidden_size": 4096,
                    "vocab_size": 248320,
                    "num_hidden_layers": 32,
                },
            },
            "_metadata": metadata,
        })
        self.assertEqual(model.total_parameters, 9_409_813_744)
        self.assertEqual(model.active_parameters, model.total_parameters)
        self.assertGreater(model.non_embedding_parameters, 0)

    def test_metadata_with_only_a_total_remains_supported(self):
        with ModelFetcher() as fetcher:
            metadata = fetcher._extract_hf_metadata({
                "safetensors": {"total": 2_000_000_000},
                "createdAt": "2026-09-01T00:00:00Z",
            })
        self.assertEqual(metadata["totalParameters"], 2_000_000_000)
        self.assertEqual(metadata["releasedAt"], "2026-09-01T00:00:00Z")

    def test_deepseek_vision_keeps_the_complete_repository_parameter_count(self):
        model = ModelParser().parse("deepseek-ai/DeepSeek-V4-Flash-Vision-Exp", {
            "config.json": {
                "model_type": "deepseek_v4",
                "hidden_size": 4096,
                "num_hidden_layers": 43,
                "vocab_size": 129280,
                "n_routed_experts": 256,
                "n_shared_experts": 1,
                "num_experts_per_tok": 6,
                "moe_intermediate_size": 2048,
            },
            "_metadata": {"totalParameters": 304_646_824_126},
        })
        self.assertEqual(model.total_parameters, 304_646_824_126)
        self.assertGreater(model.active_parameters, 0)
        self.assertLess(model.active_parameters, model.total_parameters)


if __name__ == "__main__":
    unittest.main()
