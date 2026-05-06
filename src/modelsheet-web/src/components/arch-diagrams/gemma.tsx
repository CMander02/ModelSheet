import { ArchTreeDiagram, type TreeNode } from "../arch-tree-diagram"
import { type DiagramParams } from "./shared"

export default function GemmaDiagram(p: DiagramParams) {
  const { numHeads = 16, numKvHeads = 8, numLayers = 42, hiddenSize = 3584 } = p

  const nodes: TreeNode[] = [
    { id: "input", type: "leaf", label: "Input tokens", color: "input" },
    { id: "emb", type: "leaf", label: "Token Embedding", sub: "×√hiddenSize scaling", color: "emb" },
    {
      id: "block", type: "group", label: "Transformer Block", badge: `×${numLayers}`, color: "steel",
      sub: "Gemma 2: pre+post norm, logit soft-cap",
      children: [
        { id: "ln1", type: "leaf", label: "RMSNorm", sub: "pre-norm", color: "norm" },
        { id: "qknorm", type: "leaf", label: "QK-RMSNorm", sub: "per-head on Q and K", color: "norm" },
        { id: "attn", type: "leaf", label: `GQA  Q:${numHeads}  KV:${numKvHeads}`, sub: "RoPE · logit soft-cap (tanh)", color: "attn" },
        { id: "ln1post", type: "leaf", label: "RMSNorm", sub: "post-norm (Gemma 2)", color: "norm" },
        { id: "r1", type: "leaf", label: "+ residual", color: "resid" },
        { id: "ln2", type: "leaf", label: "RMSNorm", sub: "pre-norm", color: "norm" },
        { id: "ffn", type: "leaf", label: "GeGLU FFN", sub: "gate · up → GELU → down", color: "ffn" },
        { id: "ln2post", type: "leaf", label: "RMSNorm", sub: "post-norm (Gemma 2)", color: "norm" },
        { id: "r2", type: "leaf", label: "+ residual", color: "resid" },
      ],
    },
    { id: "lnf", type: "leaf", label: "Final RMSNorm", color: "norm" },
    { id: "cap", type: "leaf", label: "Logit Soft-Cap", sub: "tanh(x/30)×30", color: "out" },
    { id: "lmh", type: "leaf", label: "LM Head", sub: "tied to token emb", color: "out" },
  ]

  return (
    <ArchTreeDiagram
      nodes={nodes}
      subtitle={`hidden: ${hiddenSize.toLocaleString()} · no bias`}
    />
  )
}
