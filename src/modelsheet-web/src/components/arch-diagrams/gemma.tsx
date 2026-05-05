import { ReactFlowDiagram } from "../react-flow-diagram"
import { type DiagramParams } from "./shared"
import { pill, rect, resid, note, seq, merge, residEdge, resetIds } from "./diagram-builder"

export default function GemmaDiagram(p: DiagramParams) {
  resetIds()
  const { numLayers = 42, numHeads = 16, numKvHeads = 8, hiddenSize = 3584 } = p

  const input = pill("Input tokens")
  const emb = rect("Token Embedding", "emb", { sublabel: "×√hiddenSize scaling" })
  const ln1 = rect("RMSNorm", "norm", { sublabel: "pre-norm" })
  const qknorm = rect("QK-RMSNorm", "norm", { sublabel: "per-head on Q and K" })
  const attn = rect(`GQA Q:${numHeads} KV:${numKvHeads}`, "attn", { sublabel: "RoPE · logit soft-cap (tanh)" })
  const ln1post = rect("RMSNorm", "norm", { sublabel: "post-norm" })
  const r1 = resid()
  const ln2 = rect("RMSNorm", "norm", { sublabel: "pre-norm" })
  const ffn = rect("GeGLU FFN", "ffn", { sublabel: "gate · up → GELU → down" })
  const ln2post = rect("RMSNorm", "norm", { sublabel: "post-norm" })
  const r2 = resid()
  const lnf = rect("Final RMSNorm", "norm")
  const cap = rect("Logit Soft-Cap", "out", { sublabel: "tanh(x/30)×30" })
  const lmh = rect("LM Head", "out", { sublabel: "tied to token emb" })
  const info = note(`hidden: ${hiddenSize.toLocaleString()} · no bias`)

  const main = seq(input, emb, ln1, qknorm, attn, ln1post, r1, ln2, ffn, ln2post, r2, lnf, cap, lmh)
  const res1 = residEdge(emb, r1)
  const res2 = residEdge(r1, r2)

  return <ReactFlowDiagram nodes={[...main.nodes, info]} edges={[...main.edges, res1, res2]} fit={p.fit} />
}
