import { MermaidDiagram } from "../mermaid-diagram"
import { BASE_STYLES, type DiagramParams } from "./shared"

function olmoDef({ numLayers = 32, numHeads = 32, numKvHeads = 8, hiddenSize = 4096 }: DiagramParams) {
  const gqaNote = numHeads && numKvHeads ? `  Q:${numHeads} KV:${numKvHeads}` : ""
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["OLMo 2"]
      emb["Token Embedding"]:::emb

      subgraph block["Decoder Block ×${numLayers}"]
        ln1["RMSNorm  pre-norm  attention_norm"]:::norm
        qknorm["QK-RMSNorm  per-head  on Q and K before RoPE"]:::norm
        attn["GQA${gqaNote}  RoPE  no bias"]:::attn
        plus1(("+")):::resid
        ln2["RMSNorm  pre-norm  ffn_norm"]:::norm
        ffn["SwiGLU FFN  gate · up → SiLU → down"]:::ffn
        plus2(("+")):::resid
      end

      lnf["Final RMSNorm"]:::norm
      lmh["LM Head  tied to token emb"]:::out
    end

    input --> emb --> ln1 --> qknorm --> attn --> plus1 --> ln2 --> ffn --> plus2 --> lnf --> lmh
    emb -.->|residual| plus1
    plus1 -.->|residual| plus2
    note_h["hidden: ${hiddenSize.toLocaleString()}  ·  fully open data + weights + code"]:::resid
${BASE_STYLES}`
}

export default function OlmoDiagram(p: DiagramParams) {
  return <MermaidDiagram definition={olmoDef(p)} fit={p.fit} />
}
