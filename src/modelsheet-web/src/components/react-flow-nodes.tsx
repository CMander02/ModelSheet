/**
 * Custom React Flow node components for ModelSheet architecture diagrams.
 * Each node type corresponds to a Mermaid classDef style.
 */

import { type Node, type NodeProps, Handle, Position } from "@xyflow/react"

// ─── Color map ────────────────────────────────────────────────────────────────

export const NODE_STYLES = {
  norm: { bg: "#fef9c3", border: "#facc15", text: "#713f12", label: "Norm" },
  attn: { bg: "#1e293b", border: "#334155", text: "#f1f5f9", label: "Attention" },
  ffn:  { bg: "#dcfce7", border: "#4ade80", text: "#14532d", label: "FFN" },
  emb:  { bg: "#dbeafe", border: "#60a5fa", text: "#1e3a8a", label: "Embed" },
  out:  { bg: "#fee2e2", border: "#f87171", text: "#7f1d1d", label: "Output" },
  pool: { bg: "#fce7f3", border: "#f0abfc", text: "#701a75", label: "Pool" },
  moe:  { bg: "#ede9fe", border: "#a78bfa", text: "#4c1d95", label: "MoE" },
  resid:{ bg: "#ffffff", border: "#94a3b8", text: "#475569", label: "Residual" },
  input:{ bg: "#f8fafc", border: "#cbd5e1", text: "#64748b", label: "Input" },
} as const

export type NodeType = keyof typeof NODE_STYLES

interface BaseNodeData {
  label: string
  sublabel?: string
  nodeType: NodeType
  [key: string]: unknown
}

type RectFlowNode = Node<BaseNodeData>

// ─── Rectangle node (default) ────────────────────────────────────────────────

export function RectNode({ data }: NodeProps<RectFlowNode>) {
  const style = NODE_STYLES[data.nodeType]
  return (
    <div
      className="rounded-lg px-4 py-2.5 text-xs font-mono leading-tight shadow-sm border select-none"
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
        color: style.text,
        borderWidth: 1.5,
        maxWidth: 220,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-border !w-2 !h-2" />
      <div className="font-semibold whitespace-nowrap">{data.label}</div>
      {data.sublabel && (
        <div className="text-[10px] opacity-70 mt-0.5 whitespace-nowrap">{data.sublabel}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-border !w-2 !h-2" />
    </div>
  )
}

// ─── Pill node (for input/output tokens) ──────────────────────────────────────

export function PillNode({ data }: NodeProps<RectFlowNode>) {
  const style = NODE_STYLES[data.nodeType]
  return (
    <div
      className="rounded-full px-5 py-2 text-xs font-mono font-semibold border select-none"
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
        color: style.text,
        borderWidth: 1.5,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-border !w-2 !h-2" />
      {data.label}
      <Handle type="source" position={Position.Bottom} className="!bg-border !w-2 !h-2" />
    </div>
  )
}

// ─── Residual add node (circle) ──────────────────────────────────────────────

export function ResidNode({ data }: NodeProps<RectFlowNode>) {
  const style = NODE_STYLES[data.nodeType]
  return (
    <div
      className="rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold border select-none"
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
        color: style.text,
        borderWidth: 1.5,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-border !w-2 !h-2" />
      +
      <Handle type="source" position={Position.Bottom} className="!bg-border !w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!bg-border !w-2 !h-2" />
    </div>
  )
}

// ─── Block group wrapper ──────────────────────────────────────────────────────

interface BlockNodeData {
  label: string
  count?: number
  [key: string]: unknown
}

type BlockFlowNode = Node<BlockNodeData>

export function BlockNode({ data }: NodeProps<BlockFlowNode>) {
  return (
    <div
      className="rounded-xl border-2 border-dashed p-3 pt-7 bg-muted/10 select-none relative"
      style={{ borderColor: "#94a3b8", minWidth: 240, minHeight: 100 }}
    >
      <div className="absolute top-2 left-3 text-[11px] font-semibold text-muted-foreground tracking-wide">
        {data.label}{data.count ? ` ×${data.count}` : ""}
      </div>
      {/* Children are rendered as separate React Flow nodes positioned inside */}
    </div>
  )
}

// ─── Note node (info text) ────────────────────────────────────────────────────

interface NoteNodeData {
  label: string
  [key: string]: unknown
}

type NoteFlowNode = Node<NoteNodeData>

export function NoteNode({ data }: NodeProps<NoteFlowNode>) {
  return (
    <div
      className="text-[10px] text-muted-foreground italic select-none px-2 py-1 border border-dashed rounded"
      style={{ borderColor: "#94a3b8" }}
    >
      {data.label}
    </div>
  )
}

// ─── Node type registry ──────────────────────────────────────────────────────

export const NODE_TYPES = {
  rect: RectNode,
  pill: PillNode,
  resid: ResidNode,
  block: BlockNode,
  note: NoteNode,
} as const
