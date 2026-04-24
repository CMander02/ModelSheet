/**
 * Architecture diagrams using Mermaid flowchart syntax.
 * Structures derived from HuggingFace transformers source code.
 */

import { MermaidDiagram } from "./mermaid-diagram"

export interface DiagramParams {
  numLayers?:        number
  numHeads?:         number
  numKvHeads?:       number
  hiddenSize?:       number
  contextLength?:    number
  vocabSize?:        number
  intermediateSize?: number
  numExperts?:       number
  numSharedExperts?: number
  numExpertsPerToken?: number
}

// ─── Shared style block appended to every diagram ────────────────────────────

const BASE_STYLES = `
    classDef norm    fill:#fef9c3,stroke:#facc15,color:#713f12
    classDef attn    fill:#1e293b,stroke:#334155,color:#f1f5f9
    classDef ffn     fill:#dcfce7,stroke:#4ade80,color:#14532d
    classDef emb     fill:#dbeafe,stroke:#60a5fa,color:#1e3a8a
    classDef out     fill:#fee2e2,stroke:#f87171,color:#7f1d1d
    classDef pool    fill:#fce7f3,stroke:#f0abfc,color:#701a75
    classDef moe     fill:#ede9fe,stroke:#a78bfa,color:#4c1d95
    classDef resid   fill:#fff,stroke:#94a3b8,color:#475569
    classDef input   fill:#f8fafc,stroke:#cbd5e1,color:#64748b`

// ─── GPT-2 ────────────────────────────────────────────────────────────────────

function gpt2Def({ numLayers = 12, numHeads, hiddenSize, vocabSize }: DiagramParams) {
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["GPT-2"]
      tok["Token Embedding"]:::emb
      pos["Positional Embedding (learned)"]:::emb
      drop0["Dropout"]:::resid

      subgraph block["Transformer Block ×${numLayers}"]
        ln1["LayerNorm 1  pre-norm"]:::norm
        attn["Causal Self-Attention  fused QKV"]:::attn
        drop1["Dropout"]:::resid
        plus1(("+")):::resid
        ln2["LayerNorm 2  pre-norm"]:::norm
        ffn["Feed Forward  4× → GELU → proj"]:::ffn
        drop2["Dropout"]:::resid
        plus2(("+")):::resid
      end

      lnf["Final LayerNorm"]:::norm
      lmh["LM Head  tied to token emb${vocabSize ? `  vocab: ${vocabSize.toLocaleString()}` : ""}"]:::out
    end

    input --> tok --> pos --> drop0 --> ln1
    ln1 --> attn --> drop1 --> plus1 --> ln2 --> ffn --> drop2 --> plus2
    drop0 -.->|residual| plus1
    plus1 -.->|residual| plus2
    plus2 --> lnf --> lmh
    ${numHeads   ? `\n    note_h["Heads: ${numHeads}${hiddenSize ? `  ·  hidden: ${hiddenSize.toLocaleString()}` : ""}"]:::resid` : ""}
${BASE_STYLES}`
}

export function Gpt2Diagram(p: DiagramParams) { return <MermaidDiagram definition={gpt2Def(p)} /> }

// ─── BERT ─────────────────────────────────────────────────────────────────────

function bertDef({ numLayers = 12, numHeads, hiddenSize }: DiagramParams) {
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["BERT"]
      emb["Token + Position + Type Embedding"]:::emb
      drop0["Dropout"]:::resid

      subgraph block["Encoder Block ×${numLayers}"]
        attn["Multi-Head Self-Attention  bidirectional"]:::attn
        plus1(("+")):::resid
        ln1["LayerNorm  post-norm"]:::norm
        ffn["Feed Forward  Linear → GELU → Linear"]:::ffn
        plus2(("+")):::resid
        ln2["LayerNorm  post-norm"]:::norm
      end

      pool["[CLS] Pooler  Linear → Tanh"]:::pool
    end

    input --> emb --> drop0 --> attn --> plus1 --> ln1 --> ffn --> plus2 --> ln2 --> pool
    drop0 -.->|residual| plus1
    ln1 -.->|residual| plus2
    ${numHeads ? `\n    note_h["Heads: ${numHeads}${hiddenSize ? `  ·  hidden: ${hiddenSize.toLocaleString()}` : ""}"]:::resid` : ""}
${BASE_STYLES}`
}

export function BertDiagram(p: DiagramParams) { return <MermaidDiagram definition={bertDef(p)} /> }

// ─── Qwen1 ───────────────────────────────────────────────────────────────────
// MHA (no GQA), SwiGLU, RMSNorm pre-norm, RoPE + optional LogN/NTK, QKV bias

function qwen1Def({ numLayers = 32, numHeads, hiddenSize }: DiagramParams) {
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["Qwen1"]
      emb["Token Embedding"]:::emb

      subgraph block["Decoder Block ×${numLayers}"]
        ln1["RMSNorm  pre-norm"]:::norm
        attn["MHA  RoPE + LogN scaling  QKV with bias"]:::attn
        plus1(("+")):::resid
        ln2["RMSNorm  pre-norm"]:::norm
        ffn["SwiGLU FFN  gate · up → SiLU → down"]:::ffn
        plus2(("+")):::resid
      end

      lnf["Final RMSNorm"]:::norm
      lmh["LM Head  tied to token emb"]:::out
    end

    input --> emb --> ln1 --> attn --> plus1 --> ln2 --> ffn --> plus2 --> lnf --> lmh
    emb -.->|residual| plus1
    plus1 -.->|residual| plus2
    ${numHeads ? `\n    note_h["Heads: ${numHeads}${hiddenSize ? `  ·  hidden: ${hiddenSize.toLocaleString()}` : ""}"]:::resid` : ""}
${BASE_STYLES}`
}

export function Qwen1Diagram(p: DiagramParams) { return <MermaidDiagram definition={qwen1Def(p)} /> }

// ─── Qwen2 / Qwen2.5 ─────────────────────────────────────────────────────────
// GQA (fewer KV heads), SwiGLU, RMSNorm pre-norm, clean RoPE, optional sliding window

function qwen2Def({ numLayers = 28, numHeads, numKvHeads, hiddenSize }: DiagramParams) {
  const gqaNote = numHeads && numKvHeads ? `  Q:${numHeads} KV:${numKvHeads}` : ""
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["Qwen2 / Qwen2.5"]
      emb["Token Embedding"]:::emb

      subgraph block["Decoder Block ×${numLayers}"]
        ln1["RMSNorm  pre-norm"]:::norm
        attn["GQA${gqaNote}  RoPE  QKV with bias  optional sliding window"]:::attn
        plus1(("+")):::resid
        ln2["RMSNorm  pre-norm"]:::norm
        ffn["SwiGLU FFN  gate · up → SiLU → down"]:::ffn
        plus2(("+")):::resid
      end

      lnf["Final RMSNorm"]:::norm
      lmh["LM Head  tied to token emb"]:::out
    end

    input --> emb --> ln1 --> attn --> plus1 --> ln2 --> ffn --> plus2 --> lnf --> lmh
    emb -.->|residual| plus1
    plus1 -.->|residual| plus2
    ${hiddenSize ? `\n    note_h["hidden: ${hiddenSize.toLocaleString()}"]:::resid` : ""}
${BASE_STYLES}`
}

export function Qwen2Diagram(p: DiagramParams) { return <MermaidDiagram definition={qwen2Def(p)} /> }

// ─── Qwen3 ────────────────────────────────────────────────────────────────────
// Like Qwen2 but adds per-head QK-RMSNorm before RoPE

function qwen3Def({ numLayers = 28, numHeads, numKvHeads, hiddenSize }: DiagramParams) {
  const gqaNote = numHeads && numKvHeads ? `  Q:${numHeads} KV:${numKvHeads}` : ""
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["Qwen3"]
      emb["Token Embedding"]:::emb

      subgraph block["Decoder Block ×${numLayers}"]
        ln1["RMSNorm  pre-norm"]:::norm
        qproj["Q proj  K proj  V proj  bias=True"]:::attn
        qknorm["QK-RMSNorm  per-head  before RoPE"]:::norm
        attn["GQA${gqaNote}  RoPE  Scaled Dot-Product"]:::attn
        plus1(("+")):::resid
        ln2["RMSNorm  pre-norm"]:::norm
        ffn["SwiGLU FFN  gate · up → SiLU → down"]:::ffn
        plus2(("+")):::resid
      end

      lnf["Final RMSNorm"]:::norm
      lmh["LM Head  tied to token emb"]:::out
    end

    input --> emb --> ln1 --> qproj --> qknorm --> attn --> plus1 --> ln2 --> ffn --> plus2 --> lnf --> lmh
    emb -.->|residual| plus1
    plus1 -.->|residual| plus2
    ${hiddenSize ? `\n    note_h["hidden: ${hiddenSize.toLocaleString()}"]:::resid` : ""}
${BASE_STYLES}`
}

export function Qwen3Diagram(p: DiagramParams) { return <MermaidDiagram definition={qwen3Def(p)} /> }

// ─── DeepSeek-V2 ──────────────────────────────────────────────────────────────
// MLA attention + DeepSeekMoE (softmax routing, shared experts)

function deepseekV2Def({ numLayers = 60, numExperts = 160, numSharedExperts = 2, numExpertsPerToken = 6 }: DiagramParams) {
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["DeepSeek-V2"]
      emb["Token Embedding"]:::emb
      dense_note["First 1 layer: Dense FFN"]:::resid

      subgraph block["MoE Decoder Block ×${numLayers - 1}"]
        ln1["RMSNorm  pre-norm"]:::norm

        subgraph mla["MLA — Multi-head Latent Attention"]
          q_path["Q: proj → RMSNorm → proj → split nope/rope"]:::attn
          kv_path["KV: proj → split  →  RMSNorm → proj  k/v nope"]:::attn
          rope["Decoupled RoPE  on rope dims only"]:::norm
          sdpa["Scaled Dot-Product Attention"]:::attn
          oproj["o_proj"]:::attn
        end

        plus1(("+")):::resid
        ln2["RMSNorm  pre-norm"]:::norm

        subgraph moe["DeepSeekMoE  softmax routing"]
          router["Router  top-${numExpertsPerToken} of ${numExperts}  group-limited"]:::moe
          experts["Routed Experts  ×${numExpertsPerToken}  SwiGLU"]:::moe
          shared["Shared Experts  ×${numSharedExperts}  always active"]:::moe
          moe_add(("+")):::resid
        end

        plus2(("+")):::resid
      end

      lnf["Final RMSNorm"]:::norm
      lmh["LM Head"]:::out
    end

    input --> emb --> ln1
    ln1 --> q_path & kv_path
    q_path & kv_path --> rope --> sdpa --> oproj --> plus1
    emb -.->|residual| plus1
    plus1 --> ln2 --> router
    router --> experts --> moe_add
    ln2 --> shared --> moe_add
    moe_add --> plus2
    plus1 -.->|residual| plus2
    plus2 --> lnf --> lmh
${BASE_STYLES}`
}

export function DeepseekV2Diagram(p: DiagramParams) { return <MermaidDiagram definition={deepseekV2Def(p)} /> }

// ─── DeepSeek-V3 ──────────────────────────────────────────────────────────────
// Same MLA + upgraded MoE routing (sigmoid + aux-loss-free bias)

function deepseekV3Def({ numLayers = 61, numExperts = 256, numSharedExperts = 1, numExpertsPerToken = 8 }: DiagramParams) {
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["DeepSeek-V3"]
      emb["Token Embedding"]:::emb
      dense_note["First 3 layers: Dense FFN"]:::resid

      subgraph block["MoE Decoder Block ×${numLayers - 3}"]
        ln1["RMSNorm  pre-norm"]:::norm

        subgraph mla["MLA — Multi-head Latent Attention"]
          q_path["Q: proj → RMSNorm → proj → split nope/rope"]:::attn
          kv_path["KV: proj → split  →  RMSNorm → proj  k/v nope"]:::attn
          rope["Decoupled RoPE + YaRN scaling"]:::norm
          sdpa["Scaled Dot-Product Attention"]:::attn
          oproj["o_proj"]:::attn
        end

        plus1(("+")):::resid
        ln2["RMSNorm  pre-norm"]:::norm

        subgraph moe["DeepSeekMoE  aux-loss-free routing"]
          router["Router  sigmoid + e_score_bias  top-${numExpertsPerToken} of ${numExperts}"]:::moe
          experts["Routed Experts  ×${numExpertsPerToken}  SwiGLU"]:::moe
          shared["Shared Expert  ×${numSharedExperts}  always active"]:::moe
          moe_add(("+")):::resid
        end

        plus2(("+")):::resid
      end

      lnf["Final RMSNorm"]:::norm
      lmh["LM Head"]:::out
    end

    input --> emb --> ln1
    ln1 --> q_path & kv_path
    q_path & kv_path --> rope --> sdpa --> oproj --> plus1
    emb -.->|residual| plus1
    plus1 --> ln2 --> router
    router --> experts --> moe_add
    ln2 --> shared --> moe_add
    moe_add --> plus2
    plus1 -.->|residual| plus2
    plus2 --> lnf --> lmh
${BASE_STYLES}`
}

export function DeepseekV3Diagram(p: DiagramParams) { return <MermaidDiagram definition={deepseekV3Def(p)} /> }

// ─── Registry ─────────────────────────────────────────────────────────────────

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
  diagram: React.ComponentType<DiagramParams>
}

export const ARCH_REGISTRY: ArchSpec[] = [
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
  },
  {
    id: "deepseek-v3",
    family: "DeepSeek-V3",
    era: "2024",
    type: "decoder",
    normPlacement: "pre",
    descriptionZh: "继承 MLA，升级 MoE 路由为 sigmoid + 可学习偏置（无辅助损失负载均衡），RoPE 采用 YaRN 缩放，前 3 层为 Dense 层。",
    descriptionEn: "Inherits MLA. Upgrades MoE routing to sigmoid + learnable e_score_correction_bias for aux-loss-free load balancing. YaRN RoPE. First 3 layers are dense.",
    paperUrl: "https://arxiv.org/abs/2412.19437",
    hfOrg: "deepseek-ai/DeepSeek-V3",
    defaultParams: { numLayers: 61, numExperts: 256, numSharedExperts: 1, numExpertsPerToken: 8 },
    diagram: DeepseekV3Diagram,
  },
]

export const TYPE_COLORS: Record<string, string> = {
  encoder:           "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  decoder:           "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  "encoder-decoder": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
}
