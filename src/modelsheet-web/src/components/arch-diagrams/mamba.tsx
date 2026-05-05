import { ReactFlowDiagram } from "../react-flow-diagram"
import { type DiagramParams } from "./shared"
import { pill, rect, resid, note, edge, residEdge, resetIds } from "./diagram-builder"

export default function MambaDiagram(p: DiagramParams) {
  resetIds()
  const {hiddenSize = 2560 } = p

  const input = pill("Input tokens")
  const emb = rect("Token Embedding", "emb")
  const ln1 = rect("RMSNorm", "norm", { sublabel: "pre-norm" })
  const inProj = rect("Input Projection", "attn", { sublabel: "split → x and z" })
  const conv1d = rect("Conv1d", "attn", { sublabel: "causal · depthwise" })
  const silu1 = rect("SiLU", "attn", { sublabel: "activation" })
  const ssm = rect("SSM Selective Scan", "attn", { sublabel: "S6 · dt/A/B/C learned from x" })
  const gate = rect("× gate", "attn", { sublabel: "silu(z) gating" })
  const outProj = rect("Output Projection", "attn")
  const plus1 = resid()
  const lnf = rect("Final RMSNorm", "norm")
  const lmh = rect("LM Head", "out", { sublabel: "tied to token emb" })
  const info = note(`hidden: ${hiddenSize.toLocaleString()} · no attention · linear-time inference`)

  const nodes = [input, emb, ln1, inProj, conv1d, silu1, ssm, gate, outProj, plus1, lnf, lmh, info]
  const edges = [
    edge(input, emb),
    edge(emb, ln1),
    edge(ln1, inProj),
    edge(inProj, conv1d),
    edge(conv1d, silu1),
    edge(silu1, ssm),
    edge(ssm, gate),
    edge(gate, outProj),
    edge(outProj, plus1),
    residEdge(emb, plus1),
    edge(plus1, lnf),
    edge(lnf, lmh),
  ]

  return <ReactFlowDiagram nodes={nodes} edges={edges} fit={p.fit} />
}
