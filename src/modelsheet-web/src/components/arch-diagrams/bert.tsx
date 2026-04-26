import { MermaidDiagram } from "../mermaid-diagram"
import { BASE_STYLES, type DiagramParams } from "./shared"

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

export default function BertDiagram(p: DiagramParams) {
  return <MermaidDiagram definition={bertDef(p)} fit={p.fit} />
}
