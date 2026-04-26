import { MermaidDiagram } from "../mermaid-diagram"
import { BASE_STYLES, type DiagramParams } from "./shared"

function gpt2Def({ numLayers = 12, numHeads, hiddenSize, vocabSize }: DiagramParams) {
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["GPT-2"]
      tok["Token Embedding"]:::emb
      pos["Positional Embedding (learned)"]:::emb
      drop0["Dropout"]:::resid

      subgraph block["Transformer Block ×${numLayers}"]
        ln1["LayerNorm 1  pre-norm"]:::norm
        attn["Causal Self-Attention  fused QKV"]:::attn
        drop1["Dropout"]:::resid
        plus1(("+")):::resid
        ln2["LayerNorm 2  pre-norm"]:::norm
        ffn["Feed Forward  4× → GELU → proj"]:::ffn
        drop2["Dropout"]:::resid
        plus2(("+")):::resid
      end

      lnf["Final LayerNorm"]:::norm
      lmh["LM Head  tied to token emb${vocabSize ? `  vocab: ${vocabSize.toLocaleString()}` : ""}"]:::out
    end

    input --> tok --> pos --> drop0 --> ln1
    ln1 --> attn --> drop1 --> plus1 --> ln2 --> ffn --> drop2 --> plus2
    drop0 -.->|residual| plus1
    plus1 -.->|residual| plus2
    plus2 --> lnf --> lmh
    ${numHeads   ? `\n    note_h["Heads: ${numHeads}${hiddenSize ? `  ·  hidden: ${hiddenSize.toLocaleString()}` : ""}"]:::resid` : ""}
${BASE_STYLES}`
}

export default function Gpt2Diagram(p: DiagramParams) {
  return <MermaidDiagram definition={gpt2Def(p)} fit={p.fit} />
}
