import { MermaidDiagram } from "../mermaid-diagram"
import { BASE_STYLES, type DiagramParams } from "./shared"

function llamaDef({ numLayers = 32, numHeads = 32, numKvHeads = 8, hiddenSize = 4096 }: DiagramParams) {
  const gqaNote = numHeads && numKvHeads ? `  Q:${numHeads} KV:${numKvHeads}` : ""
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["LLaMA 2 / 3"]
      emb["Token Embedding  no learned pos emb  RoPE in attn"]:::emb

      subgraph block["Decoder Block ×${numLayers}"]
        ln1["RMSNorm  pre-norm  input_layernorm"]:::norm
        attn["GQA${gqaNote}  RoPE  no bias"]:::attn
        plus1(("+")):::resid
        ln2["RMSNorm  pre-norm  post_attention_layernorm"]:::norm
        ffn["SwiGLU FFN  gate_proj · up_proj → SiLU → down_proj"]:::ffn
        plus2(("+")):::resid
      end

      lnf["Final RMSNorm"]:::norm
      lmh["LM Head  no weight tying in LLaMA 3"]:::out
    end

    input --> emb --> ln1 --> attn --> plus1 --> ln2 --> ffn --> plus2 --> lnf --> lmh
    emb -.->|residual| plus1
    plus1 -.->|residual| plus2
    note_h["hidden: ${hiddenSize.toLocaleString()}  ·  rope_theta: 500000  Llama-3"]:::resid
${BASE_STYLES}`
}

export default function LlamaDiagram(p: DiagramParams) {
  return <MermaidDiagram definition={llamaDef(p)} fit={p.fit} />
}
