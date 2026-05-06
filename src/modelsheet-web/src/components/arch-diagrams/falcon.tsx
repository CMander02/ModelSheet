import { ArchTreeDiagram, type TreeNode } from "../arch-tree-diagram"
import { type DiagramParams } from "./shared"

export default function FalconDiagram(p: DiagramParams) {
  const { numHeads = 71, numKvHeads = 1, numLayers = 32, hiddenSize = 4544 } = p

  const nodes: TreeNode[] = [
    { id: "input", type: "leaf", label: "Input tokens", color: "input" },
    { id: "emb", type: "leaf", label: "Token Embedding", color: "emb" },
    {
      id: "block", type: "group", label: "Transformer Block", badge: `×${numLayers}`, color: "steel",
      sub: "Attention + FFN computed in parallel from same input",
      defaultExpanded: true,
      children: [
        { id: "ln1", type: "leaf", label: "LayerNorm", sub: "pre-norm · ln_attn", color: "norm" },
        {
          id: "parallel", type: "row", children: [
            { id: "attn", type: "leaf", label: `MQA  Q:${numHeads}  KV:${numKvHeads}`, sub: "RoPE · no bias · parallel", color: "attn" },
            { id: "ffn", type: "leaf", label: "FFN", sub: "Linear → GELU → Linear", color: "ffn" },
          ],
        },
        { id: "r1", type: "leaf", label: "+ residual (attn + FFN)", color: "resid" },
      ],
    },
    { id: "lnf", type: "leaf", label: "Final LayerNorm", color: "norm" },
    { id: "lmh", type: "leaf", label: "LM Head", sub: "tied to token emb", color: "out" },
  ]

  return (
    <ArchTreeDiagram
      nodes={nodes}
      subtitle={`hidden: ${hiddenSize.toLocaleString()} · parallel attn+FFN is Falcon key design`}
    />
  )
}
