import { ReactFlowDiagram } from "../react-flow-diagram"
import { type DiagramParams } from "./shared"
import { pill, rect, resid, note, edge, residEdge, resetIds } from "./diagram-builder"

export default function DeepseekV2Diagram(p: DiagramParams) {
  resetIds()
  const {numExperts = 160, numSharedExperts = 2, numExpertsPerToken = 6 } = p

  const input = pill("Input tokens")
  const emb = rect("Token Embedding", "emb")
  const denseNote = note("First 1 layer: Dense FFN")

  const ln1 = rect("RMSNorm", "norm", { sublabel: "pre-norm" })
  const qPath = rect("Q Projection", "attn", { sublabel: "proj → RMSNorm → proj → split nope/rope" })
  const kvPath = rect("KV Projection", "attn", { sublabel: "proj → split → RMSNorm → proj" })
  const rope = rect("Decoupled RoPE", "norm", { sublabel: "on rope dims only" })
  const sdpa = rect("Scaled Dot-Product Attn", "attn")
  const oproj = rect("o_proj", "attn")
  const r1 = resid()

  const ln2 = rect("RMSNorm", "norm", { sublabel: "pre-norm" })
  const router = rect(`Router top-${numExpertsPerToken} of ${numExperts}`, "moe", { sublabel: "group-limited" })
  const experts = rect(`Routed Experts ×${numExpertsPerToken}`, "moe", { sublabel: "SwiGLU" })
  const shared = rect(`Shared Experts ×${numSharedExperts}`, "moe", { sublabel: "always active" })
  const moeAdd = resid()
  const r2 = resid()

  const lnf = rect("Final RMSNorm", "norm")
  const lmh = rect("LM Head", "out")

  const nodes = [input, emb, denseNote, ln1, qPath, kvPath, rope, sdpa, oproj, r1, ln2, router, experts, shared, moeAdd, r2, lnf, lmh]
  const edges = [
    edge(input, emb),
    edge(emb, ln1),
    edge(ln1, qPath),
    edge(ln1, kvPath),
    edge(qPath, rope),
    edge(kvPath, rope),
    edge(rope, sdpa),
    edge(sdpa, oproj),
    edge(oproj, r1),
    residEdge(emb, r1),
    edge(r1, ln2),
    edge(ln2, router),
    edge(router, experts),
    edge(experts, moeAdd),
    edge(ln2, shared),
    edge(shared, moeAdd),
    edge(moeAdd, r2),
    residEdge(r1, r2),
    edge(r2, lnf),
    edge(lnf, lmh),
  ]

  return <ReactFlowDiagram nodes={nodes} edges={edges} fit={p.fit} />
}
