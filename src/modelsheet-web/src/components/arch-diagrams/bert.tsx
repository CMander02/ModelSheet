import { ArchTreeDiagram, type TreeNode } from "../arch-tree-diagram"
import { type DiagramParams } from "./shared"

export default function BertDiagram(p: DiagramParams) {
  const { numHeads = 12, numLayers = 12, hiddenSize = 768 } = p

  const nodes: TreeNode[] = [
    { id: "input", type: "leaf", label: "Input tokens", color: "input" },
    { id: "emb", type: "leaf", label: "Token + Position + Type Embedding", color: "emb" },
    { id: "drop", type: "leaf", label: "Dropout", color: "resid" },
    {
      id: "block", type: "group", label: "Encoder Block", badge: `×${numLayers}`, color: "steel",
      sub: `${numLayers} identical layers · bidirectional`,
      children: [
        { id: "attn", type: "leaf", label: `MHA  heads:${numHeads}`, sub: "bidirectional self-attention", color: "attn" },
        { id: "r1", type: "leaf", label: "+ residual", color: "resid" },
        { id: "ln1", type: "leaf", label: "LayerNorm", sub: "post-norm", color: "norm" },
        { id: "ffn", type: "leaf", label: "Feed Forward", sub: "Linear → GELU → Linear", color: "ffn" },
        { id: "r2", type: "leaf", label: "+ residual", color: "resid" },
        { id: "ln2", type: "leaf", label: "LayerNorm", sub: "post-norm", color: "norm" },
      ],
    },
    { id: "pool", type: "leaf", label: "[CLS] Pooler", sub: "Linear → Tanh", color: "out" },
  ]

  return (
    <ArchTreeDiagram
      nodes={nodes}
      subtitle={`hidden: ${hiddenSize.toLocaleString()} · heads: ${numHeads}`}
    />
  )
}
