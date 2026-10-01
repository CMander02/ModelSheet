"""OPT counts, including learned positions, biases and embedding projections.

Reference: transformers/models/opt/modeling_opt.py.
"""

from .base import ArchParamCalculator


class OptParams(ArchParamCalculator):
    def calc(self) -> tuple[int | None, int | None]:
        c = self.cfg
        h, layers, vocab = self.h(), self.L(), self.vocab()
        intermediate = c.get("ffn_dim", 0)
        positions = c.get("max_position_embeddings", 0)
        if not all([h, layers, vocab, intermediate, positions]):
            return None, None

        embedding_dim = c.get("word_embed_proj_dim", h)
        total = vocab * embedding_dim
        if not c.get("tie_word_embeddings", True):
            total += vocab * embedding_dim
        # OPT reserves two positions for its padding offset.
        total += (positions + 2) * h
        if embedding_dim != h:
            total += 2 * h * embedding_dim

        block = 4 * h * h + 2 * h * intermediate
        if c.get("enable_bias", True):
            block += 4 * h + intermediate + h
        if c.get("layer_norm_elementwise_affine", True):
            block += 4 * h  # two LayerNorms, each with weight and bias
            if c.get("do_layer_norm_before", True) and not c.get("_remove_final_layer_norm", False):
                total += 2 * h
        total += layers * block
        return total, total
