import { MermaidDiagram } from "../mermaid-diagram"
import { BASE_STYLES, type DiagramParams } from "./shared"

function exaoneDef({ numLayers = 32, numHeads = 32, numKvHeads = 8, hiddenSize = 4096 }: DiagramParams) {
  const gqaNote = numHeads && numKvHeads ? `  Q:${numHeads} KV:${numKvHeads}` : ""
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["EXAONE"]
      emb["Token Embedding"]:::emb

      subgraph block["Decoder Block ×${numLayers}"]
        ln1["RMSNorm  pre-norm  ln_1"]:::norm
        attn["GQA${gqaNote}  RoPE  no bias"]:::attn
        plus1(("+")):::resid
        ln2["RMSNorm  pre-norm  ln_2"]:::norm
        ffn["SwiGLU FFN  c_fc · c_fc2 → SiLU → c_proj"]:::ffn
        plus2(("+")):::resid
      end

      lnf["Final RMSNorm  ln_f"]:::norm
      lmh["LM Head  lm_head"]:::out
    end

    input --> emb --> ln1 --> attn --> plus1 --> ln2 --> ffn --> plus2 --> lnf --> lmh
    emb -.->|residual| plus1
    plus1 -.->|residual| plus2
    note_h["hidden: ${hiddenSize.toLocaleString()}  ·  LG AI Research"]:::resid
${BASE_STYLES}`
}

export default function ExaoneDiagram(p: DiagramParams) {
  return <MermaidDiagram definition={exaoneDef(p)} fit={p.fit} />
}
