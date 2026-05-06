import { ArchTreeDiagram, type TreeNode } from "../arch-tree-diagram"
import { type DiagramParams } from "./shared"

export default function Gpt2Diagram(p: DiagramParams) {
  const { numHeads = 12, numLayers = 12, hiddenSize = 768, vocabSize = 50257 } = p

  const nodes: TreeNode[] = [
    { id: "input", type: "leaf", label: "Input tokens", color: "input" },
    { id: "emb", type: "leaf", label: "Token + Position Embedding", sub: "Learned positional emb", color: "emb" },
    {
      id: "block", type: "group", label: "Transformer Block", badge: `×${numLayers}`, color: "steel",
      sub: `${numLayers} identical layers · causal`,
      children: [
        { id: "ln1", type: "leaf", label: "LayerNorm", sub: "pre-norm", color: "norm" },
        { id: "attn", type: "leaf", label: `Fused QKV Attention  heads:${numHeads}`, sub: "Conv1D · causal mask", color: "attn" },
        { id: "r1", type: "leaf", label: "+ residual", color: "resid" },
        { id: "ln2", type: "leaf", label: "LayerNorm", sub: "pre-norm", color: "norm" },
        { id: "ffn", type: "leaf", label: "FFN", sub: "Linear → GELU → Linear", color: "ffn" },
        { id: "r2", type: "leaf", label: "+ residual", color: "resid" },
      ],
    },
    { id: "lnf", type: "leaf", label: "Final LayerNorm", color: "norm" },
    { id: "lmh", type: "leaf", label: "LM Head", sub: `vocab: ${vocabSize.toLocaleString()} · tied to token emb`, color: "out" },
  ]

  return (
    <ArchTreeDiagram
      nodes={nodes}
      subtitle={`hidden: ${hiddenSize.toLocaleString()} · weight-tied LM head · no bias`}
    />
  )
}
