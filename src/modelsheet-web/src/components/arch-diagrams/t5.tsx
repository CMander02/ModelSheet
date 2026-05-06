import { ArchTreeDiagram, type TreeNode } from "../arch-tree-diagram"
import { type DiagramParams } from "./shared"

export default function T5Diagram(p: DiagramParams) {
  const { numHeads = 32, numLayers = 24, hiddenSize = 2048 } = p

  const nodes: TreeNode[] = [
    {
      id: "encoder", type: "group", label: "Encoder", color: "emb",
      sub: "Bidirectional · Relative Attention Bias",
      defaultExpanded: true,
      children: [
        { id: "inputenc", type: "leaf", label: "Encoder Input tokens", color: "input" },
        { id: "embenc", type: "leaf", label: "Encoder Token Embedding", sub: "weight-tied", color: "emb" },
        {
          id: "encblock", type: "group", label: "Encoder Block", badge: `×${numLayers}`, color: "steel",
          sub: `${numLayers} identical layers`,
          children: [
            { id: "encln1", type: "leaf", label: "RMSNorm", sub: "pre-norm", color: "norm" },
            { id: "encattn", type: "leaf", label: `MHA  heads:${numHeads}`, sub: "Relative Attention Bias · no RoPE", color: "attn" },
            { id: "encr1", type: "leaf", label: "+ residual", color: "resid" },
            { id: "encln2", type: "leaf", label: "RMSNorm", sub: "pre-norm", color: "norm" },
            { id: "encffn", type: "leaf", label: "SwiGLU FFN", sub: "wi_0 · wi_1 → GELU → wo", color: "ffn" },
            { id: "encr2", type: "leaf", label: "+ residual", color: "resid" },
          ],
        },
        { id: "enclnf", type: "leaf", label: "Encoder Final RMSNorm", color: "norm" },
      ],
    },
    {
      id: "decoder", type: "group", label: "Decoder", color: "out",
      sub: "Causal + Cross-Attention",
      defaultExpanded: true,
      children: [
        { id: "inputdec", type: "leaf", label: "Decoder Input tokens", color: "input" },
        { id: "embdec", type: "leaf", label: "Decoder Token Embedding", sub: "weight-tied", color: "emb" },
        {
          id: "decblock", type: "group", label: "Decoder Block", badge: `×${numLayers}`, color: "steel",
          sub: `${numLayers} identical layers`,
          children: [
            { id: "decln1", type: "leaf", label: "RMSNorm", sub: "pre-norm", color: "norm" },
            { id: "decsattn", type: "leaf", label: "Causal Self-Attention", sub: "Relative Attention Bias", color: "attn" },
            { id: "decr1", type: "leaf", label: "+ residual", color: "resid" },
            { id: "decln2", type: "leaf", label: "RMSNorm", sub: "pre-norm", color: "norm" },
            { id: "deccattn", type: "leaf", label: "Cross-Attention", sub: "Q from decoder · KV from encoder output", color: "attn" },
            { id: "decr2", type: "leaf", label: "+ residual", color: "resid" },
            { id: "decln3", type: "leaf", label: "RMSNorm", sub: "pre-norm", color: "norm" },
            { id: "decffn", type: "leaf", label: "SwiGLU FFN", color: "ffn" },
            { id: "decr3", type: "leaf", label: "+ residual", color: "resid" },
          ],
        },
        { id: "declnf", type: "leaf", label: "Decoder Final RMSNorm", color: "norm" },
        { id: "lmh", type: "leaf", label: "LM Head", sub: "tied to token emb", color: "out" },
      ],
    },
  ]

  return (
    <ArchTreeDiagram
      nodes={nodes}
      subtitle={`hidden: ${hiddenSize.toLocaleString()} · no bias · weight-tied emb/LM head`}
    />
  )
}
