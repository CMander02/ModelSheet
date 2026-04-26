import { MermaidDiagram } from "../mermaid-diagram"
import { BASE_STYLES, type DiagramParams } from "./shared"

function deepseekDenseDef({ numLayers = 30, numHeads = 32, numKvHeads = 32, hiddenSize = 4096 }: DiagramParams) {
  const gqaNote = numKvHeads && numKvHeads !== numHeads ? `  GQA Q:${numHeads} KV:${numKvHeads}` : `  MHA heads:${numHeads}`
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["DeepSeek (dense)"]
      emb["Token Embedding"]:::emb

      subgraph block["Decoder Block ×${numLayers}"]
        ln1["RMSNorm  pre-norm  input_layernorm"]:::norm
        attn["Attention${gqaNote}  RoPE  no bias"]:::attn
        plus1(("+")):::resid
        ln2["RMSNorm  pre-norm  post_attention_layernorm"]:::norm
        ffn["SwiGLU FFN  gate_proj · up_proj → SiLU → down_proj"]:::ffn
        plus2(("+")):::resid
      end

      lnf["Final RMSNorm"]:::norm
      lmh["LM Head"]:::out
    end

    input --> emb --> ln1 --> attn --> plus1 --> ln2 --> ffn --> plus2 --> lnf --> lmh
    emb -.->|residual| plus1
    plus1 -.->|residual| plus2
    note_h["hidden: ${hiddenSize.toLocaleString()}"]:::resid
${BASE_STYLES}`
}

export default function DeepseekDenseDiagram(p: DiagramParams) {
  return <MermaidDiagram definition={deepseekDenseDef(p)} fit={p.fit} />
}
