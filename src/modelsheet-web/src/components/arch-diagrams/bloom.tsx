import { MermaidDiagram } from "../mermaid-diagram"
import { BASE_STYLES, type DiagramParams } from "./shared"

function bloomDef({ numLayers = 70, numHeads = 112, hiddenSize = 14336 }: DiagramParams) {
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["BLOOM"]
      emb["Token Embedding"]:::emb
      emb_ln["Embedding LayerNorm  post-embedding  unique to BLOOM"]:::norm

      subgraph block["Decoder Block ×${numLayers}"]
        ln1["LayerNorm  pre-norm  input_layernorm"]:::norm
        attn["MHA  ${numHeads} heads  ALiBi bias  no RoPE  with bias"]:::attn
        plus1(("+")):::resid
        ln2["LayerNorm  pre-norm  post_attention_layernorm"]:::norm
        ffn["FFN  Linear → GELU → Linear  with bias"]:::ffn
        plus2(("+")):::resid
      end

      lnf["Final LayerNorm"]:::norm
      lmh["LM Head  tied to token emb"]:::out
    end

    input --> emb --> emb_ln --> ln1 --> attn --> plus1 --> ln2 --> ffn --> plus2 --> lnf --> lmh
    emb_ln -.->|residual| plus1
    plus1 -.->|residual| plus2
    note_h["hidden: ${hiddenSize.toLocaleString()}  ·  ALiBi: learned distance bias in attn logits"]:::resid
${BASE_STYLES}`
}

export default function BloomDiagram(p: DiagramParams) {
  return <MermaidDiagram definition={bloomDef(p)} fit={p.fit} />
}
