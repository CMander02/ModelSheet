import { ArchTreeDiagram, type TreeNode } from "../arch-tree-diagram"
import { type DiagramParams } from "./shared"

export default function KimiK2Diagram(p: DiagramParams) {
  const { numLayers = 61, numExperts = 384, numSharedExperts = 1, numExpertsPerToken = 8 } = p

  const nodes: TreeNode[] = [
    { id: "input", type: "leaf", label: "Input tokens", color: "input" },
    { id: "emb", type: "leaf", label: "Token Embedding", color: "emb" },
    { id: "densenote", type: "leaf", label: "First 3 layers: Dense FFN", sub: "remaining layers use MoE", color: "steel" },
    {
      id: "block", type: "group", label: "Transformer Block", badge: `×${numLayers}`, color: "steel",
      sub: `${numLayers} layers · MLA-style attention · MoE FFN (after first 3)`,
      defaultExpanded: true,
      children: [
        { id: "ln1", type: "leaf", label: "RMSNorm", sub: "pre-norm", color: "norm" },
        {
          id: "mla", type: "group", label: "MLA-style Attention", color: "attn",
          sub: "low-rank KV compression · decoupled RoPE",
          children: [
            { id: "qlora", type: "leaf", label: "Q LoRA-style", sub: "down_proj → RMSNorm → up_proj", color: "attn" },
            { id: "kvlora", type: "leaf", label: "KV LoRA-style", sub: "kv_a_proj → RMSNorm → kv_b_proj", color: "attn" },
            { id: "rope", type: "leaf", label: "Decoupled RoPE", sub: "q_rope / k_rope only", color: "norm" },
            { id: "sdpa", type: "leaf", label: "Scaled Dot-Product Attn", color: "attn" },
            { id: "oproj", type: "leaf", label: "o_proj", color: "attn" },
          ],
        },
        { id: "r1", type: "leaf", label: "+ residual", color: "resid" },
        { id: "ln2", type: "leaf", label: "RMSNorm", sub: "pre-norm", color: "norm" },
        {
          id: "moe", type: "group", label: "MoE FFN", color: "teal",
          sub: `${numExperts} routed + ${numSharedExperts} shared · top-${numExpertsPerToken} · sigmoid`,
          children: [
            { id: "router", type: "leaf", label: `Router  top-${numExpertsPerToken} of ${numExperts}`, sub: "sigmoid + correction_bias · no aux loss", color: "moe" },
            {
              id: "experts_row", type: "row", children: [
                { id: "routed", type: "leaf", label: `Routed ×${numExpertsPerToken}`, sub: "SwiGLU", color: "moe" },
                { id: "shared", type: "leaf", label: `Shared ×${numSharedExperts}`, sub: "always active", color: "amber" },
              ],
            },
            { id: "moeadd", type: "leaf", label: "+ combine", color: "resid" },
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
      subtitle={`${numExperts} experts · top-${numExpertsPerToken} · ${numSharedExperts} shared · MLA-style KV`}
    />
  )
}
