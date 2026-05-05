import { ReactFlowDiagram } from "../react-flow-diagram"
import { type DiagramParams } from "./shared"
import { pill, rect, resid, note, seq, merge, residEdge, resetIds } from "./diagram-builder"

export default function LlamaDiagram(p: DiagramParams) {
  resetIds()
  const { numLayers = 32, numHeads = 32, numKvHeads = 8, hiddenSize = 4096 } = p
  const gqaNote = `Q:${numHeads} KV:${numKvHeads}`

  const input = pill("Input tokens")
  const emb = rect("Token Embedding", "emb", { sublabel: "no learned pos emb · RoPE in attn" })
  const ln1 = rect("RMSNorm", "norm", { sublabel: "pre-norm · input_layernorm" })
  const attn = rect(`GQA ${gqaNote}`, "attn", { sublabel: "RoPE · no bias" })
  const r1 = resid()
  const ln2 = rect("RMSNorm", "norm", { sublabel: "pre-norm · post_attention_layernorm" })
  const ffn = rect("SwiGLU FFN", "ffn", { sublabel: "gate_proj · up_proj → SiLU → down_proj" })
  const r2 = resid()
  const lnf = rect("Final RMSNorm", "norm")
  const lmh = rect("LM Head", "out", { sublabel: "no weight tying in LLaMA 3" })
  const info = note(`hidden: ${hiddenSize.toLocaleString()} · rope_theta: 500000 (Llama-3)`)

  const main = seq(input, emb, ln1, attn, r1, ln2, ffn, r2, lnf, lmh)
  const res1 = residEdge(emb, r1)
  const res2 = residEdge(r1, r2)

  return <ReactFlowDiagram nodes={[...main.nodes, info]} edges={[...main.edges, res1, res2]} fit={p.fit} />
}
