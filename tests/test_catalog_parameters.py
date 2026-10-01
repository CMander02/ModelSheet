"""Published configurations that need architecture-specific parameter counts."""

import unittest

from modelsheet_cli.parser import ModelParser


class CatalogParameterTests(unittest.TestCase):
    def parse(self, model_type, config, total=None):
        return ModelParser().parse("org/model", {
            "config.json": {"model_type": model_type, **config},
            "_metadata": {"totalParameters": total} if total is not None else {},
        })

    def test_opt_125m_includes_positions_norms_and_biases(self):
        # https://huggingface.co/facebook/opt-125m/blob/main/config.json
        model = self.parse("opt", {
            "hidden_size": 768, "num_hidden_layers": 12, "vocab_size": 50272,
            "ffn_dim": 3072, "max_position_embeddings": 2048,
            "word_embed_proj_dim": 768, "do_layer_norm_before": True,
        })
        self.assertEqual(model.total_parameters, 125_239_296)
        self.assertEqual(model.active_parameters, 125_239_296)
        self.assertEqual(model.intermediate_size, 3072)
        self.assertEqual(model.norm_type, "LayerNorm")
        self.assertEqual(model.position_encoding, "Learned absolute")

    def test_olmoe_matches_full_tensor_count_and_top8(self):
        # https://huggingface.co/allenai/OLMoE-1B-7B-0125-Instruct/blob/main/config.json
        # Full tensor count is 6,919,161,856; inactive experts account for
        # 5,637,144,576 parameters across the 16 layers.
        model = self.parse("olmoe", {
            "hidden_size": 2048, "num_hidden_layers": 16, "vocab_size": 50304,
            "intermediate_size": 1024, "num_attention_heads": 16,
            "num_key_value_heads": 16, "num_experts": 64,
            "num_experts_per_tok": 8, "tie_word_embeddings": False,
        })
        self.assertEqual(model.total_parameters, 6_919_161_856)
        self.assertEqual(model.active_parameters, 1_282_017_280)
        self.assertEqual(model.num_activated_experts, 8)
        self.assertEqual(model.moe_intermediate_size, 1024)

    def test_qwen_coder_next_keeps_hybrid_mixers_and_shared_expert(self):
        # https://huggingface.co/Qwen/Qwen3-Coder-Next/blob/main/config.json
        # Published total minus inactive expert tensors = 3,874,929,408.
        model = self.parse("qwen3_next", {
            "hidden_size": 2048, "num_hidden_layers": 48, "vocab_size": 151936,
            "head_dim": 256, "num_attention_heads": 16, "num_key_value_heads": 2,
            "num_experts": 512, "num_experts_per_tok": 10,
            "moe_intermediate_size": 512, "shared_expert_intermediate_size": 512,
            "linear_num_key_heads": 16, "linear_key_head_dim": 128,
            "linear_num_value_heads": 32, "linear_value_head_dim": 128,
            "linear_conv_kernel_dim": 4, "full_attention_interval": 4,
            "tie_word_embeddings": False,
        }, 79_674_391_296)
        self.assertEqual(model.total_parameters, 79_674_391_296)
        self.assertEqual(model.active_parameters, 3_874_929_408)
        self.assertEqual(model.num_activated_experts, 11)

    def test_nemotron_super_latent_experts_and_mtp_exclusion(self):
        # https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16
        # Headers: BF16 weights 123,611,012,096; MTP 2,942,324,736;
        # inactive backbone experts 107,898,470,400. F32 routing buffers
        # remain in the API total but are not trainable active parameters.
        config = {
            "hidden_size": 4096, "num_hidden_layers": 88, "vocab_size": 131072,
            "hybrid_override_pattern": "MEMEMEM*EMEMEMEM*EMEMEMEM*EMEMEMEMEM*EMEMEMEMEM*EMEMEMEMEM*EMEMEMEMEM*EMEMEMEM*EMEMEMEME",
            "mamba_num_heads": 128, "mamba_head_dim": 64, "n_groups": 8,
            "ssm_state_size": 128, "conv_kernel": 4,
            "num_attention_heads": 32, "num_key_value_heads": 2, "head_dim": 128,
            "n_routed_experts": 512, "n_shared_experts": 1, "num_experts_per_tok": 22,
            "moe_latent_size": 1024, "moe_intermediate_size": 2688,
            "moe_shared_expert_intermediate_size": 5376, "mlp_hidden_act": "relu2",
            "mtp_hybrid_override_pattern": "*E", "num_nextn_predict_layers": 1,
            "tie_word_embeddings": False,
        }
        model = self.parse("nemotron_h", config, 123_611_033_088)
        self.assertEqual(model.total_parameters, 123_611_033_088)
        self.assertEqual(model.active_parameters, 12_770_216_960)
        self.assertEqual(model.num_activated_experts, 23)
        config["num_nextn_predict_layers"] = 0
        self.assertEqual(self.parse("nemotron_h", config).active_parameters, model.active_parameters)

    def test_deepseek_ced_does_not_use_generic_moe_active_estimate(self):
        model = self.parse("deepseek_v41", {
            "text_config": {"hidden_size": 5120, "num_hidden_layers": 40,
                            "vocab_size": 129280, "n_routed_experts": 384,
                            "n_shared_experts": 1, "num_experts_per_tok": 6,
                            "moe_intermediate_size": 2304},
        }, 763_205_315_794)
        self.assertEqual(model.total_parameters, 763_205_315_794)
        self.assertIsNone(model.active_parameters)

    def test_molmo_text_uses_rmsnorm_with_legacy_epsilon_key(self):
        model = self.parse("molmo2", {
            "text_config": {"layer_norm_eps": 1e-6, "model_type": "molmo2_text"},
        })
        self.assertEqual(model.norm_type, "RMSNorm")
        self.assertEqual(model.norm_eps, 1e-6)

    def test_internvl_keeps_vision_and_flash_components_in_active_count(self):
        # Official BF16 tensor totals minus inactive Qwen3 expert tensors.
        cases = [
            (2048, 48, 768, 30_991_437_826, 3_812_347_906),
            (4096, 94, 1536, 241_711_289_346, 28_808_418_306),
        ]
        for hidden, layers, intermediate, total, active in cases:
            with self.subTest(total=total):
                model = self.parse("internvl_chat", {"llm_config": {
                    "model_type": "qwen3_moe", "hidden_size": hidden,
                    "num_hidden_layers": layers, "moe_intermediate_size": intermediate,
                    "num_experts": 128, "num_experts_per_tok": 8,
                    "decoder_sparse_step": 1, "mlp_only_layers": [],
                }}, total)
                self.assertEqual(model.total_parameters, total)
                self.assertEqual(model.active_parameters, active)

    def test_internvl_gpt_oss_counts_fused_expert_biases(self):
        # InternVL3_5-GPT-OSS-20B-A4B-Preview-HF safetensors headers:
        # expert gate/up [32, 2880, 5760], down [32, 2880, 2880],
        # biases [32, 5760] and [32, 2880], in each of 24 layers.
        model = self.parse("internvl", {"text_config": {
            "model_type": "gpt_oss", "hidden_size": 2880,
            "num_hidden_layers": 24, "intermediate_size": 2880,
            "num_local_experts": 32, "num_experts_per_tok": 4,
        }}, 21_232_768_704)
        self.assertEqual(model.total_parameters, 21_232_768_704)
        self.assertEqual(model.active_parameters, 4_505_452_224)
        self.assertEqual(model.moe_intermediate_size, 2880)

    def test_internvl_paper_matches_current_family_in_readme_navigation(self):
        model = ModelParser().parse("OpenGVLab/InternVL3_5-8B-Flash", {
            "config.json": {"model_type": "internvl_chat"},
            "_metadata": {
                "tags": ["arxiv:2312.14238", "arxiv:2508.18265"],
                "readme": r"[\[📜 InternVL 1.0\]](https://huggingface.co/papers/2312.14238) "
                          r"[\[📜 InternVL3.5\]](https://huggingface.co/papers/2508.18265)",
            },
        })
        self.assertEqual(model.arxiv_url, "https://arxiv.org/abs/2508.18265")


if __name__ == "__main__":
    unittest.main()
