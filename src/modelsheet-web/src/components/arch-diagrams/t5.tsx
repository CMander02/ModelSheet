import { ReactFlowDiagram } from "../react-flow-diagram"
import { type DiagramParams } from "./shared"
import { pill, rect, resid, note, edge, residEdge, resetIds } from "./diagram-builder"

export default function T5Diagram(p: DiagramParams) {
  resetIds()
  const {numHeads = 32, hiddenSize = 2048 } = p

  // ─── Encoder ──────────────────────────────────────────────────────────────
  const inputEnc = pill("Encoder Input tokens")
  const embEnc = rect("Encoder Token Embedding", "emb", { sublabel: "weight-tied" })
  const encLn1 = rect("RMSNorm", "norm", { sublabel: "pre-norm" })
  const encAttn = rect(`MHA · ${numHeads} heads`, "attn", { sublabel: "Relative Attention Bias · no RoPE" })
  const encR1 = resid()
  const encLn2 = rect("RMSNorm", "norm", { sublabel: "pre-norm" })
  const encFfn = rect("SwiGLU FFN", "ffn", { sublabel: "wi_0 · wi_1 → GELU → wo" })
  const encR2 = resid()
  const encLnf = rect("Encoder Final RMSNorm", "norm")

  // ─── Decoder ──────────────────────────────────────────────────────────────
  const inputDec = pill("Decoder Input tokens")
  const embDec = rect("Decoder Token Embedding", "emb", { sublabel: "weight-tied" })
  const decLn1 = rect("RMSNorm", "norm", { sublabel: "pre-norm" })
  const decSattn = rect("Causal Self-Attention", "attn", { sublabel: "Relative Attention Bias" })
  const decR1 = resid()
  const decLn2 = rect("RMSNorm", "norm", { sublabel: "pre-norm" })
  const decCattn = rect("Cross-Attention", "attn", { sublabel: "Q from decoder · KV from encoder" })
  const decR2 = resid()
  const decLn3 = rect("RMSNorm", "norm", { sublabel: "pre-norm" })
  const decFfn = rect("SwiGLU FFN", "ffn")
  const decR3 = resid()
  const decLnf = rect("Decoder Final RMSNorm", "norm")
  const lmh = rect("LM Head", "out", { sublabel: "tied to token emb" })
  const info = note(`hidden: ${hiddenSize.toLocaleString()} · no bias · weight-tied emb/LM head`)

  const nodes = [
    inputEnc, embEnc, encLn1, encAttn, encR1, encLn2, encFfn, encR2, encLnf,
    inputDec, embDec, decLn1, decSattn, decR1, decLn2, decCattn, decR2, decLn3, decFfn, decR3, decLnf, lmh,
    info,
  ]

  const edges = [
    // Encoder chain
    edge(inputEnc, embEnc),
    edge(embEnc, encLn1),
    edge(encLn1, encAttn),
    edge(encAttn, encR1),
    edge(encR1, encLn2),
    edge(encLn2, encFfn),
    edge(encFfn, encR2),
    edge(encR2, encLnf),
    // Encoder residual
    residEdge(embEnc, encR1),
    residEdge(encR1, encR2),

    // Decoder chain
    edge(inputDec, embDec),
    edge(embDec, decLn1),
    edge(decLn1, decSattn),
    edge(decSattn, decR1),
    edge(decR1, decLn2),
    edge(decLn2, decCattn),
    edge(decCattn, decR2),
    edge(decR2, decLn3),
    edge(decLn3, decFfn),
    edge(decFfn, decR3),
    edge(decR3, decLnf),
    edge(decLnf, lmh),
    // Decoder residual
    residEdge(embDec, decR1),
    residEdge(decR1, decR2),
    residEdge(decR2, decR3),

    // Cross-attention: encoder → decoder
    edge(encLnf, decCattn),
  ]

  return <ReactFlowDiagram nodes={nodes} edges={edges} fit={p.fit} />
}
