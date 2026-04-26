import { MermaidDiagram } from "../mermaid-diagram"
import { BASE_STYLES, type DiagramParams } from "./shared"

function internlmDef({ numLayers = 32, numHeads = 32, numKvHeads = 8, hiddenSize = 4096 }: DiagramParams) {
  const gqaNote = numHeads && numKvHeads ? `  Q:${numHeads} KV:${numKvHeads}` : ""
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["InternLM 2 / 3"]
      emb["Token Embedding"]:::emb

      subgraph block["Decoder Block ×${numLayers}"]
        ln1["RMSNorm  pre-norm  attention_norm"]:::norm
        attn["GQA${gqaNote}  RoPE  QKV with bias  wqkv fused"]:::attn
        plus1(("+")):::resid
        ln2["RMSNorm  pre-norm  ffn_norm"]:::norm
        ffn["SwiGLU FFN  w1 · w3 → SiLU → w2"]:::ffn
        plus2(("+")):::resid
      end

      lnf["Final RMSNorm  norm"]:::norm
      lmh["LM Head  output"]:::out
    end

    input --> emb --> ln1 --> attn --> plus1 --> ln2 --> ffn --> plus2 --> lnf --> lmh
    emb -.->|residual| plus1
    plus1 -.->|residual| plus2
    note_h["hidden: ${hiddenSize.toLocaleString()}  ·  QKV bias = True"]:::resid
${BASE_STYLES}`
}

export default function InternlmDiagram(p: DiagramParams) {
  return <MermaidDiagram definition={internlmDef(p)} fit={p.fit} />
}
