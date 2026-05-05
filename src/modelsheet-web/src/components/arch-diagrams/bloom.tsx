import { ReactFlowDiagram } from "../react-flow-diagram"
import { type DiagramParams } from "./shared"
import { pill, rect, resid, note, seq, merge, residEdge, resetIds } from "./diagram-builder"

export default function BloomDiagram(p: DiagramParams) {
  resetIds()
  const { numLayers = 70, numHeads = 112, hiddenSize = 14336 } = p

  const input = pill("Input tokens")
  const emb = rect("Token Embedding", "emb")
  const embLn = rect("Embedding LayerNorm", "norm", { sublabel: "post-embedding · unique to BLOOM" })
  const ln1 = rect("LayerNorm", "norm", { sublabel: "pre-norm · input_layernorm" })
  const attn = rect(`MHA ${numHeads} heads`, "attn", { sublabel: "ALiBi bias · no RoPE · with bias" })
  const r1 = resid()
  const ln2 = rect("LayerNorm", "norm", { sublabel: "pre-norm · post_attention_layernorm" })
  const ffn = rect("FFN", "ffn", { sublabel: "Linear → GELU → Linear · with bias" })
  const r2 = resid()
  const lnf = rect("Final LayerNorm", "norm")
  const lmh = rect("LM Head", "out", { sublabel: "tied to token emb" })
  const info = note(`hidden: ${hiddenSize.toLocaleString()} · ALiBi: learned distance bias in attn logits`)

  const main = seq(input, emb, embLn, ln1, attn, r1, ln2, ffn, r2, lnf, lmh)
  const res1 = residEdge(embLn, r1)
  const res2 = residEdge(r1, r2)

  return <ReactFlowDiagram nodes={[...main.nodes, info]} edges={[...main.edges, res1, res2]} fit={p.fit} />
}
