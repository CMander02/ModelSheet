import { ArchTreeDiagram, type TreeNode } from "../arch-tree-diagram"
import { type DiagramParams } from "./shared"

export default function BloomDiagram(p: DiagramParams) {
  const { numHeads = 112, numLayers = 70, hiddenSize = 14336 } = p

  const nodes: TreeNode[] = [
    { id: "input", type: "leaf", label: "Input tokens", color: "input" },
    { id: "emb", type: "leaf", label: "Token Embedding", color: "emb" },
    { id: "embln", type: "leaf", label: "Embedding LayerNorm", sub: "post-embedding · unique to BLOOM", color: "norm" },
    {
      id: "block", type: "group", label: "Transformer Block", badge: `×${numLayers}`, color: "steel",
      sub: `${numLayers} identical layers`,
      children: [
        { id: "ln1", type: "leaf", label: "LayerNorm", sub: "pre-norm · input_layernorm", color: "norm" },
        { id: "attn", type: "leaf", label: `MHA  heads:${numHeads}`, sub: "ALiBi bias · no RoPE · with bias", color: "attn" },
        { id: "r1", type: "leaf", label: "+ residual", color: "resid" },
        { id: "ln2", type: "leaf", label: "LayerNorm", sub: "pre-norm · post_attention_layernorm", color: "norm" },
        { id: "ffn", type: "leaf", label: "FFN", sub: "Linear → GELU → Linear · with bias", color: "ffn" },
        { id: "r2", type: "leaf", label: "+ residual", color: "resid" },
      ],
    },
    { id: "lnf", type: "leaf", label: "Final LayerNorm", color: "norm" },
    { id: "lmh", type: "leaf", label: "LM Head", sub: "tied to token emb", color: "out" },
  ]

  return (
    <ArchTreeDiagram
      nodes={nodes}
      subtitle={`hidden: ${hiddenSize.toLocaleString()} · ALiBi: learned distance bias in attn logits`}
    />
  )
}
