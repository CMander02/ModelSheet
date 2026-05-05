import { ReactFlowDiagram } from "../react-flow-diagram"
import { type DiagramParams } from "./shared"
import { pill, rect, resid, note, seq, merge, residEdge, resetIds } from "./diagram-builder"

export default function BaichuanDiagram(p: DiagramParams) {
  resetIds()
  const { numLayers = 32, numHeads = 32, hiddenSize = 4096 } = p

  const input = pill("Input tokens")
  const emb = rect("Token Embedding", "emb")
  const ln1 = rect("RMSNorm", "norm", { sublabel: "pre-norm · input_layernorm" })
  const attn = rect(`MHA ${numHeads} heads`, "attn", { sublabel: "RoPE (7B) or ALiBi (13B) · no bias" })
  const r1 = resid()
  const ln2 = rect("RMSNorm", "norm", { sublabel: "pre-norm · post_attention_layernorm" })
  const ffn = rect("SwiGLU FFN", "ffn", { sublabel: "gate · up → SiLU → down" })
  const r2 = resid()
  const lnf = rect("Final RMSNorm", "norm")
  const lmh = rect("LM Head", "out")
  const info = note(`hidden: ${hiddenSize.toLocaleString()} · no bias`)

  const main = seq(input, emb, ln1, attn, r1, ln2, ffn, r2, lnf, lmh)
  const res1 = residEdge(emb, r1)
  const res2 = residEdge(r1, r2)

  return <ReactFlowDiagram nodes={[...main.nodes, info]} edges={[...main.edges, res1, res2]} fit={p.fit} />
}
