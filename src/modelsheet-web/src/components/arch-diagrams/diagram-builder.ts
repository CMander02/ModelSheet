/**
 * Builder helpers for creating architecture diagram nodes & edges.
 * Reduces boilerplate across all 20+ model diagrams.
 */

import { type Node, type Edge } from "@xyflow/react"
import type { RFNodeType } from "./shared"
import { MAIN_EDGE, RESID_EDGE } from "./shared"

let _counter = 0
function id(): string {
  return `n${++_counter}`
}
function reset() {
  _counter = 0
}

// ─── Node factories ───────────────────────────────────────────────────────────

interface MakeNodeOpts {
  type?: RFNodeType
  sublabel?: string
  count?: number
  className?: string
  style?: Record<string, string>
  parentId?: string
}

export function makeNode(
  label: string,
  nodeType: RFNodeType,
  opts: MakeNodeOpts = {},
): Node {
  return {
    id: id(),
    type: nodeType,
    data: {
      nodeType,
      label,
      sublabel: opts.sublabel,
      count: opts.count,
      className: opts.className,
      style: opts.style as Record<string, unknown> | undefined,
    },
    parentId: opts.parentId,
  }
}

export function rect(label: string, nodeType: RFNodeType, opts?: MakeNodeOpts): Node {
  return makeNode(label, nodeType, { ...opts, type: "rect" })
}

export function pill(label: string, opts?: MakeNodeOpts): Node {
  return makeNode(label, "pill", opts)
}

export function note(label: string, opts?: MakeNodeOpts): Node {
  return makeNode(label, "note", opts)
}

export function resid(opts?: MakeNodeOpts): Node {
  return makeNode("+", "resid", opts)
}

export function block(label: string, count?: number, opts?: MakeNodeOpts): Node {
  return makeNode(label, "block", { ...opts, type: "block", count })
}

// ─── Edge factories ───────────────────────────────────────────────────────────

export function edge(from: Node, to: Node, label?: string): Edge {
  return {
    id: `${from.id}→${to.id}`,
    source: from.id,
    target: to.id,
    label: label,
    ...MAIN_EDGE,
  }
}

export function residEdge(from: Node, to: Node, label = "residual"): Edge {
  return {
    id: `${from.id}→${to.id}`,
    source: from.id,
    target: to.id,
    label,
    ...RESID_EDGE,
  }
}

// ─── Convenience: build a standard decoder chain ──────────────────────────────

export function buildDecoderChain(
  layerCount: number,
  steps: Array<{ node: Node; after?: Node[]; parallel?: Node[] }>,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []
  for (const s of steps) {
    nodes.push(s.node)
    if (s.after) {
      for (const a of s.after) {
        nodes.push(a)
      }
    }
  }
  // Connect sequentially
  for (let i = 0; i < steps.length - 1; i++) {
    const from = steps[i].node
    const to = steps[i + 1].node
    edges.push(edge(from, to))
  }
  return { nodes, edges }
}

// ─── Full build: create nodes + edges from a sequential list ──────────────────

export interface DiagramDefinition {
  nodes: Node[]
  edges: Edge[]
}

export function chain(
  ...items: Array<{ node: Node; edges?: Edge[]; parallel?: Node[] }>
): DiagramDefinition {
  const nodes: Node[] = []
  const edges: Edge[] = []

  for (const item of items) {
    nodes.push(item.node)
    if (item.edges) edges.push(...item.edges)
    if (item.parallel) {
      for (const p of item.parallel) {
        nodes.push(p)
      }
    }
  }

  // Sequential connections
  for (let i = 0; i < items.length - 1; i++) {
    const from = items[i].node
    const to = items[i + 1].node
    edges.push(edge(from, to))
  }

  return { nodes, edges }
}

export function seq(...nodes: Node[]): DiagramDefinition {
  const edges: Edge[] = []
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push(edge(nodes[i], nodes[i + 1]))
  }
  return { nodes, edges }
}

export function merge(...defs: DiagramDefinition[]): DiagramDefinition {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const seen = new Set<string>()
  for (const d of defs) {
    for (const n of d.nodes) {
      if (!seen.has(n.id)) {
        seen.add(n.id)
        nodes.push(n)
      }
    }
    edges.push(...d.edges)
  }
  return { nodes, edges }
}

export { reset as resetIds }
