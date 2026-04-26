import { MermaidDiagram } from "../mermaid-diagram"
import { BASE_STYLES, type DiagramParams } from "./shared"

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

export default function Qwen3Diagram(p: DiagramParams) {
  return <MermaidDiagram definition={qwen3Def(p)} fit={p.fit} />
}
