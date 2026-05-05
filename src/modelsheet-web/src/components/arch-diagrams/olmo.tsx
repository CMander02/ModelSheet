import { ReactFlowDiagram } from "../react-flow-diagram"
import { type DiagramParams } from "./shared"
import { pill, rect, resid, note, seq, merge, residEdge, resetIds } from "./diagram-builder"

export default function OlmoDiagram(p: DiagramParams) {
  resetIds()
  const { numLayers = 32, numHeads = 32, numKvHeads = 8, hiddenSize = 4096 } = p

  const input = pill("Input tokens")
  const emb = rect("Token Embedding", "emb")
  const ln1 = rect("RMSNorm", "norm", { sublabel: "pre-norm · attention_norm" })
  const qknorm = rect("QK-RMSNorm", "norm", { sublabel: "per-head on Q/K before RoPE" })
  const attn = rect(`GQA Q:${numHeads} KV:${numKvHeads}`, "attn", { sublabel: "RoPE · no bias" })
  const r1 = resid()
  const ln2 = rect("RMSNorm", "norm", { sublabel: "pre-norm · ffn_norm" })
  const ffn = rect("SwiGLU FFN", "ffn", { sublabel: "gate · up → SiLU → down" })
  const r2 = resid()
  const lnf = rect("Final RMSNorm", "norm")
  const lmh = rect("LM Head", "out", { sublabel: "tied to token emb" })
  const info = note(`hidden: ${hiddenSize.toLocaleString()} · fully open data + weights + code`)

  const main = seq(input, emb, ln1, qknorm, attn, r1, ln2, ffn, r2, lnf, lmh)
  const res1 = residEdge(emb, r1)
  const res2 = residEdge(r1, r2)

  return <ReactFlowDiagram nodes={[...main.nodes, info]} edges={[...main.edges, res1, res2]} fit={p.fit} />
}
