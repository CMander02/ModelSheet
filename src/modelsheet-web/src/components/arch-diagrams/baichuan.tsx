import { MermaidDiagram } from "../mermaid-diagram"
import { BASE_STYLES, type DiagramParams } from "./shared"

function baichuanDef({ numLayers = 32, numHeads = 32, hiddenSize = 4096 }: DiagramParams) {
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["Baichuan 2"]
      emb["Token Embedding"]:::emb

      subgraph block["Decoder Block ×${numLayers}"]
        ln1["RMSNorm  pre-norm  input_layernorm"]:::norm
        attn["MHA  ${numHeads} heads  RoPE (7B) / ALiBi (13B)  no bias"]:::attn
        plus1(("+")):::resid
        ln2["RMSNorm  pre-norm  post_attention_layernorm"]:::norm
        ffn["SwiGLU FFN  gate · up → SiLU → down  no bias"]:::ffn
        plus2(("+")):::resid
      end

      lnf["Final RMSNorm  norm"]:::norm
      lmh["LM Head  tied to token emb"]:::out
    end

    input --> emb --> ln1 --> attn --> plus1 --> ln2 --> ffn --> plus2 --> lnf --> lmh
    emb -.->|residual| plus1
    plus1 -.->|residual| plus2
    note_h["hidden: ${hiddenSize.toLocaleString()}  ·  7B uses RoPE  13B uses ALiBi"]:::resid
${BASE_STYLES}`
}

export default function BaichuanDiagram(p: DiagramParams) {
  return <MermaidDiagram definition={baichuanDef(p)} fit={p.fit} />
}
