import { MermaidDiagram } from "../mermaid-diagram"
import { BASE_STYLES, type DiagramParams } from "./shared"

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

export default function Qwen2Diagram(p: DiagramParams) {
  return <MermaidDiagram definition={qwen2Def(p)} fit={p.fit} />
}
