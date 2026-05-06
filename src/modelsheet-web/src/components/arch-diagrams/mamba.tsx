import { ArchTreeDiagram, type TreeNode } from "../arch-tree-diagram"
import { type DiagramParams } from "./shared"

export default function MambaDiagram(p: DiagramParams) {
  const { hiddenSize = 2560, numLayers = 64 } = p

  const nodes: TreeNode[] = [
    { id: "input", type: "leaf", label: "Input tokens", color: "input" },
    { id: "emb", type: "leaf", label: "Token Embedding", color: "emb" },
    {
      id: "block", type: "group", label: "Mamba Block", badge: `×${numLayers}`, color: "steel",
      sub: "no attention · SSM selective scan",
      children: [
        { id: "ln1", type: "leaf", label: "RMSNorm", sub: "pre-norm", color: "norm" },
        { id: "inproj", type: "leaf", label: "Input Projection", sub: "split → x and z", color: "attn" },
        { id: "conv1d", type: "leaf", label: "Conv1d", sub: "causal · depthwise", color: "attn" },
        { id: "silu1", type: "leaf", label: "SiLU", sub: "activation", color: "attn" },
        { id: "ssm", type: "leaf", label: "SSM Selective Scan", sub: "S6 · dt/A/B/C learned from x", color: "attn" },
        { id: "gate", type: "leaf", label: "× gate", sub: "silu(z) gating", color: "attn" },
        { id: "outproj", type: "leaf", label: "Output Projection", color: "attn" },
        { id: "r1", type: "leaf", label: "+ residual", color: "resid" },
      ],
    },
    { id: "lnf", type: "leaf", label: "Final RMSNorm", color: "norm" },
    { id: "lmh", type: "leaf", label: "LM Head", sub: "tied to token emb", color: "out" },
  ]

  return (
    <ArchTreeDiagram
      nodes={nodes}
      subtitle={`hidden: ${hiddenSize.toLocaleString()} · no attention · linear-time inference`}
    />
  )
}
