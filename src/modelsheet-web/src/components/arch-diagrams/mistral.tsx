import { ArchTreeDiagram, type TreeNode } from "../arch-tree-diagram"
import { type DiagramParams } from "./shared"

export default function MistralDiagram(p: DiagramParams) {
  const { numHeads = 32, numKvHeads = 8, numLayers = 32, hiddenSize = 4096, numExperts, numExpertsPerToken = 2 } = p
  const isMoE = numExperts && numExperts > 1

  const ffnChildren: TreeNode[] = isMoE
    ? [
        { id: "router", type: "leaf", label: `Router  top-${numExpertsPerToken} of ${numExperts}`, sub: "softmax routing", color: "moe" },
        { id: "experts", type: "leaf", label: `Expert FFN ×${numExpertsPerToken}`, sub: "SwiGLU", color: "moe" },
        { id: "moeadd", type: "leaf", label: "+ combine", color: "resid" },
      ]
    : [
        { id: "ffn", type: "leaf", label: "SwiGLU FFN", sub: "gate · up → SiLU → down", color: "ffn" },
      ]

  const nodes: TreeNode[] = [
    { id: "input", type: "leaf", label: "Input tokens", color: "input" },
    { id: "emb", type: "leaf", label: "Token Embedding", color: "emb" },
    {
      id: "block", type: "group", label: "Transformer Block", badge: `×${numLayers}`, color: "steel",
      sub: `${numLayers} layers · sliding window attn`,
      children: [
        { id: "ln1", type: "leaf", label: "RMSNorm", sub: "pre-norm", color: "norm" },
        { id: "attn", type: "leaf", label: `GQA  Q:${numHeads}  KV:${numKvHeads}`, sub: "RoPE · Sliding Window · no bias", color: "attn" },
        { id: "r1", type: "leaf", label: "+ residual", color: "resid" },
        { id: "ln2", type: "leaf", label: "RMSNorm", sub: "pre-norm", color: "norm" },
        ...ffnChildren,
        { id: "r2", type: "leaf", label: "+ residual", color: "resid" },
      ],
    },
    { id: "lnf", type: "leaf", label: "Final RMSNorm", color: "norm" },
    { id: "lmh", type: "leaf", label: "LM Head", color: "out" },
  ]

  return (
    <ArchTreeDiagram
      nodes={nodes}
      subtitle={`hidden: ${hiddenSize.toLocaleString()} · SWA window: 4096`}
    />
  )
}
