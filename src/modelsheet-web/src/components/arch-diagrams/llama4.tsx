import { MermaidDiagram } from "../mermaid-diagram"
import { BASE_STYLES, type DiagramParams } from "./shared"

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

export default function Llama4Diagram(p: DiagramParams) {
  return <MermaidDiagram definition={llama4Def(p)} fit={p.fit} />
}
