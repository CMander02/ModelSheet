import { ArchTreeDiagram, type TreeNode } from "../arch-tree-diagram"
import { type DiagramParams } from "./shared"

export default function BaichuanDiagram(p: DiagramParams) {
  const { numHeads = 32, numLayers = 32, hiddenSize = 4096 } = p

  const nodes: TreeNode[] = [
    { id: "input", type: "leaf", label: "Input tokens", color: "input" },
    { id: "emb", type: "leaf", label: "Token Embedding", color: "emb" },
    {
      id: "block", type: "group", label: "Transformer Block", badge: `×${numLayers}`, color: "steel",
      sub: `${numLayers} identical layers`,
      children: [
        { id: "ln1", type: "leaf", label: "RMSNorm", sub: "pre-norm · input_layernorm", color: "norm" },
        { id: "attn", type: "leaf", label: `MHA  heads:${numHeads}`, sub: "RoPE (7B) or ALiBi (13B) · no bias", color: "attn" },
        { id: "r1", type: "leaf", label: "+ residual", color: "resid" },
        { id: "ln2", type: "leaf", label: "RMSNorm", sub: "pre-norm · post_attention_layernorm", color: "norm" },
        { id: "ffn", type: "leaf", label: "SwiGLU FFN", sub: "gate · up → SiLU → down", color: "ffn" },
        { id: "r2", type: "leaf", label: "+ residual", color: "resid" },
      ],
    },
    { id: "lnf", type: "leaf", label: "Final RMSNorm", color: "norm" },
    { id: "lmh", type: "leaf", label: "LM Head", color: "out" },
  ]

  return (
    <ArchTreeDiagram
      nodes={nodes}
      subtitle={`hidden: ${hiddenSize.toLocaleString()} · no bias`}
    />
  )
}
