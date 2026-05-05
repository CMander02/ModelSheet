import { ReactFlowDiagram } from "../react-flow-diagram"
import { type DiagramParams } from "./shared"
import { pill, rect, resid, note, seq, residEdge, resetIds } from "./diagram-builder"

export default function BertDiagram(p: DiagramParams) {
  resetIds()
  const {numHeads = 12, hiddenSize = 768 } = p

  const input = pill("Input tokens")
  const emb = rect("Token + Position + Type Embedding", "emb")
  const drop = rect("Dropout", "resid")
  const attn = rect("Multi-Head Self-Attention", "attn", { sublabel: "bidirectional" })
  const r1 = resid()
  const ln1 = rect("LayerNorm", "norm", { sublabel: "post-norm" })
  const ffn = rect("Feed Forward", "ffn", { sublabel: "Linear → GELU → Linear" })
  const r2 = resid()
  const ln2 = rect("LayerNorm", "norm", { sublabel: "post-norm" })
  const pool = rect("[CLS] Pooler", "pool", { sublabel: "Linear → Tanh" })
  const info = note(`Heads: ${numHeads} · hidden: ${hiddenSize.toLocaleString()}`)

  const main = seq(input, emb, drop, attn, r1, ln1, ffn, r2, ln2, pool)
  const res1 = residEdge(drop, r1)
  const res2 = residEdge(ln1, r2)

  return <ReactFlowDiagram nodes={[...main.nodes, info]} edges={[...main.edges, res1, res2]} fit={p.fit} />
}
