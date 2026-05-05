import { ReactFlowDiagram } from "../react-flow-diagram"
import { type DiagramParams } from "./shared"
import { pill, rect, resid, note, seq, residEdge, resetIds } from "./diagram-builder"

export default function Qwen1Diagram(p: DiagramParams) {
  resetIds()
  const {numHeads = 32, hiddenSize = 4096 } = p

  const input = pill("Input tokens")
  const emb = rect("Token Embedding", "emb")
  const ln1 = rect("RMSNorm", "norm", { sublabel: "pre-norm" })
  const attn = rect("MHA", "attn", { sublabel: `Heads: ${numHeads} · RoPE + LogN scaling · QKV bias` })
  const r1 = resid()
  const ln2 = rect("RMSNorm", "norm", { sublabel: "pre-norm" })
  const ffn = rect("SwiGLU FFN", "ffn", { sublabel: "gate · up → SiLU → down" })
  const r2 = resid()
  const lnf = rect("Final RMSNorm", "norm")
  const lmh = rect("LM Head", "out", { sublabel: "tied to token emb" })
  const info = note(`Heads: ${numHeads} · hidden: ${hiddenSize.toLocaleString()} · QKV bias = True`)

  const main = seq(input, emb, ln1, attn, r1, ln2, ffn, r2, lnf, lmh)
  const res1 = residEdge(emb, r1)
  const res2 = residEdge(r1, r2)

  return <ReactFlowDiagram nodes={[...main.nodes, info]} edges={[...main.edges, res1, res2]} fit={p.fit} />
}
