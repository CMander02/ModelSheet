import { ArchTreeDiagram, type TreeNode } from "../arch-tree-diagram"
import { type DiagramParams } from "./shared"

export default function Llama4Diagram(p: DiagramParams) {
  const { numLayers = 48, numExperts = 128, numExpertsPerToken = 1 } = p

  const nodes: TreeNode[] = [
    { id: "input", type: "leaf", label: "Input tokens", color: "input" },
    { id: "emb", type: "leaf", label: "Token Embedding", color: "emb" },
    {
      id: "block", type: "group", label: "Transformer Block", badge: `×${numLayers}`, color: "steel",
      sub: "Layers alternate: full-attn every 4th, chunk-attn others",
      children: [
        { id: "ln1", type: "leaf", label: "RMSNorm", sub: "pre-norm", color: "norm" },
        { id: "attn", type: "leaf", label: "Attention", sub: "NoPE or iRoPE · interleaved per layer", color: "attn" },
        { id: "r1", type: "leaf", label: "+ residual", color: "resid" },
        { id: "ln2", type: "leaf", label: "RMSNorm", sub: "pre-norm", color: "norm" },
        {
          id: "moe", type: "group", label: "MoE FFN", color: "teal",
          sub: `${numExperts} experts · sigmoid routing · no aux loss · no shared expert`,
          children: [
            { id: "router", type: "leaf", label: `Router  top-${numExpertsPerToken} of ${numExperts}`, sub: "sigmoid · no aux loss", color: "moe" },
            { id: "experts", type: "leaf", label: `Expert FFN ×${numExpertsPerToken}`, sub: "SwiGLU · no shared expert", color: "moe" },
          ],
        },
        { id: "r2", type: "leaf", label: "+ residual", color: "resid" },
      ],
    },
    { id: "lnf", type: "leaf", label: "Final RMSNorm", color: "norm" },
    { id: "lmh", type: "leaf", label: "LM Head", color: "out" },
  ]

  return (
    <ArchTreeDiagram
      nodes={nodes}
      subtitle={`${numExperts} experts · top-${numExpertsPerToken} routing · iRoPE alternating layers`}
    />
  )
}
