import { ArchTreeDiagram, type TreeNode } from "../arch-tree-diagram"
import { type DiagramParams } from "./shared"

export default function LlamaDiagram(p: DiagramParams) {
  const { numHeads = 32, numKvHeads = 8, numLayers = 32, hiddenSize = 4096 } = p

  const nodes: TreeNode[] = [
    { id: "input", type: "leaf", label: "Input tokens", color: "input" },
    { id: "emb", type: "leaf", label: "Token Embedding", sub: "no learned pos emb · RoPE in attn", color: "emb" },
    {
      id: "block", type: "group", label: "Transformer Block", badge: `×${numLayers}`, color: "steel",
      sub: `${numLayers} identical layers`,
      children: [
        { id: "ln1", type: "leaf", label: "RMSNorm", sub: "pre-norm · input_layernorm", color: "norm" },
        { id: "attn", type: "leaf", label: `GQA  Q:${numHeads}  KV:${numKvHeads}`, sub: "RoPE · no bias", color: "attn" },
        { id: "r1", type: "leaf", label: "+ residual", color: "resid" },
        { id: "ln2", type: "leaf", label: "RMSNorm", sub: "pre-norm · post_attention_layernorm", color: "norm" },
        { id: "ffn", type: "leaf", label: "SwiGLU FFN", sub: "gate_proj · up_proj → SiLU → down_proj", color: "ffn" },
        { id: "r2", type: "leaf", label: "+ residual", color: "resid" },
      ],
    },
    { id: "lnf", type: "leaf", label: "Final RMSNorm", color: "norm" },
    { id: "lmh", type: "leaf", label: "LM Head", sub: "no weight tying in LLaMA 3", color: "out" },
  ]

  return (
    <ArchTreeDiagram
      nodes={nodes}
      subtitle={`hidden: ${hiddenSize.toLocaleString()} · rope_theta: 500000 (Llama 3)`}
    />
  )
}
