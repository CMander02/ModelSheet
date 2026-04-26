import { MermaidDiagram } from "../mermaid-diagram"
import { BASE_STYLES, type DiagramParams } from "./shared"

function glm4Def({ numLayers = 40, numHeads = 32, numKvHeads = 2, hiddenSize = 4096 }: DiagramParams) {
  const gqaNote = numHeads && numKvHeads ? `  Q:${numHeads} KV:${numKvHeads}` : ""
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["GLM4 / ChatGLM4"]
      emb["Token Embedding  no learned pos emb"]:::emb

      subgraph block["Decoder Block ×${numLayers}"]
        ln1["RMSNorm  pre-norm  input_layernorm"]:::norm
        attn["GQA${gqaNote}  RoPE-2D  QKV fused"]:::attn
        plus1(("+")):::resid
        ln2["RMSNorm  pre-norm  post_attention_layernorm"]:::norm
        ffn["SwiGLU FFN  gate · up → SiLU → down"]:::ffn
        plus2(("+")):::resid
      end

      lnf["Final RMSNorm  encoder.final_layernorm"]:::norm
      lmh["LM Head  tied to token emb"]:::out
    end

    input --> emb --> ln1 --> attn --> plus1 --> ln2 --> ffn --> plus2 --> lnf --> lmh
    emb -.->|residual| plus1
    plus1 -.->|residual| plus2
    note_h["hidden: ${hiddenSize.toLocaleString()}  ·  rope_ratio: 500"]:::resid
${BASE_STYLES}`
}

export default function Glm4Diagram(p: DiagramParams) {
  return <MermaidDiagram definition={glm4Def(p)} fit={p.fit} />
}
