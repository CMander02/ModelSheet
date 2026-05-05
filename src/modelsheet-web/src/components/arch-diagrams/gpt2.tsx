import { ReactFlowDiagram } from "../react-flow-diagram"
import { type DiagramParams } from "./shared"
import { pill, rect, resid, note, seq, merge, residEdge, resetIds } from "./diagram-builder"

export default function Gpt2Diagram(p: DiagramParams) {
  resetIds()
  const { numLayers = 12, numHeads = 12, hiddenSize = 768, vocabSize = 50257 } = p

  const input = pill("Input tokens")
  const emb = rect("Token + Position Embedding", "emb", { sublabel: "Learned positional emb" })
  const ln1 = rect("LayerNorm", "norm", { sublabel: "pre-norm" })
  const attn = rect("Fused QKV Attention", "attn", { sublabel: `${numHeads} heads · Conv1D · causal` })
  const r1 = resid()
  const ln2 = rect("LayerNorm", "norm", { sublabel: "pre-norm" })
  const ffn = rect("FFN", "ffn", { sublabel: "Linear → GELU → Linear" })
  const r2 = resid()
  const lnf = rect("Final LayerNorm", "norm")
  const lmh = rect("LM Head", "out", { sublabel: `vocab: ${vocabSize.toLocaleString()} · tied to token emb` })
  const info = note(`hidden: ${hiddenSize.toLocaleString()} · weight-tied LM head · no bias`)

  const main = seq(input, emb, ln1, attn, r1, ln2, ffn, r2, lnf, lmh)
  const res1 = residEdge(emb, r1)
  const res2 = residEdge(r1, r2)

  return <ReactFlowDiagram nodes={[...main.nodes, info]} edges={[...main.edges, res1, res2]} fit={p.fit} />
}
