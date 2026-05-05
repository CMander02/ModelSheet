import { ReactFlowDiagram } from "../react-flow-diagram"
import { type DiagramParams } from "./shared"
import { pill, rect, resid, note, seq, residEdge, resetIds } from "./diagram-builder"

export default function ExaoneDiagram(p: DiagramParams) {
  resetIds()
  const {numHeads = 32, numKvHeads = 8, hiddenSize = 4096 } = p

  const input = pill("Input tokens")
  const emb = rect("Token Embedding", "emb")
  const ln1 = rect("RMSNorm", "norm", { sublabel: "pre-norm" })
  const attn = rect(`GQA Q:${numHeads} KV:${numKvHeads}`, "attn", { sublabel: "RoPE · no bias" })
  const r1 = resid()
  const ln2 = rect("RMSNorm", "norm", { sublabel: "pre-norm" })
  const ffn = rect("SwiGLU FFN", "ffn", { sublabel: "gate · up → SiLU → down" })
  const r2 = resid()
  const lnf = rect("Final RMSNorm", "norm")
  const lmh = rect("LM Head", "out")
  const info = note(`hidden: ${hiddenSize.toLocaleString()} · LG AI Research`)

  const main = seq(input, emb, ln1, attn, r1, ln2, ffn, r2, lnf, lmh)
  const res1 = residEdge(emb, r1)
  const res2 = residEdge(r1, r2)

  return <ReactFlowDiagram nodes={[...main.nodes, info]} edges={[...main.edges, res1, res2]} fit={p.fit} />
}
