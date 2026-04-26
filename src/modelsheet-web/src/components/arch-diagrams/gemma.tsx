import { MermaidDiagram } from "../mermaid-diagram"
import { BASE_STYLES, type DiagramParams } from "./shared"

function gemmaDef({ numLayers = 42, numHeads = 16, numKvHeads = 8, hiddenSize = 3584 }: DiagramParams) {
  const gqaNote = numHeads && numKvHeads ? `  Q:${numHeads} KV:${numKvHeads}` : ""
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["Gemma 2"]
      emb["Token Embedding  ×√hiddenSize scaling"]:::emb

      subgraph block["Decoder Block ×${numLayers}"]
        ln1["RMSNorm  pre-norm"]:::norm
        qknorm["QK-RMSNorm  per-head  on Q and K"]:::norm
        attn["GQA${gqaNote}  RoPE  logit soft-cap (tanh)"]:::attn
        ln1post["RMSNorm  post-norm"]:::norm
        plus1(("+")):::resid
        ln2["RMSNorm  pre-norm"]:::norm
        ffn["GeGLU FFN  gate · up → GELU → down"]:::ffn
        ln2post["RMSNorm  post-norm"]:::norm
        plus2(("+")):::resid
      end

      lnf["Final RMSNorm"]:::norm
      cap["Final Logit Soft-Cap  tanh(x/30)×30"]:::out
      lmh["LM Head  tied to token emb"]:::out
    end

    input --> emb --> ln1 --> qknorm --> attn --> ln1post --> plus1 --> ln2 --> ffn --> ln2post --> plus2 --> lnf --> cap --> lmh
    emb -.->|residual| plus1
    plus1 -.->|residual| plus2
    note_h["hidden: ${hiddenSize.toLocaleString()}  ·  no bias"]:::resid
${BASE_STYLES}`
}

export default function GemmaDiagram(p: DiagramParams) {
  return <MermaidDiagram definition={gemmaDef(p)} fit={p.fit} />
}
