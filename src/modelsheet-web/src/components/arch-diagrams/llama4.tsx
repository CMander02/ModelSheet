import { ReactFlowDiagram } from "../react-flow-diagram"
import { type DiagramParams } from "./shared"
import { pill, rect, resid, note, edge, residEdge, resetIds } from "./diagram-builder"

export default function Llama4Diagram(p: DiagramParams) {
  resetIds()
  const { numLayers = 48, numExperts = 128, numExpertsPerToken = 1 } = p

  const input = pill("Input tokens")
  const emb = rect("Token Embedding", "emb")
  const layerNote = note("Layers alternate: full-attn every 4th, chunk-attn others")

  const ln1 = rect("RMSNorm", "norm", { sublabel: "pre-norm" })
  const attn = rect("Attention", "attn", { sublabel: "NoPE or iRoPE · interleaved per layer" })
  const r1 = resid()
  const ln2 = rect("RMSNorm", "norm", { sublabel: "pre-norm" })
  const router = rect(`Router top-${numExpertsPerToken} of ${numExperts}`, "moe", { sublabel: "sigmoid · no aux loss" })
  const experts = rect(`Expert FFN ×${numExpertsPerToken}`, "moe", { sublabel: "SwiGLU · no shared expert" })
  const r2 = resid()
  const lnf = rect("Final RMSNorm", "norm")
  const lmh = rect("LM Head", "out")

  const nodes = [input, emb, layerNote, ln1, attn, r1, ln2, router, experts, r2, lnf, lmh]
  const edges = [
    edge(input, emb),
    edge(emb, ln1),
    edge(ln1, attn),
    edge(attn, r1),
    residEdge(emb, r1),
    edge(r1, ln2),
    edge(ln2, router),
    edge(router, experts),
    edge(experts, r2),
    residEdge(r1, r2),
    edge(r2, lnf),
    edge(lnf, lmh),
  ]

  return <ReactFlowDiagram nodes={nodes} edges={edges} fit={p.fit} />
}
