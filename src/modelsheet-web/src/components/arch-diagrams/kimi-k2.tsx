import { ReactFlowDiagram } from "../react-flow-diagram"
import { type DiagramParams } from "./shared"
import { pill, rect, resid, note, edge, residEdge, resetIds } from "./diagram-builder"

export default function KimiK2Diagram(p: DiagramParams) {
  resetIds()
  const {numExperts = 384, numSharedExperts = 1, numExpertsPerToken = 8 } = p

  const input = pill("Input tokens")
  const emb = rect("Token Embedding", "emb")
  const denseNote = note("First 3 layers: Dense FFN")

  const ln1 = rect("RMSNorm", "norm", { sublabel: "pre-norm" })
  const qLora = rect("Q LoRA-style", "attn", { sublabel: "down_proj → RMSNorm → up_proj" })
  const kvLora = rect("KV LoRA-style", "attn", { sublabel: "kv_a_proj → RMSNorm → kv_b_proj" })
  const rope = rect("Decoupled RoPE", "norm", { sublabel: "q_rope / k_rope only" })
  const sdpa = rect("Scaled Dot-Product Attn", "attn")
  const oproj = rect("o_proj", "attn")
  const r1 = resid()

  const ln2 = rect("RMSNorm", "norm", { sublabel: "pre-norm" })
  const router = rect(`Router top-${numExpertsPerToken} of ${numExperts}`, "moe", { sublabel: "sigmoid + correction_bias · no aux loss" })
  const experts = rect(`Routed FFN Experts ×${numExpertsPerToken}`, "moe", { sublabel: "SwiGLU" })
  const shared = rect(`Shared Expert ×${numSharedExperts}`, "moe", { sublabel: "always active" })
  const moeAdd = resid()
  const r2 = resid()

  const lnf = rect("Final RMSNorm", "norm")
  const lmh = rect("LM Head", "out")

  const nodes = [input, emb, denseNote, ln1, qLora, kvLora, rope, sdpa, oproj, r1, ln2, router, experts, shared, moeAdd, r2, lnf, lmh]
  const edges = [
    edge(input, emb),
    edge(emb, ln1),
    edge(ln1, qLora),
    edge(ln1, kvLora),
    edge(qLora, rope),
    edge(kvLora, rope),
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
