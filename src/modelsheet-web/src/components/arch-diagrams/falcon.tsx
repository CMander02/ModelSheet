import { ReactFlowDiagram } from "../react-flow-diagram"
import { type DiagramParams } from "./shared"
import { pill, rect, resid, note, edge, residEdge, resetIds } from "./diagram-builder"

export default function FalconDiagram(p: DiagramParams) {
  resetIds()
  const {numHeads = 71, numKvHeads = 1, hiddenSize = 4544 } = p

  const input = pill("Input tokens")
  const emb = rect("Token Embedding", "emb")
  const ln1 = rect("LayerNorm", "norm", { sublabel: "pre-norm · ln_attn" })
  const parallelNote = note("Attention + FFN computed in PARALLEL from same input")
  const attn = rect(`MQA · ${numHeads}Q ${numKvHeads}KV`, "attn", { sublabel: "RoPE · no bias" })
  const ffn = rect("FFN", "ffn", { sublabel: "Linear → GELU → Linear" })
  const plus1 = resid()
  const lnf = rect("Final LayerNorm", "norm")
  const lmh = rect("LM Head", "out", { sublabel: "tied to token emb" })
  const info = note(`hidden: ${hiddenSize.toLocaleString()} · parallel attn+FFN is Falcon key design`)

  const nodes = [input, emb, ln1, parallelNote, attn, ffn, plus1, lnf, lmh, info]
  const edges = [
    edge(input, emb),
    edge(emb, ln1),
    edge(ln1, parallelNote),
    edge(parallelNote, attn),
    edge(attn, plus1),
    edge(parallelNote, ffn),
    edge(ffn, plus1),
    residEdge(emb, plus1),
    edge(plus1, lnf),
    edge(lnf, lmh),
  ]

  return <ReactFlowDiagram nodes={nodes} edges={edges} fit={p.fit} />
}
