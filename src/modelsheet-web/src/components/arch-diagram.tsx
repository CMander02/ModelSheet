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

// ─── LLaMA ────────────────────────────────────────────────────────────────────
// Pre-Norm RMSNorm, GQA, SwiGLU, RoPE, no bias. Backbone of LLaMA 2/3/3.x.
// Source: transformers/models/llama/modeling_llama.py

function llamaDef({ numLayers = 32, numHeads = 32, numKvHeads = 8, hiddenSize = 4096 }: DiagramParams) {
  const gqaNote = numHeads && numKvHeads ? `  Q:${numHeads} KV:${numKvHeads}` : ""
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["LLaMA 2 / 3"]
      emb["Token Embedding  no learned pos emb  RoPE in attn"]:::emb

      subgraph block["Decoder Block ×${numLayers}"]
        ln1["RMSNorm  pre-norm  input_layernorm"]:::norm
        attn["GQA${gqaNote}  RoPE  no bias"]:::attn
        plus1(("+")):::resid
        ln2["RMSNorm  pre-norm  post_attention_layernorm"]:::norm
        ffn["SwiGLU FFN  gate_proj · up_proj → SiLU → down_proj"]:::ffn
        plus2(("+")):::resid
      end

      lnf["Final RMSNorm"]:::norm
      lmh["LM Head  no weight tying in LLaMA 3"]:::out
    end

    input --> emb --> ln1 --> attn --> plus1 --> ln2 --> ffn --> plus2 --> lnf --> lmh
    emb -.->|residual| plus1
    plus1 -.->|residual| plus2
    note_h["hidden: ${hiddenSize.toLocaleString()}  ·  rope_theta: 500000  Llama-3"]:::resid
${BASE_STYLES}`
}

export function LlamaDiagram(p: DiagramParams) { return <MermaidDiagram definition={llamaDef(p)} /> }

// ─── LLaMA 4 ─────────────────────────────────────────────────────────────────
// Interleaved attention (full NoPE + sliding iRoPE), MoE with no shared experts
// Source: transformers/models/llama4/modeling_llama4.py

function llama4Def({ numLayers = 48, numExperts = 128, numExpertsPerToken = 1 }: DiagramParams) {
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["LLaMA 4"]
      emb["Token Embedding"]:::emb
      note_layers["Layers alternate: full-attn every 4th, chunk-attn others"]:::resid

      subgraph block["Decoder Block ×${numLayers}"]
        ln1["RMSNorm  pre-norm"]:::norm
        attn["Attention  NoPE or iRoPE  interleaved per layer"]:::attn
        plus1(("+")):::resid
        ln2["RMSNorm  pre-norm"]:::norm

        subgraph moe["MoE  top-${numExpertsPerToken} of ${numExperts}  no shared expert"]
          router2["Router  sigmoid  no aux loss"]:::moe
          experts2["Expert FFN  SwiGLU  ×${numExpertsPerToken}"]:::moe
        end

        plus2(("+")):::resid
      end

      lnf["Final RMSNorm"]:::norm
      lmh["LM Head"]:::out
    end

    input --> emb --> ln1 --> attn --> plus1 --> ln2 --> router2 --> experts2 --> plus2 --> lnf --> lmh
    emb -.->|residual| plus1
    plus1 -.->|residual| plus2
${BASE_STYLES}`
}

export function Llama4Diagram(p: DiagramParams) { return <MermaidDiagram definition={llama4Def(p)} /> }

// ─── DeepSeek (dense / v1) ────────────────────────────────────────────────────
// Standard decoder with MHA, SwiGLU, RMSNorm pre-norm, RoPE, no bias.
// Source: transformers/models/deepseek/modeling_deepseek.py

function deepseekDenseDef({ numLayers = 30, numHeads = 32, numKvHeads = 32, hiddenSize = 4096 }: DiagramParams) {
  const gqaNote = numKvHeads && numKvHeads !== numHeads ? `  GQA Q:${numHeads} KV:${numKvHeads}` : `  MHA heads:${numHeads}`
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["DeepSeek (dense)"]
      emb["Token Embedding"]:::emb

      subgraph block["Decoder Block ×${numLayers}"]
        ln1["RMSNorm  pre-norm  input_layernorm"]:::norm
        attn["Attention${gqaNote}  RoPE  no bias"]:::attn
        plus1(("+")):::resid
        ln2["RMSNorm  pre-norm  post_attention_layernorm"]:::norm
        ffn["SwiGLU FFN  gate_proj · up_proj → SiLU → down_proj"]:::ffn
        plus2(("+")):::resid
      end

      lnf["Final RMSNorm"]:::norm
      lmh["LM Head"]:::out
    end

    input --> emb --> ln1 --> attn --> plus1 --> ln2 --> ffn --> plus2 --> lnf --> lmh
    emb -.->|residual| plus1
    plus1 -.->|residual| plus2
    note_h["hidden: ${hiddenSize.toLocaleString()}"]:::resid
${BASE_STYLES}`
}

export function DeepseekDenseDiagram(p: DiagramParams) { return <MermaidDiagram definition={deepseekDenseDef(p)} /> }

// ─── GLM / ChatGLM ────────────────────────────────────────────────────────────
// Bidirectional prefix + causal attention, 2D RoPE, Post-Norm (GLM1/2).
// GLM4 uses Pre-Norm RMSNorm + GQA. Source: transformers/models/glm/modeling_glm.py

function glm4Def({ numLayers = 40, numHeads = 32, numKvHeads = 2, hiddenSize = 4096 }: DiagramParams) {
  const gqaNote = numHeads && numKvHeads ? `  Q:${numHeads} KV:${numKvHeads}` : ""
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["GLM4 / ChatGLM4"]
      emb["Token Embedding  no learned pos emb"]:::emb

      subgraph block["Decoder Block ×${numLayers}"]
        ln1["RMSNorm  pre-norm  input_layernorm"]:::norm
        attn["GQA${gqaNote}  RoPE-2D  QKV fused"]:::attn
        plus1(("+")):::resid
        ln2["RMSNorm  pre-norm  post_attention_layernorm"]:::norm
        ffn["SwiGLU FFN  gate · up → SiLU → down"]:::ffn
        plus2(("+")):::resid
      end

      lnf["Final RMSNorm  encoder.final_layernorm"]:::norm
      lmh["LM Head  tied to token emb"]:::out
    end

    input --> emb --> ln1 --> attn --> plus1 --> ln2 --> ffn --> plus2 --> lnf --> lmh
    emb -.->|residual| plus1
    plus1 -.->|residual| plus2
    note_h["hidden: ${hiddenSize.toLocaleString()}  ·  rope_ratio: 500"]:::resid
${BASE_STYLES}`
}

export function Glm4Diagram(p: DiagramParams) { return <MermaidDiagram definition={glm4Def(p)} /> }

// ─── Kimi (Moonshot) ─────────────────────────────────────────────────────────
// MoE variant (kimi_k2): MLA-like KV compression + MoE routing (sigmoid, no aux loss).
// Dense variant (kimi_linear): standard GQA decoder with linear attention hybrid.
// Source: transformers/models/kimi_k2 / config.json from moonshotai/Kimi-K2-Instruct

function kimiK2Def({ numLayers = 61, numExperts = 384, numSharedExperts = 1, numExpertsPerToken = 8 }: DiagramParams) {
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["Kimi K2"]
      emb["Token Embedding"]:::emb
      note_dense["First 3 layers: Dense FFN"]:::resid

      subgraph block["MoE Decoder Block ×${numLayers - 3}"]
        ln1["RMSNorm  pre-norm"]:::norm

        subgraph mla["MLA-style Attention  (latent KV compression)"]
          q_lora["Q: down_proj → RMSNorm → up_proj"]:::attn
          kv_lora["KV: kv_a_proj → RMSNorm → kv_b_proj"]:::attn
          rope_k["Decoupled RoPE  q_rope / k_rope only"]:::norm
          sdpa["Scaled Dot-Product Attention"]:::attn
          oproj["o_proj"]:::attn
        end

        plus1(("+")):::resid
        ln2["RMSNorm  pre-norm"]:::norm

        subgraph moe_blk["MoE  sigmoid routing  top-${numExpertsPerToken} of ${numExperts}"]
          router["Router  sigmoid + correction_bias  no aux loss"]:::moe
          experts["Routed FFN Experts  ×${numExpertsPerToken}  SwiGLU"]:::moe
          shared["Shared Expert  ×${numSharedExperts}  always active"]:::moe
          moe_sum(("+")):::resid
        end

        plus2(("+")):::resid
      end

      lnf["Final RMSNorm"]:::norm
      lmh["LM Head"]:::out
    end

    input --> emb --> ln1
    ln1 --> q_lora & kv_lora
    q_lora & kv_lora --> rope_k --> sdpa --> oproj --> plus1
    emb -.->|residual| plus1
    plus1 --> ln2 --> router
    router --> experts --> moe_sum
    ln2 --> shared --> moe_sum
    moe_sum --> plus2
    plus1 -.->|residual| plus2
    plus2 --> lnf --> lmh
${BASE_STYLES}`
}

export function KimiK2Diagram(p: DiagramParams) { return <MermaidDiagram definition={kimiK2Def(p)} /> }

// ─── Placeholder ─────────────────────────────────────────────────────────────

export function PlaceholderDiagram(_p: DiagramParams) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground h-full min-h-[200px]">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 17.5h7M17.5 14v7" />
      </svg>
      <span className="text-xs font-medium opacity-50">Coming Soon</span>
    </div>
  )
}

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
  /** HuggingFace model_type values that map to this arch entry */
  modelTypeAliases?: string[]
  /** If true, renders a placeholder card (no diagram) */
  placeholder?: boolean
}

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
    diagram: PlaceholderDiagram,
    modelTypeAliases: ["mistral", "mistral3", "mixtral"],
    placeholder: true,
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
    diagram: PlaceholderDiagram,
    modelTypeAliases: ["gemma", "gemma2", "gemma3", "gemma3_text", "gemma3n"],
    placeholder: true,
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
    diagram: PlaceholderDiagram,
    modelTypeAliases: ["internlm", "internlm2", "internlm3"],
    placeholder: true,
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
    diagram: PlaceholderDiagram,
    modelTypeAliases: ["phi", "phi3", "phi3_v", "phi3small", "phi4mm", "phimoe"],
    placeholder: true,
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
    diagram: PlaceholderDiagram,
    modelTypeAliases: ["falcon", "falcon_h1", "falcon_mamba"],
    placeholder: true,
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
    diagram: PlaceholderDiagram,
    modelTypeAliases: ["mamba", "mamba2", "falcon_mamba"],
    placeholder: true,
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
    diagram: PlaceholderDiagram,
    modelTypeAliases: ["olmo", "olmo2", "olmo3", "olmoe"],
    placeholder: true,
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
    diagram: PlaceholderDiagram,
    modelTypeAliases: ["bloom"],
    placeholder: true,
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
    diagram: PlaceholderDiagram,
    modelTypeAliases: ["t5", "longt5"],
    placeholder: true,
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
    diagram: PlaceholderDiagram,
    modelTypeAliases: ["baichuan", "baichuan_m1"],
    placeholder: true,
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
    diagram: PlaceholderDiagram,
    modelTypeAliases: ["exaone", "exaone4"],
    placeholder: true,
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
    diagram: PlaceholderDiagram,
    modelTypeAliases: ["granite", "granitemoe", "granitemoehybrid"],
    placeholder: true,
  },
]

export const TYPE_COLORS: Record<string, string> = {
  encoder:           "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  decoder:           "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  "encoder-decoder": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
}
