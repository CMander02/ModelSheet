import { ArchTreeDiagram, type TreeNode } from "../arch-tree-diagram"
import { type DiagramParams } from "./shared"

export default function DeepseekV2Diagram(p: DiagramParams) {
  const { numLayers = 60, numExperts = 160, numSharedExperts = 2, numExpertsPerToken = 6 } = p

  const nodes: TreeNode[] = [
    { id: "input", type: "leaf", label: "Input tokens", color: "input" },
    { id: "emb", type: "leaf", label: "Token Embedding", color: "emb" },
    { id: "densenote", type: "leaf", label: "First 1 layer: Dense FFN", sub: "then MoE for remaining layers", color: "steel" },
    {
      id: "block", type: "group", label: "Transformer Block", badge: `×${numLayers}`, color: "steel",
      sub: `${numLayers} layers · MLA attention · MoE FFN`,
      defaultExpanded: true,
      children: [
        { id: "ln1", type: "leaf", label: "RMSNorm", sub: "pre-norm", color: "norm" },
        {
          id: "mla", type: "group", label: "MLA (Multi-head Latent Attention)", color: "attn",
          sub: "KV cache compression via low-rank projection",
          children: [
            { id: "qpath", type: "leaf", label: "Q Projection", sub: "proj → RMSNorm → proj → split nope/rope", color: "attn" },
            { id: "kvpath", type: "leaf", label: "KV Projection", sub: "proj → split → RMSNorm → proj", color: "attn" },
            { id: "rope", type: "leaf", label: "Decoupled RoPE", sub: "on rope dims only", color: "norm" },
            { id: "sdpa", type: "leaf", label: "Scaled Dot-Product Attn", color: "attn" },
            { id: "oproj", type: "leaf", label: "o_proj", color: "attn" },
          ],
        },
        { id: "r1", type: "leaf", label: "+ residual", color: "resid" },
        { id: "ln2", type: "leaf", label: "RMSNorm", sub: "pre-norm", color: "norm" },
        {
          id: "moe", type: "group", label: "MoE FFN", color: "teal",
          sub: `${numExperts} routed + ${numSharedExperts} shared · top-${numExpertsPerToken}`,
          children: [
            { id: "router", type: "leaf", label: `Router  top-${numExpertsPerToken} of ${numExperts}`, sub: "group-limited softmax", color: "moe" },
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
      subtitle={`${numExperts} experts · top-${numExpertsPerToken} · ${numSharedExperts} shared · MLA KV compression`}
    />
  )
}
