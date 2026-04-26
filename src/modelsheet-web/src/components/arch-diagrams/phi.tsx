import { MermaidDiagram } from "../mermaid-diagram"
import { BASE_STYLES, type DiagramParams } from "./shared"

function phiDef({ numLayers = 32, numHeads = 32, numKvHeads = 8, hiddenSize = 3072 }: DiagramParams) {
  const gqaNote = numHeads && numKvHeads ? `  Q:${numHeads} KV:${numKvHeads}` : ""
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["Phi-3 / Phi-4"]
      emb["Token Embedding"]:::emb

      subgraph block["Decoder Block ×${numLayers}"]
        ln1["RMSNorm  pre-norm  input_layernorm"]:::norm
        attn["GQA${gqaNote}  RoPE  QKV fused  bias=True"]:::attn
        plus1(("+")):::resid
        ln2["RMSNorm  pre-norm  post_attention_layernorm"]:::norm
        ffn["SwiGLU FFN  gate_up_proj → SiLU → down_proj  bias=True"]:::ffn
        plus2(("+")):::resid
      end

      lnf["Final RMSNorm"]:::norm
      lmh["LM Head"]:::out
    end

    input --> emb --> ln1 --> attn --> plus1 --> ln2 --> ffn --> plus2 --> lnf --> lmh
    emb -.->|residual| plus1
    plus1 -.->|residual| plus2
    note_h["hidden: ${hiddenSize.toLocaleString()}  ·  QKV + dense bias = True"]:::resid
${BASE_STYLES}`
}

export default function PhiDiagram(p: DiagramParams) {
  return <MermaidDiagram definition={phiDef(p)} fit={p.fit} />
}
