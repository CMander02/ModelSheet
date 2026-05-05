import { ReactFlowDiagram } from "../react-flow-diagram"
import { type DiagramParams } from "./shared"
import { pill, rect, resid, note, seq, merge, residEdge, resetIds } from "./diagram-builder"

export default function InternlmDiagram(p: DiagramParams) {
  resetIds()
  const { numLayers = 32, numHeads = 32, numKvHeads = 8, hiddenSize = 4096 } = p

  const input = pill("Input tokens")
  const emb = rect("Token Embedding", "emb")
  const ln1 = rect("RMSNorm", "norm", { sublabel: "pre-norm · attention_norm" })
  const attn = rect(`GQA Q:${numHeads} KV:${numKvHeads}`, "attn", { sublabel: "RoPE · wqkv fused · QKV bias" })
  const r1 = resid()
  const ln2 = rect("RMSNorm", "norm", { sublabel: "pre-norm · ffn_norm" })
  const ffn = rect("SwiGLU FFN", "ffn", { sublabel: "w1 · w3 → SiLU → w2" })
  const r2 = resid()
  const lnf = rect("Final RMSNorm", "norm", { sublabel: "norm" })
  const lmh = rect("LM Head", "out", { sublabel: "output" })
  const info = note(`hidden: ${hiddenSize.toLocaleString()} · QKV bias = True`)

  const main = seq(input, emb, ln1, attn, r1, ln2, ffn, r2, lnf, lmh)
  const res1 = residEdge(emb, r1)
  const res2 = residEdge(r1, r2)

  return <ReactFlowDiagram nodes={[...main.nodes, info]} edges={[...main.edges, res1, res2]} fit={p.fit} />
}
