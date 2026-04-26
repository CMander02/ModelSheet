import { MermaidDiagram } from "../mermaid-diagram"
import { BASE_STYLES, type DiagramParams } from "./shared"

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

export default function DeepseekV3Diagram(p: DiagramParams) {
  return <MermaidDiagram definition={deepseekV3Def(p)} fit={p.fit} />
}
