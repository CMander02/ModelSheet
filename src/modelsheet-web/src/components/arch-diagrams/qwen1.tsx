import { MermaidDiagram } from "../mermaid-diagram"
import { BASE_STYLES, type DiagramParams } from "./shared"

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

export default function Qwen1Diagram(p: DiagramParams) {
  return <MermaidDiagram definition={qwen1Def(p)} fit={p.fit} />
}
