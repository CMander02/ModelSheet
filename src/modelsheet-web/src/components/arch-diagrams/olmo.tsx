import { ArchTreeDiagram, type TreeNode } from "../arch-tree-diagram"
import { type DiagramParams } from "./shared"

export default function OlmoDiagram(p: DiagramParams) {
  const { numHeads = 32, numKvHeads = 8, numLayers = 32, hiddenSize = 4096 } = p

  const nodes: TreeNode[] = [
    { id: "input", type: "leaf", label: "Input tokens", color: "input" },
    { id: "emb", type: "leaf", label: "Token Embedding", color: "emb" },
    {
      id: "block", type: "group", label: "Transformer Block", badge: `×${numLayers}`, color: "steel",
      sub: "fully open data + weights + code",
      children: [
        { id: "ln1", type: "leaf", label: "RMSNorm", sub: "pre-norm · attention_norm", color: "norm" },
        { id: "qknorm", type: "leaf", label: "QK-RMSNorm", sub: "per-head on Q/K before RoPE", color: "norm" },
        { id: "attn", type: "leaf", label: `GQA  Q:${numHeads}  KV:${numKvHeads}`, sub: "RoPE · no bias", color: "attn" },
        { id: "r1", type: "leaf", label: "+ residual", color: "resid" },
        { id: "ln2", type: "leaf", label: "RMSNorm", sub: "pre-norm · ffn_norm", color: "norm" },
        { id: "ffn", type: "leaf", label: "SwiGLU FFN", sub: "gate · up → SiLU → down", color: "ffn" },
        { id: "r2", type: "leaf", label: "+ residual", color: "resid" },
      ],
    },
    { id: "lnf", type: "leaf", label: "Final RMSNorm", color: "norm" },
    { id: "lmh", type: "leaf", label: "LM Head", sub: "tied to token emb", color: "out" },
  ]

  return (
    <ArchTreeDiagram
      nodes={nodes}
      subtitle={`hidden: ${hiddenSize.toLocaleString()} · OLMo 2 adds QK-RMSNorm`}
    />
  )
}
