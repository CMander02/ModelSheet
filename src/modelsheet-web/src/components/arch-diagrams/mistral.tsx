import { MermaidDiagram } from "../mermaid-diagram"
import { BASE_STYLES, type DiagramParams } from "./shared"

function mistralDef({ numLayers = 32, numHeads = 32, numKvHeads = 8, hiddenSize = 4096, numExperts, numExpertsPerToken = 2 }: DiagramParams) {
  const gqaNote = numHeads && numKvHeads ? `  Q:${numHeads} KV:${numKvHeads}` : ""
  const isMoE = numExperts && numExperts > 1
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["${isMoE ? "Mixtral" : "Mistral"}"]
      emb["Token Embedding"]:::emb

      subgraph block["Decoder Block ×${numLayers}"]
        ln1["RMSNorm  pre-norm"]:::norm
        attn["GQA${gqaNote}  RoPE  Sliding Window Attention  no bias"]:::attn
        plus1(("+")):::resid
        ln2["RMSNorm  pre-norm"]:::norm
        ${isMoE
          ? `subgraph moe_blk["MoE  top-${numExpertsPerToken} of ${numExperts}"]
          router["Router  softmax  top-${numExpertsPerToken}"]:::moe
          experts["Expert FFN  ×${numExpertsPerToken}  SwiGLU"]:::moe
          moe_sum(("+")):::resid
        end`
          : `ffn["SwiGLU FFN  gate · up → SiLU → down"]:::ffn`}
        plus2(("+")):::resid
      end

      lnf["Final RMSNorm"]:::norm
      lmh["LM Head"]:::out
    end

    ${isMoE
      ? `input --> emb --> ln1 --> attn --> plus1 --> ln2 --> router --> experts --> moe_sum --> plus2 --> lnf --> lmh`
      : `input --> emb --> ln1 --> attn --> plus1 --> ln2 --> ffn --> plus2 --> lnf --> lmh`}
    emb -.->|residual| plus1
    plus1 -.->|residual| plus2
    note_h["hidden: ${hiddenSize.toLocaleString()}  ·  SWA window: 4096"]:::resid
${BASE_STYLES}`
}

export default function MistralDiagram(p: DiagramParams) {
  return <MermaidDiagram definition={mistralDef(p)} fit={p.fit} />
}
