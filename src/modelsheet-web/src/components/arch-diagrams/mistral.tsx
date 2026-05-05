import { ReactFlowDiagram } from "../react-flow-diagram"
import { type DiagramParams } from "./shared"
import { pill, rect, resid, note, edge, residEdge, resetIds } from "./diagram-builder"

export default function MistralDiagram(p: DiagramParams) {
  resetIds()
  const {numHeads = 32, numKvHeads = 8, hiddenSize = 4096, numExperts, numExpertsPerToken = 2 } = p
  const isMoE = numExperts && numExperts > 1

  const input = pill("Input tokens")
  const emb = rect("Token Embedding", "emb")
  const ln1 = rect("RMSNorm", "norm", { sublabel: "pre-norm" })
  const attn = rect(`GQA Q:${numHeads} KV:${numKvHeads}`, "attn", { sublabel: "RoPE · Sliding Window · no bias" })
  const r1 = resid()
  const ln2 = rect("RMSNorm", "norm", { sublabel: "pre-norm" })

  const nodes: ReturnType<typeof pill>[] = [input, emb, ln1, attn, r1, ln2]
  const edges = [
    edge(input, emb),
    edge(emb, ln1),
    edge(ln1, attn),
    edge(attn, r1),
    residEdge(emb, r1),
    edge(r1, ln2),
  ]

  if (isMoE) {
    const router = rect(`Router top-${numExpertsPerToken} of ${numExperts}`, "moe", { sublabel: "softmax" })
    const experts = rect(`Expert FFN ×${numExpertsPerToken}`, "moe", { sublabel: "SwiGLU" })
    const moeAdd = resid()
    const r2 = resid()
    const lnf = rect("Final RMSNorm", "norm")
    const lmh = rect("LM Head", "out")
    const info = note(`hidden: ${hiddenSize.toLocaleString()} · SWA window: 4096`)

    nodes.push(router, experts, moeAdd, r2, lnf, lmh, info)
    edges.push(
      edge(ln2, router),
      edge(router, experts),
      edge(experts, moeAdd),
      edge(moeAdd, r2),
      residEdge(r1, r2),
      edge(r2, lnf),
      edge(lnf, lmh),
    )
  } else {
    const ffn = rect("SwiGLU FFN", "ffn", { sublabel: "gate · up → SiLU → down" })
    const r2 = resid()
    const lnf = rect("Final RMSNorm", "norm")
    const lmh = rect("LM Head", "out")
    const info = note(`hidden: ${hiddenSize.toLocaleString()} · SWA window: 4096`)

    nodes.push(ffn, r2, lnf, lmh, info)
    edges.push(
      edge(ln2, ffn),
      edge(ffn, r2),
      residEdge(r1, r2),
      edge(r2, lnf),
      edge(lnf, lmh),
    )
  }

  return <ReactFlowDiagram nodes={nodes} edges={edges} fit={p.fit} />
}
