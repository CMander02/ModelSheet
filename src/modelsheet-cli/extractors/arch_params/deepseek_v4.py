"""Parameter calculator for deepseek_v4 architecture.

Reference: DeepSeek-V4 Technical Report (2026-04-24)
  - V4-Pro:  total=1.6T, active=49B
  - V4-Flash: total=284B, active=13B

Architecture components beyond standard MoE:
  - MLA (Multi-head Latent Attention): compressed KV projection
  - mHC (Manifold-Constrained Hyper-Connections): hc_mult residual streams
    → stored as weights but NOT counted in "active" by DeepSeek convention
  - CSA/HCA hybrid attention: compress_ratios per layer
  - Hash-routed layers: first num_hash_layers use hash routing
    → same TopK activation count as standard layers (6 per token)
  - MTP (Multi-Token Prediction): num_nextn_predict_layers dense blocks

Parameter conventions (from official release):
  - total  = all stored weights including all experts + mHC + MTP
  - active = embedding + attention_all_layers + (n_shared + n_per_tok) * expert_FFN * L
             (mHC is NOT included in active by DeepSeek convention)
"""

from typing import Optional, Tuple
from .base import ArchParamCalculator


class DeepSeekV4Params(ArchParamCalculator):
    """Parameter calculator for deepseek_v4."""

    def calc(self) -> Tuple[Optional[int], Optional[int]]:
        cfg = self.cfg
        h = self.h()
        L = self.L()
        v = self.vocab()

        n_routed  = cfg.get("n_routed_experts", 0)
        n_shared  = cfg.get("n_shared_experts", 0)
        n_per_tok = cfg.get("num_experts_per_tok", 6)
        moe_i     = cfg.get("moe_intermediate_size", 0)

        if not all([h, L, v, n_routed, moe_i]):
            return None, None

        # ── Embedding ──────────────────────────────────────────────────────
        emb = self.embedding()  # v * h

        # ── Attention per layer (MLA) ──────────────────────────────────────
        # MLA: W_DQ + W_UQ + W_DKV + W_UKV + W_O
        # kv_lora_rank is not always in config; estimate from q_lora_rank ratio
        q_lora_rank = cfg.get("q_lora_rank", 0)
        kv_lora_rank = cfg.get("kv_lora_rank", 0)
        n_heads = cfg.get("num_attention_heads", 128)
        qk_rope_dim = cfg.get("qk_rope_head_dim", 64)
        qk_nope_dim = cfg.get("qk_nope_head_dim", 128)
        v_head_dim  = cfg.get("v_head_dim", 128)
        head_dim = qk_rope_dim + qk_nope_dim

        if q_lora_rank and kv_lora_rank:
            attn_per_layer = (
                h * q_lora_rank                                    # W_DQ
                + q_lora_rank * n_heads * head_dim                 # W_UQ
                + h * kv_lora_rank                                 # W_DKV
                + kv_lora_rank * n_heads * (head_dim + v_head_dim) # W_UKV
                + n_heads * v_head_dim * h                         # W_O
            )
        elif q_lora_rank:
            # kv_lora_rank absent: estimate as q_lora_rank / 4 (typical ratio)
            kv_est = q_lora_rank // 4
            attn_per_layer = (
                h * q_lora_rank
                + q_lora_rank * n_heads * head_dim
                + h * kv_est
                + kv_est * n_heads * (head_dim + v_head_dim)
                + n_heads * v_head_dim * h
            )
        else:
            attn_per_layer = 4 * h * h  # fallback

        attn_total = L * attn_per_layer
        # Attention is always fully active
        attn_active = attn_total

        # ── Expert FFN (SwiGLU: gate + up + down) ─────────────────────────
        params_per_expert = 3 * h * moe_i

        # Total: all experts in every layer are stored
        total_routed = L * n_routed * params_per_expert
        total_shared = L * n_shared * params_per_expert

        # Active: per token, only (n_shared + n_per_tok) experts run per layer.
        # Hash-routed layers still activate the same TopK count (n_per_tok),
        # NOT all experts — hash routing selects n_per_tok experts deterministically.
        active_routed = L * n_per_tok * params_per_expert
        active_shared = L * n_shared * params_per_expert

        # ── mHC (Hyper-Connections) ────────────────────────────────────────
        # hc_mult extra residual streams of size h merged per layer.
        # Approximated as hc_mult mixing matrices of shape (hc_mult, hc_mult) per layer,
        # scaled by h. Exact shape depends on implementation.
        hc_mult = cfg.get("hc_mult", 1)
        if hc_mult > 1:
            # Conservative estimate: per-layer mixing weight is hc_mult × h
            mhc_total = L * hc_mult * h
        else:
            mhc_total = 0
        # mHC is NOT counted in active parameters per DeepSeek convention

        # ── MTP (Multi-Token Prediction) ──────────────────────────────────
        n_mtp = cfg.get("num_nextn_predict_layers", 0)
        if n_mtp:
            # Each MTP block: small attention (~4h²) + shared-expert FFN
            mtp_attn = n_mtp * 4 * h * h
            mtp_ffn  = n_mtp * n_shared * params_per_expert
            mtp_total  = mtp_attn + mtp_ffn
            mtp_active = mtp_total
        else:
            mtp_total = mtp_active = 0

        # ── Assemble ───────────────────────────────────────────────────────
        total = emb + attn_total + total_routed + total_shared + mhc_total + mtp_total
        active = emb + attn_active + active_routed + active_shared + mtp_active

        return total, active
