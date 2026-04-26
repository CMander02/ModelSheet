/**
 * Architecture diagram registry.
 * Each diagram component is lazily loaded as a separate Vite chunk.
 */

import React from "react"

export type { DiagramParams } from "./arch-diagrams/shared"
export { BASE_STYLES } from "./arch-diagrams/shared"

// ─── Lazy-loaded diagram components — each is a separate Vite chunk ───────────

const BertDiagram        = React.lazy(() => import("./arch-diagrams/bert"))
const Gpt2Diagram        = React.lazy(() => import("./arch-diagrams/gpt2"))
const LlamaDiagram       = React.lazy(() => import("./arch-diagrams/llama"))
const Llama4Diagram      = React.lazy(() => import("./arch-diagrams/llama4"))
const DeepseekDenseDiagram = React.lazy(() => import("./arch-diagrams/deepseek-dense"))
const DeepseekV2Diagram  = React.lazy(() => import("./arch-diagrams/deepseek-v2"))
const DeepseekV3Diagram  = React.lazy(() => import("./arch-diagrams/deepseek-v3"))
const Glm4Diagram        = React.lazy(() => import("./arch-diagrams/glm4"))
const KimiK2Diagram      = React.lazy(() => import("./arch-diagrams/kimi-k2"))
const Qwen1Diagram       = React.lazy(() => import("./arch-diagrams/qwen1"))
const Qwen2Diagram       = React.lazy(() => import("./arch-diagrams/qwen2"))
const Qwen3Diagram       = React.lazy(() => import("./arch-diagrams/qwen3"))
const MistralDiagram     = React.lazy(() => import("./arch-diagrams/mistral"))
const GemmaDiagram       = React.lazy(() => import("./arch-diagrams/gemma"))
const InternlmDiagram    = React.lazy(() => import("./arch-diagrams/internlm"))
const PhiDiagram         = React.lazy(() => import("./arch-diagrams/phi"))
const FalconDiagram      = React.lazy(() => import("./arch-diagrams/falcon"))
const MambaDiagram       = React.lazy(() => import("./arch-diagrams/mamba"))
const OlmoDiagram        = React.lazy(() => import("./arch-diagrams/olmo"))
const BloomDiagram       = React.lazy(() => import("./arch-diagrams/bloom"))
const T5Diagram          = React.lazy(() => import("./arch-diagrams/t5"))
const BaichuanDiagram    = React.lazy(() => import("./arch-diagrams/baichuan"))
const ExaoneDiagram      = React.lazy(() => import("./arch-diagrams/exaone"))
const GraniteDiagram     = React.lazy(() => import("./arch-diagrams/granite"))
const PlaceholderDiagram = React.lazy(() => import("./arch-diagrams/placeholder"))

// ─── Types ────────────────────────────────────────────────────────────────────

import type { DiagramParams } from "./arch-diagrams/shared"

export interface ArchSpec {
  id: string
  family: string
  era: string
  type: "encoder" | "decoder" | "encoder-decoder"
  normPlacement: "pre" | "post"
  descriptionZh: string
  descriptionEn: string
  paperUrl?: string
  hfOrg?: string
  defaultParams: DiagramParams
  diagram: React.LazyExoticComponent<React.ComponentType<DiagramParams>>
  /** HuggingFace model_type values that map to this arch entry */
  modelTypeAliases?: string[]
  /** If true, renders a placeholder card (no diagram) */
  placeholder?: boolean
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const ARCH_REGISTRY: ArchSpec[] = [
  // ── Implemented ────────────────────────────────────────────────────────────
  {
    id: "bert",
    family: "BERT",
    era: "2018",
    type: "encoder",
    normPlacement: "post",
    descriptionZh: "双向编码器，Post-Norm。掩码语言模型预训练，Token-Type Embedding 支持句对任务。",
    descriptionEn: "Bidirectional encoder with post-norm. Masked LM pre-training. Token-type embeddings for sentence-pair tasks.",
    paperUrl: "https://arxiv.org/abs/1810.04805",
    hfOrg: "google-bert/bert-base-uncased",
    defaultParams: { numLayers: 12, numHeads: 12, hiddenSize: 768 },
    diagram: BertDiagram,
    modelTypeAliases: ["bert"],
  },
  {
    id: "gpt2",
    family: "GPT-2",
    era: "2019",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "仅解码器因果语言模型，Pre-Norm。融合 QKV（Conv1D），全部 Block 后接最终 LayerNorm，LM Head 权重与 Token Embedding 绑定。",
    descriptionEn: "Decoder-only causal LM. Pre-norm. Fused QKV via Conv1D. Final LayerNorm after all blocks. LM head weight-tied to token embedding.",
    paperUrl: "https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf",
    hfOrg: "openai-community/gpt2",
    defaultParams: { numLayers: 12, numHeads: 12, hiddenSize: 768, vocabSize: 50257 },
    diagram: Gpt2Diagram,
    modelTypeAliases: ["gpt2"],
  },
  {
    id: "llama",
    family: "LLaMA 2 / 3",
    era: "2023",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "Pre-Norm RMSNorm，GQA（LLaMA 3 引入），SwiGLU FFN，RoPE，无 bias。LLaMA 3 使用 rope_theta=500000 并增大 vocab。LM Head 在 LLaMA 3 不绑定权重。",
    descriptionEn: "Pre-Norm RMSNorm, GQA (introduced in LLaMA 3), SwiGLU FFN, RoPE, no bias. LLaMA 3 uses rope_theta=500000 and larger vocab. LM head not weight-tied in LLaMA 3.",
    paperUrl: "https://arxiv.org/abs/2302.13971",
    hfOrg: "meta-llama/Meta-Llama-3-8B",
    defaultParams: { numLayers: 32, numHeads: 32, numKvHeads: 8, hiddenSize: 4096 },
    diagram: LlamaDiagram,
    modelTypeAliases: ["llama"],
  },
  {
    id: "llama4",
    family: "LLaMA 4",
    era: "2025",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "交替使用全注意力（NoPE）和块内滑动注意力（iRoPE），MoE 无共享专家，sigmoid 路由无辅助损失。",
    descriptionEn: "Alternates full attention (NoPE) and chunked sliding-window attention (iRoPE). MoE with no shared experts, sigmoid routing without auxiliary loss.",
    paperUrl: "https://arxiv.org/abs/2504.05423",
    hfOrg: "meta-llama/Llama-4-Scout-17B-16E",
    defaultParams: { numLayers: 48, numExperts: 128, numExpertsPerToken: 1 },
    diagram: Llama4Diagram,
    modelTypeAliases: ["llama4"],
  },
  {
    id: "deepseek-dense",
    family: "DeepSeek (dense)",
    era: "2024",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "标准 Pre-Norm 解码器，MHA 或 GQA，SwiGLU FFN，RMSNorm，RoPE，无 bias。DeepSeek-V1 / Coder 系列的密集基座。",
    descriptionEn: "Standard pre-norm decoder with MHA or GQA, SwiGLU FFN, RMSNorm, RoPE, no bias. Dense backbone used in DeepSeek-V1 and Coder series.",
    paperUrl: "https://arxiv.org/abs/2401.02954",
    hfOrg: "deepseek-ai/deepseek-llm-7b-base",
    defaultParams: { numLayers: 30, numHeads: 32, numKvHeads: 32, hiddenSize: 4096 },
    diagram: DeepseekDenseDiagram,
    modelTypeAliases: ["deepseek"],
  },
  {
    id: "deepseek-v2",
    family: "DeepSeek-V2",
    era: "2024",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "引入 MLA（多头潜注意力）压缩 KV Cache，解耦 RoPE 仅作用于小维度子集。MoE 采用 softmax 路由 + 共享专家（始终激活）。",
    descriptionEn: "Introduces MLA (Multi-head Latent Attention) for KV cache compression with decoupled RoPE. MoE with softmax routing and always-active shared experts.",
    paperUrl: "https://arxiv.org/abs/2405.04434",
    hfOrg: "deepseek-ai/DeepSeek-V2",
    defaultParams: { numLayers: 60, numExperts: 160, numSharedExperts: 2, numExpertsPerToken: 6 },
    diagram: DeepseekV2Diagram,
    modelTypeAliases: ["deepseek_v2"],
  },
  {
    id: "deepseek-v3",
    family: "DeepSeek-V3 / R1",
    era: "2024",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "继承 MLA，升级 MoE 路由为 sigmoid + 可学习偏置（无辅助损失负载均衡），RoPE 采用 YaRN 缩放，前 3 层为 Dense 层。",
    descriptionEn: "Inherits MLA. Upgrades MoE routing to sigmoid + learnable e_score_correction_bias for aux-loss-free load balancing. YaRN RoPE. First 3 layers are dense.",
    paperUrl: "https://arxiv.org/abs/2412.19437",
    hfOrg: "deepseek-ai/DeepSeek-V3",
    defaultParams: { numLayers: 61, numExperts: 256, numSharedExperts: 1, numExpertsPerToken: 8 },
    diagram: DeepseekV3Diagram,
    modelTypeAliases: ["deepseek_v3", "deepseek_v32", "deepseek_v4"],
  },
  {
    id: "glm4",
    family: "GLM4 / ChatGLM4",
    era: "2024",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "Pre-Norm RMSNorm，GQA，SwiGLU FFN，2D RoPE（position_ids 对前缀/生成分段编码），LM Head 权重绑定。",
    descriptionEn: "Pre-Norm RMSNorm, GQA, SwiGLU FFN, 2D RoPE encoding prefix vs generated positions separately. LM head weight-tied to embedding.",
    paperUrl: "https://arxiv.org/abs/2406.12793",
    hfOrg: "THUDM/glm-4-9b",
    defaultParams: { numLayers: 40, numHeads: 32, numKvHeads: 2, hiddenSize: 4096 },
    diagram: Glm4Diagram,
    modelTypeAliases: ["glm4", "glm", "chatglm", "glm4_moe", "glm4v", "glm4v_moe", "glm_moe_dsa"],
  },
  {
    id: "kimi-k2",
    family: "Kimi K2",
    era: "2025",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "MLA 风格 KV 压缩（低秩 down/up proj + RMSNorm），解耦 RoPE，大规模 MoE（384 专家，top-8），sigmoid 路由无辅助损失，前 3 层为 Dense 层。",
    descriptionEn: "MLA-style low-rank KV compression (down_proj→RMSNorm→up_proj), decoupled RoPE. Large MoE (384 experts, top-8), sigmoid routing without auxiliary loss. First 3 layers dense.",
    paperUrl: "https://arxiv.org/abs/2505.11143",
    hfOrg: "moonshotai/Kimi-K2-Instruct",
    defaultParams: { numLayers: 61, numExperts: 384, numSharedExperts: 1, numExpertsPerToken: 8 },
    diagram: KimiK2Diagram,
    modelTypeAliases: ["kimi_k2", "kimi_k25", "kimi_vl", "kimi_linear"],
  },
  {
    id: "qwen1",
    family: "Qwen1",
    era: "2023",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "MHA（无 GQA），SwiGLU FFN，RMSNorm Pre-Norm，RoPE + LogN 缩放 + 动态 NTK，QKV 带 bias。",
    descriptionEn: "MHA (no GQA), SwiGLU FFN, RMSNorm pre-norm. RoPE with optional LogN scaling and dynamic NTK interpolation. QKV projections have bias.",
    paperUrl: "https://arxiv.org/abs/2309.16609",
    hfOrg: "Qwen/Qwen-7B",
    defaultParams: { numLayers: 32, numHeads: 32, hiddenSize: 4096 },
    diagram: Qwen1Diagram,
    modelTypeAliases: ["qwen"],
  },
  {
    id: "qwen2",
    family: "Qwen2 / Qwen2.5",
    era: "2024",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "引入 GQA（KV 头数减少），去除 LogN/动态 NTK，部分层支持 Sliding Window Attention。SwiGLU FFN，QKV 带 bias。",
    descriptionEn: "Introduces GQA (fewer KV heads), removes LogN/NTK tricks, optional per-layer sliding window attention. SwiGLU FFN, QKV with bias.",
    paperUrl: "https://arxiv.org/abs/2407.10671",
    hfOrg: "Qwen/Qwen2.5-7B",
    defaultParams: { numLayers: 28, numHeads: 28, numKvHeads: 4, hiddenSize: 3584 },
    diagram: Qwen2Diagram,
    modelTypeAliases: ["qwen2", "qwen2_5_omni", "qwen2_5_vl", "qwen2_moe", "qwen2_vl"],
  },
  {
    id: "qwen3",
    family: "Qwen3",
    era: "2025",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "在 Qwen2 基础上增加 per-head QK-RMSNorm（在 RoPE 之前对每个头的 Q/K 做归一化），稳定大模型的注意力尺度。",
    descriptionEn: "Adds per-head QK-RMSNorm on Q and K before RoPE. Stabilizes attention scale at large model sizes. Otherwise identical to Qwen2.",
    paperUrl: "https://arxiv.org/abs/2505.09388",
    hfOrg: "Qwen/Qwen3-8B",
    defaultParams: { numLayers: 36, numHeads: 32, numKvHeads: 8, hiddenSize: 4096 },
    diagram: Qwen3Diagram,
    modelTypeAliases: ["qwen3", "qwen3_5", "qwen3_5_moe", "qwen3_moe", "qwen3_next", "qwen3_omni_moe", "qwen3_vl", "qwen3_vl_moe"],
  },

  // ── Placeholders ───────────────────────────────────────────────────────────
  {
    id: "mistral",
    family: "Mistral / Mixtral",
    era: "2023",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "滑动窗口注意力（SWA）+ GQA，SwiGLU FFN，RMSNorm Pre-Norm，RoPE，无 bias。Mixtral 为 MoE 变体（top-2 of 8）。",
    descriptionEn: "Sliding window attention (SWA) + GQA, SwiGLU FFN, RMSNorm pre-norm, RoPE, no bias. Mixtral is the MoE variant (top-2 of 8 experts).",
    paperUrl: "https://arxiv.org/abs/2310.06825",
    hfOrg: "mistralai/Mistral-7B-v0.3",
    defaultParams: { numLayers: 32, numHeads: 32, numKvHeads: 8, hiddenSize: 4096 },
    diagram: MistralDiagram,
    modelTypeAliases: ["mistral", "mistral3", "mixtral"],
  },
  {
    id: "gemma",
    family: "Gemma / Gemma 2",
    era: "2024",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "Pre-Norm + Post-Norm 双归一化（Gemma 2），GQA，GeGLU FFN（gelu_pytorch_tanh），Logit Soft-Capping，RoPE，无 bias。",
    descriptionEn: "Pre+post norm (Gemma 2), GQA, GeGLU FFN (gelu_pytorch_tanh), logit soft-capping, RoPE, no bias.",
    paperUrl: "https://arxiv.org/abs/2408.00118",
    hfOrg: "google/gemma-2-9b",
    defaultParams: { numLayers: 42, numHeads: 16, numKvHeads: 8, hiddenSize: 3584 },
    diagram: GemmaDiagram,
    modelTypeAliases: ["gemma", "gemma2", "gemma3", "gemma3_text", "gemma3n"],
  },
  {
    id: "internlm",
    family: "InternLM 2 / 3",
    era: "2024",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "GQA，SwiGLU FFN，RMSNorm Pre-Norm，RoPE，QKV 带 bias（InternLM 2）。",
    descriptionEn: "GQA, SwiGLU FFN, RMSNorm pre-norm, RoPE, QKV with bias (InternLM 2).",
    paperUrl: "https://arxiv.org/abs/2403.17297",
    hfOrg: "internlm/internlm2-7b",
    defaultParams: { numLayers: 32, numHeads: 32, numKvHeads: 8, hiddenSize: 4096 },
    diagram: InternlmDiagram,
    modelTypeAliases: ["internlm", "internlm2", "internlm3"],
  },
  {
    id: "phi",
    family: "Phi-3 / Phi-4",
    era: "2024",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "GQA，SwiGLU FFN，RMSNorm Pre-Norm，RoPE，QKV + dense bias。Phi-4 系列支持多模态。",
    descriptionEn: "GQA, SwiGLU FFN, RMSNorm pre-norm, RoPE, QKV with bias. Phi-4 series supports multimodality.",
    paperUrl: "https://arxiv.org/abs/2404.14219",
    hfOrg: "microsoft/Phi-3-mini-4k-instruct",
    defaultParams: { numLayers: 32, numHeads: 32, numKvHeads: 8, hiddenSize: 3072 },
    diagram: PhiDiagram,
    modelTypeAliases: ["phi", "phi3", "phi3_v", "phi3small", "phi4mm", "phimoe"],
  },
  {
    id: "falcon",
    family: "Falcon",
    era: "2023",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "Multi-Query Attention（MQA），平行注意力+FFN（Falcon-40B），LayerNorm Pre-Norm，RoPE，无 bias。",
    descriptionEn: "Multi-Query Attention (MQA), parallel attention+FFN (Falcon-40B), LayerNorm pre-norm, RoPE, no bias.",
    paperUrl: "https://arxiv.org/abs/2311.16867",
    hfOrg: "tiiuae/falcon-7b",
    defaultParams: { numLayers: 32, numHeads: 71, numKvHeads: 1, hiddenSize: 4544 },
    diagram: FalconDiagram,
    modelTypeAliases: ["falcon", "falcon_h1", "falcon_mamba"],
  },
  {
    id: "mamba",
    family: "Mamba / Mamba-2",
    era: "2023",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "状态空间模型（SSM），无 Attention，选择性扫描（S4/S6），线性时间复杂度推理。",
    descriptionEn: "State Space Model (SSM) with no attention. Selective scan (S4/S6). Linear-time inference complexity.",
    paperUrl: "https://arxiv.org/abs/2312.00752",
    hfOrg: "state-spaces/mamba-2.8b",
    defaultParams: { numLayers: 64, hiddenSize: 2560 },
    diagram: MambaDiagram,
    modelTypeAliases: ["mamba", "mamba2", "falcon_mamba"],
  },
  {
    id: "olmo",
    family: "OLMo",
    era: "2024",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "全开源（数据、权重、代码），RMSNorm Pre-Norm，SwiGLU FFN，RoPE，GQA（OLMo 2），无 bias。",
    descriptionEn: "Fully open (data, weights, code). RMSNorm pre-norm, SwiGLU FFN, RoPE, GQA (OLMo 2), no bias.",
    paperUrl: "https://arxiv.org/abs/2402.00838",
    hfOrg: "allenai/OLMo-2-1124-7B",
    defaultParams: { numLayers: 32, numHeads: 32, numKvHeads: 8, hiddenSize: 4096 },
    diagram: OlmoDiagram,
    modelTypeAliases: ["olmo", "olmo2", "olmo3", "olmoe"],
  },
  {
    id: "bloom",
    family: "BLOOM",
    era: "2022",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "ALiBi 位置编码（无 RoPE），Post-Norm + Pre-Norm 混合（Embedding 后 LN），多语言 176B 模型。",
    descriptionEn: "ALiBi positional bias (no RoPE), mixed norm placement (LayerNorm after embedding). Multilingual 176B model.",
    paperUrl: "https://arxiv.org/abs/2211.05100",
    hfOrg: "bigscience/bloom",
    defaultParams: { numLayers: 70, numHeads: 112, hiddenSize: 14336 },
    diagram: BloomDiagram,
    modelTypeAliases: ["bloom"],
  },
  {
    id: "t5",
    family: "T5 / FLAN-T5",
    era: "2020",
    type: "encoder-decoder",
    normPlacement: "pre",
    descriptionZh: "编解码器，Relative Attention Bias（T5 位置编码），RMSNorm Pre-Norm，SwiGLU（T5 v1.1），无 bias。",
    descriptionEn: "Encoder-decoder with relative attention bias (T5 positional encoding), RMSNorm pre-norm, SwiGLU (T5 v1.1), no bias.",
    paperUrl: "https://arxiv.org/abs/1910.10683",
    hfOrg: "google/flan-t5-xl",
    defaultParams: { numLayers: 24, numHeads: 32, hiddenSize: 2048 },
    diagram: T5Diagram,
    modelTypeAliases: ["t5", "longt5"],
  },
  {
    id: "baichuan",
    family: "Baichuan 2",
    era: "2023",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "MHA（7B）或 ALiBi（13B），SwiGLU FFN，RMSNorm Pre-Norm，无 bias。",
    descriptionEn: "MHA with RoPE (7B) or ALiBi (13B), SwiGLU FFN, RMSNorm pre-norm, no bias.",
    paperUrl: "https://arxiv.org/abs/2309.10305",
    hfOrg: "baichuan-inc/Baichuan2-7B-Base",
    defaultParams: { numLayers: 32, numHeads: 32, hiddenSize: 4096 },
    diagram: BaichuanDiagram,
    modelTypeAliases: ["baichuan", "baichuan_m1"],
  },
  {
    id: "exaone",
    family: "EXAONE",
    era: "2024",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "LG 研发，GQA，SwiGLU FFN，RMSNorm Pre-Norm，RoPE，无 bias。",
    descriptionEn: "LG AI Research model. GQA, SwiGLU FFN, RMSNorm pre-norm, RoPE, no bias.",
    paperUrl: "https://arxiv.org/abs/2408.03541",
    hfOrg: "LGAI-EXAONE/EXAONE-3.5-7.8B-Instruct",
    defaultParams: { numLayers: 32, numHeads: 32, numKvHeads: 8, hiddenSize: 4096 },
    diagram: ExaoneDiagram,
    modelTypeAliases: ["exaone", "exaone4"],
  },
  {
    id: "granite",
    family: "Granite / GraniteMoE",
    era: "2024",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "IBM 开源系列，GQA，SwiGLU FFN，RMSNorm Pre-Norm，RoPE，GraniteMoE 为 MoE 变体。",
    descriptionEn: "IBM open-source series. GQA, SwiGLU FFN, RMSNorm pre-norm, RoPE. GraniteMoE is the MoE variant.",
    paperUrl: "https://arxiv.org/abs/2405.04324",
    hfOrg: "ibm-granite/granite-3.3-8b-instruct",
    defaultParams: { numLayers: 40, numHeads: 32, numKvHeads: 8, hiddenSize: 4096 },
    diagram: GraniteDiagram,
    modelTypeAliases: ["granite", "granitemoe", "granitemoehybrid"],
  },
]

export const TYPE_COLORS: Record<string, string> = {
  encoder:           "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  decoder:           "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  "encoder-decoder": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
}

// Re-export PlaceholderDiagram for backward compatibility (if needed)
export { PlaceholderDiagram }
