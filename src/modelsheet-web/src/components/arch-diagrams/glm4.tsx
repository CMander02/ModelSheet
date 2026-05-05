import { ReactFlowDiagram } from "../react-flow-diagram"
import { type DiagramParams } from "./shared"
import { pill, rect, resid, note, seq, merge, residEdge, resetIds } from "./diagram-builder"

export default function Glm4Diagram(p: DiagramParams) {
  resetIds()
  const { numLayers = 40, numHeads = 32, numKvHeads = 2, hiddenSize = 4096 } = p

  const input = pill("Input tokens")
  const emb = rect("Token Embedding", "emb", { sublabel: "no learned pos emb" })
  const ln1 = rect("RMSNorm", "norm", { sublabel: "pre-norm · input_layernorm" })
  const attn = rect(`GQA Q:${numHeads} KV:${numKvHeads}`, "attn", { sublabel: "RoPE-2D · QKV fused" })
  const r1 = resid()
  const ln2 = rect("RMSNorm", "norm", { sublabel: "pre-norm · post_attention_layernorm" })
  const ffn = rect("SwiGLU FFN", "ffn", { sublabel: "gate · up → SiLU → down" })
  const r2 = resid()
  const lnf = rect("Final RMSNorm", "norm", { sublabel: "encoder.final_layernorm" })
  const lmh = rect("LM Head", "out", { sublabel: "tied to token emb" })
  const info = note(`hidden: ${hiddenSize.toLocaleString()} · rope_ratio: 500`)

  const main = seq(input, emb, ln1, attn, r1, ln2, ffn, r2, lnf, lmh)
  const res1 = residEdge(emb, r1)
  const res2 = residEdge(r1, r2)

  return <ReactFlowDiagram nodes={[...main.nodes, info]} edges={[...main.edges, res1, res2]} fit={p.fit} />
}
