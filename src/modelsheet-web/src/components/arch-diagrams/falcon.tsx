import { MermaidDiagram } from "../mermaid-diagram"
import { BASE_STYLES, type DiagramParams } from "./shared"

function falconDef({ numLayers = 32, numHeads = 71, numKvHeads = 1, hiddenSize = 4544 }: DiagramParams) {
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["Falcon"]
      emb["Token Embedding"]:::emb

      subgraph block["Decoder Block ×${numLayers}"]
        ln1["LayerNorm  pre-norm  ln_attn"]:::norm
        parallel_note["Attention + FFN computed in PARALLEL from same input"]:::resid
        attn["MQA  ${numHeads} Q heads  ${numKvHeads} KV head  RoPE  no bias"]:::attn
        ffn["FFN  Linear → GELU → Linear"]:::ffn
        plus1(("+")):::resid
      end

      lnf["Final LayerNorm"]:::norm
      lmh["LM Head  tied to token emb"]:::out
    end

    input --> emb --> ln1 --> parallel_note
    parallel_note --> attn --> plus1
    parallel_note --> ffn --> plus1
    emb -.->|residual| plus1
    plus1 --> lnf --> lmh
    note_h["hidden: ${hiddenSize.toLocaleString()}  ·  parallel attn+FFN is Falcon key design"]:::resid
${BASE_STYLES}`
}

export default function FalconDiagram(p: DiagramParams) {
  return <MermaidDiagram definition={falconDef(p)} fit={p.fit} />
}
