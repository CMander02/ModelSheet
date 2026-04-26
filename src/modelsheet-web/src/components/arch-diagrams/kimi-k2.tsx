import { MermaidDiagram } from "../mermaid-diagram"
import { BASE_STYLES, type DiagramParams } from "./shared"

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

export default function KimiK2Diagram(p: DiagramParams) {
  return <MermaidDiagram definition={kimiK2Def(p)} fit={p.fit} />
}
