"""Ensure coarse Hub pipeline tags retain configured input encoders."""

import unittest

from modelsheet_cli.parser import ModelParser


class MultimodalMetadataTests(unittest.TestCase):
    def test_nex_mini_keeps_vision_with_a_text_generation_tag(self):
        model = ModelParser().parse("nex-agi/Nex-N2.5-mini", {
            "config.json": {
                "model_type": "qwen3_5_moe",
                "vision_config": {"depth": 27},
            },
            "_metadata": {"pipelineTag": "text-generation"},
        })
        self.assertEqual(set(model.input_modalities), {"image", "text"})
        self.assertEqual(model.output_modalities, ["text"])

    def test_contextpilot_retains_gemma_audio_vision_and_activation(self):
        model = ModelParser().parse("tencent/ContextPilot-E4B", {
            "config.json": {
                "model_type": "gemma4",
                "text_config": {"hidden_activation": "gelu_pytorch_tanh"},
                "vision_config": {"model_type": "gemma4_vision"},
                "audio_config": {"model_type": "gemma4_audio"},
            },
            "_metadata": {"pipelineTag": "text-generation"},
        })
        self.assertEqual(set(model.input_modalities), {"audio", "image", "text"})
        self.assertEqual(model.activation, "gelu_pytorch_tanh")


if __name__ == "__main__":
    unittest.main()
