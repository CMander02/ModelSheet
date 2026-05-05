/**
 * Shared types and layout helpers for all architecture diagrams.
 */

// ─── Public types (used by arch-diagram.tsx) ──────────────────────────────────

export interface DiagramParams {
  numLayers?:        number
  numHeads?:         number
  numKvHeads?:       number
  hiddenSize?:       number
  contextLength?:    number
  vocabSize?:        number
  intermediateSize?: number
  numExperts?:       number
  numSharedExperts?: number
  numExpertsPerToken?: number
  fit?:              boolean
}

// ─── React Flow node & edge types ─────────────────────────────────────────────

import {
  type Node,
  type Edge,
  MarkerType,
} from "@xyflow/react"

export type { Node, Edge }

export type RFNodeType = "rect" | "pill" | "resid" | "block" | "note"

/**
 * Visual style categories for coloring nodes.
 * Maps to keys in NODE_STYLES from react-flow-nodes.tsx
 */
export type VisualNodeType = "attn" | "emb" | "ffn" | "moe" | "norm" | "out" | "pool" | "resid" | "input" | "note" | "block"

declare module "@xyflow/react" {
  interface NodeData {
    [key: string]: unknown
    nodeType?: RFNodeType
    label?: string
    sublabel?: string
    count?: number
  }
}

let _nodeId = 0
export function nextId(prefix = "n"): string {
  return `${prefix}-${++_nodeId}`
}

export function resetIds() {
  _nodeId = 0
}

// ─── Layout using dagre ──────────────────────────────────────────────────────

import dagre from "@dagrejs/dagre"

const NODE_WIDTH = 200
const NODE_HEIGHT = 50
const RESID_SIZE = 28

export function getNodeDimensions(nodeType?: string): { w: number; h: number } {
  if (nodeType === "resid") return { w: RESID_SIZE, h: RESID_SIZE }
  if (nodeType === "pill") return { w: 160, h: 32 }
  if (nodeType === "note") return { w: 260, h: 32 }
  return { w: NODE_WIDTH, h: NODE_HEIGHT }
}

export interface LayoutOptions {
  rankSep?: number
  nodeSep?: number
  marginX?: number
  marginY?: number
}

export function layoutNodes(
  nodes: Node[],
  edges: Edge[],
  opts: LayoutOptions = {},
): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: "TB",
    ranksep: opts.rankSep ?? 70,
    nodesep: opts.nodeSep ?? 40,
    marginx: opts.marginX ?? 20,
    marginy: opts.marginY ?? 20,
  })

  for (const n of nodes) {
    const { w, h } = getNodeDimensions(n.data?.nodeType as string | undefined)
    g.setNode(n.id, { width: w, height: h })
  }

  for (const e of edges) {
    g.setEdge(e.source, e.target)
  }

  dagre.layout(g)

  return nodes.map(n => {
    const dagNode = g.node(n.id)
    if (!dagNode) return n
    const { w, h } = getNodeDimensions(n.data?.nodeType as string | undefined)
    return {
      ...n,
      position: {
        x: dagNode.x - w / 2,
        y: dagNode.y - h / 2,
      },
    }
  })
}

// ─── Shared edge style ────────────────────────────────────────────────────────

export const MAIN_EDGE = {
  style: { stroke: "#64748b", strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b", width: 16, height: 16 },
} as const

export const RESID_EDGE = {
  style: { stroke: "#94a3b8", strokeWidth: 1.5, strokeDasharray: "6 3" },
  markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8", width: 14, height: 14 },
} as const
