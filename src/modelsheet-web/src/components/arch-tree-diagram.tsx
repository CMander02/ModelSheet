/**
 * Pure-React architecture diagram renderer.
 * No external diagram libraries — only React + inline styles.
 * Supports light/dark theme via class on <html>.
 */

import { useState, useEffect, useCallback } from "react"

// ─── Theme detection ──────────────────────────────────────────────────────────

function useDark() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  )
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark"))
    )
    obs.observe(document.documentElement, { attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])
  return dark
}

// ─── Color palette (dark + light variants) ────────────────────────────────────

export type TreeColor =
  | "attn" | "ffn" | "norm" | "emb" | "out" | "moe" | "resid" | "input"
  | "cyan" | "purple" | "green" | "steel" | "orange" | "sky" | "blue"
  | "indigo" | "teal" | "amber" | "pink" | "violet"

interface ColorToken { border: string; bg: string; text: string }

const DARK: Record<TreeColor, ColorToken> = {
  attn:   { border: "#60a5fa", bg: "#071224", text: "#bfdbfe" },
  ffn:    { border: "#4ade80", bg: "#061c0d", text: "#bbf7d0" },
  norm:   { border: "#fbbf24", bg: "#201500", text: "#fde68a" },
  emb:    { border: "#818cf8", bg: "#0c0c26", text: "#c7d2fe" },
  out:    { border: "#f472b6", bg: "#22071c", text: "#fbcfe8" },
  moe:    { border: "#2dd4bf", bg: "#071e1e", text: "#99f6e4" },
  resid:  { border: "#475569", bg: "#0e1420", text: "#94a3b8" },
  input:  { border: "#22d3ee", bg: "#071f24", text: "#a5f3fc" },
  cyan:   { border: "#22d3ee", bg: "#071f24", text: "#a5f3fc" },
  purple: { border: "#a78bfa", bg: "#160d32", text: "#ddd6fe" },
  green:  { border: "#4ade80", bg: "#061c0d", text: "#bbf7d0" },
  steel:  { border: "#475569", bg: "#0e1420", text: "#94a3b8" },
  orange: { border: "#fb923c", bg: "#250f00", text: "#fed7aa" },
  sky:    { border: "#38bdf8", bg: "#071a2c", text: "#bae6fd" },
  blue:   { border: "#60a5fa", bg: "#071224", text: "#bfdbfe" },
  indigo: { border: "#818cf8", bg: "#0c0c26", text: "#c7d2fe" },
  teal:   { border: "#2dd4bf", bg: "#071e1e", text: "#99f6e4" },
  amber:  { border: "#fbbf24", bg: "#201500", text: "#fde68a" },
  pink:   { border: "#f472b6", bg: "#22071c", text: "#fbcfe8" },
  violet: { border: "#c084fc", bg: "#140824", text: "#e9d5ff" },
}

// Light mode: softer backgrounds, darker text, keep vivid borders
const LIGHT: Record<TreeColor, ColorToken> = {
  attn:   { border: "#3b82f6", bg: "#eff6ff", text: "#1e3a8a" },
  ffn:    { border: "#22c55e", bg: "#f0fdf4", text: "#14532d" },
  norm:   { border: "#d97706", bg: "#fffbeb", text: "#78350f" },
  emb:    { border: "#6366f1", bg: "#eef2ff", text: "#3730a3" },
  out:    { border: "#ec4899", bg: "#fdf2f8", text: "#831843" },
  moe:    { border: "#0d9488", bg: "#f0fdfa", text: "#134e4a" },
  resid:  { border: "#64748b", bg: "#f8fafc", text: "#334155" },
  input:  { border: "#06b6d4", bg: "#ecfeff", text: "#164e63" },
  cyan:   { border: "#06b6d4", bg: "#ecfeff", text: "#164e63" },
  purple: { border: "#7c3aed", bg: "#f5f3ff", text: "#4c1d95" },
  green:  { border: "#22c55e", bg: "#f0fdf4", text: "#14532d" },
  steel:  { border: "#64748b", bg: "#f8fafc", text: "#334155" },
  orange: { border: "#ea580c", bg: "#fff7ed", text: "#7c2d12" },
  sky:    { border: "#0284c7", bg: "#f0f9ff", text: "#0c4a6e" },
  blue:   { border: "#3b82f6", bg: "#eff6ff", text: "#1e3a8a" },
  indigo: { border: "#6366f1", bg: "#eef2ff", text: "#3730a3" },
  teal:   { border: "#0d9488", bg: "#f0fdfa", text: "#134e4a" },
  amber:  { border: "#d97706", bg: "#fffbeb", text: "#78350f" },
  pink:   { border: "#ec4899", bg: "#fdf2f8", text: "#831843" },
  violet: { border: "#7c3aed", bg: "#f5f3ff", text: "#4c1d95" },
}

// ─── Tree node types ──────────────────────────────────────────────────────────

export interface LeafNode {
  id: string
  type: "leaf"
  label: string
  sub?: string
  color: TreeColor
}

export interface GroupNode {
  id: string
  type: "group"
  label: string
  badge?: string
  sub?: string
  color: TreeColor
  children: TreeNode[]
  defaultExpanded?: boolean
}

export interface RowNode {
  id: string
  type: "row"
  children: Array<LeafNode | GroupNode>
}

export type TreeNode = LeafNode | GroupNode | RowNode

// ─── State helpers ────────────────────────────────────────────────────────────

function allGroupIds(nodes: TreeNode[]): string[] {
  const ids: string[] = []
  for (const n of nodes) {
    if (n.type === "group") {
      ids.push(n.id)
      ids.push(...allGroupIds(n.children))
    } else if (n.type === "row") {
      ids.push(...allGroupIds(n.children))
    }
  }
  return ids
}

function findGroup(nodes: TreeNode[], id: string): GroupNode | null {
  for (const n of nodes) {
    if (n.id === id && n.type === "group") return n
    if (n.type === "group") {
      const found = findGroup(n.children, id)
      if (found) return found
    } else if (n.type === "row") {
      const found = findGroup(n.children, id)
      if (found) return found
    }
  }
  return null
}

function collectDefaults(nodes: TreeNode[]): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const n of nodes) {
    if (n.type === "group") {
      if (n.defaultExpanded) out[n.id] = true
      Object.assign(out, collectDefaults(n.children))
    } else if (n.type === "row") {
      Object.assign(out, collectDefaults(n.children))
    }
  }
  return out
}

// ─── Connector line ───────────────────────────────────────────────────────────

function Conn({ color }: { color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", height: 10 }}>
      <div style={{ width: 2, background: color, opacity: 0.35, borderRadius: 1 }} />
    </div>
  )
}

// ─── Leaf node ────────────────────────────────────────────────────────────────

function Leaf({ node, compact, palette }: { node: LeafNode; compact?: boolean; palette: typeof DARK }) {
  const [hov, setHov] = useState(false)
  const [showTip, setShowTip] = useState(false)
  const col = palette[node.color] ?? palette.steel

  return (
    <div
      style={{ position: "relative", flex: compact ? 1 : undefined, minWidth: compact ? 60 : undefined }}
      onMouseEnter={() => { setHov(true); setShowTip(true) }}
      onMouseLeave={() => { setHov(false); setShowTip(false) }}
    >
      <div style={{
        border: `1.5px solid ${hov ? col.border : col.border + "99"}`,
        borderRadius: 7,
        background: hov ? col.border + "1a" : col.bg,
        padding: compact ? "4px 8px" : "7px 16px",
        color: col.text,
        textAlign: "center",
        transition: "box-shadow 0.15s, background 0.15s, border-color 0.15s",
        boxShadow: hov ? `0 0 10px ${col.border}33` : "none",
        cursor: "default",
        width: "100%",
        maxWidth: compact ? undefined : 400,
        margin: compact ? undefined : "0 auto",
        boxSizing: "border-box",
      }}>
        <div style={{ fontWeight: 700, fontSize: compact ? 11 : 13, letterSpacing: "0.02em" }}>
          {node.label}
        </div>
      </div>
      {showTip && node.sub && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 6px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#0b1422",
          border: `1px solid ${col.border}66`,
          borderRadius: 5,
          padding: "4px 10px",
          fontSize: 10,
          color: "#94a3b8",
          whiteSpace: "nowrap",
          zIndex: 9999,
          pointerEvents: "none",
          boxShadow: "0 6px 24px rgba(0,0,0,0.75)",
          letterSpacing: "0.02em",
          lineHeight: 1.5,
        }}>
          {node.sub}
          <div style={{
            position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
            borderLeft: "4px solid transparent", borderRight: "4px solid transparent",
            borderTop: `4px solid ${col.border}55`,
          }} />
        </div>
      )}
    </div>
  )
}

// ─── Group node ───────────────────────────────────────────────────────────────

function GroupNodeRenderer({
  node, expanded, onToggle, onCollapseDesc, palette,
}: {
  node: GroupNode
  expanded: Record<string, boolean>
  onToggle: (id: string) => void
  onCollapseDesc: (id: string) => void
  palette: typeof DARK
}) {
  const [hov, setHov] = useState(false)
  const [hovBtn, setHovBtn] = useState(false)
  const [showTip, setShowTip] = useState(false)
  const col = palette[node.color] ?? palette.steel
  const isExp = !!expanded[node.id]
  const hasChildGroups = allGroupIds(node.children).length > 0

  return (
    <div style={{
      border: `1.5px solid ${isExp ? col.border + "bb" : col.border + "44"}`,
      borderRadius: 10,
      background: isExp ? col.bg : col.bg + "22",
      width: "100%",
      boxSizing: "border-box",
      transition: "border-color 0.2s, background 0.2s",
    }}>
      {/* Header */}
      <div
        onMouseEnter={() => { setHov(true); setShowTip(true) }}
        onMouseLeave={() => { setHov(false); setShowTip(false) }}
        onClick={() => onToggle(node.id)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "8px 36px 8px 12px",
          cursor: "pointer", userSelect: "none", color: col.text,
          borderRadius: isExp ? "8px 8px 0 0" : "8px",
          background: hov ? col.border + "10" : "transparent",
          transition: "background 0.15s",
          position: "relative",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.02em" }}>{node.label}</span>
        {node.badge && <span style={{ color: col.border, fontWeight: 600, fontSize: 12 }}>{node.badge}</span>}
        <span style={{ opacity: 0.3, fontSize: 10 }}>{isExp ? "▲" : "▼"}</span>

        {showTip && node.sub && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
            transform: "translateX(-50%)",
            background: "#0b1422", border: `1px solid ${col.border}55`, borderRadius: 5,
            padding: "4px 10px", fontSize: 10, color: "#94a3b8",
            whiteSpace: "nowrap", zIndex: 9999, pointerEvents: "none",
            boxShadow: "0 6px 24px rgba(0,0,0,0.75)",
          }}>
            {node.sub}
            <div style={{
              position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
              borderLeft: "4px solid transparent", borderRight: "4px solid transparent",
              borderTop: `4px solid ${col.border}55`,
            }} />
          </div>
        )}

        {isExp && hasChildGroups && (
          <button
            onMouseEnter={() => setHovBtn(true)}
            onMouseLeave={() => setHovBtn(false)}
            onClick={e => { e.stopPropagation(); onCollapseDesc(node.id) }}
            title="Collapse child groups"
            style={{
              position: "absolute", right: 7,
              background: hovBtn ? col.border + "22" : "transparent",
              border: `1px solid ${hovBtn ? col.border : col.border + "33"}`,
              color: hovBtn ? col.border : col.border + "55",
              borderRadius: 4, padding: "1px 6px",
              fontSize: 11, cursor: "pointer", lineHeight: 1.3,
              transition: "all 0.15s", fontFamily: "inherit",
            }}
          >↺</button>
        )}
      </div>

      {isExp && (
        <div style={{ padding: "6px 8px 8px", borderTop: `1px solid ${col.border}20` }}>
          <Col
            nodes={node.children}
            expanded={expanded}
            onToggle={onToggle}
            onCollapseDesc={onCollapseDesc}
            lineColor={col.border}
            palette={palette}
          />
        </div>
      )}
    </div>
  )
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

function NodeRenderer({
  node, expanded, onToggle, onCollapseDesc, compact, palette,
}: {
  node: TreeNode
  expanded: Record<string, boolean>
  onToggle: (id: string) => void
  onCollapseDesc: (id: string) => void
  compact?: boolean
  palette: typeof DARK
}) {
  if (node.type === "row") {
    return (
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {node.children.map(n => (
          <NodeRenderer key={n.id} node={n} expanded={expanded} onToggle={onToggle} onCollapseDesc={onCollapseDesc} compact palette={palette} />
        ))}
      </div>
    )
  }
  if (node.type === "leaf") return <Leaf node={node} compact={compact} palette={palette} />
  return (
    <GroupNodeRenderer
      node={node}
      expanded={expanded}
      onToggle={onToggle}
      onCollapseDesc={onCollapseDesc}
      palette={palette}
    />
  )
}

function Col({
  nodes, expanded, onToggle, onCollapseDesc, lineColor = "#334155", palette,
}: {
  nodes: TreeNode[]
  expanded: Record<string, boolean>
  onToggle: (id: string) => void
  onCollapseDesc: (id: string) => void
  lineColor?: string
  palette: typeof DARK
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {nodes.map((n, i) => (
        <div key={n.id}>
          {i > 0 && <Conn color={lineColor} />}
          <NodeRenderer node={n} expanded={expanded} onToggle={onToggle} onCollapseDesc={onCollapseDesc} palette={palette} />
        </div>
      ))}
    </div>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────

export interface ArchTreeDiagramProps {
  nodes: TreeNode[]
  title?: string
  subtitle?: string
  configEntries?: Array<[string, string]>
}

export function ArchTreeDiagram({ nodes, title, subtitle, configEntries }: ArchTreeDiagramProps) {
  const dark = useDark()
  const palette = dark ? DARK : LIGHT
  const groupIds = allGroupIds(nodes)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => collectDefaults(nodes))

  const toggle = useCallback((id: string) => setExpanded(p => ({ ...p, [id]: !p[id] })), [])
  const expandAll = useCallback(() => setExpanded(Object.fromEntries(groupIds.map(id => [id, true]))), [groupIds])
  const collapseAll = useCallback(() => setExpanded({}), [])
  const collapseDesc = useCallback((id: string) => {
    const group = findGroup(nodes, id)
    const ids = allGroupIds(group?.children ?? [])
    setExpanded(p => {
      const n = { ...p }
      ids.forEach(i => delete n[i])
      return n
    })
  }, [nodes])

  // Theme-aware chrome
  const chromeBg    = dark ? "#060c18" : "#f8fafc"
  const subtitleClr = dark ? "#475569"  : "#94a3b8"
  const connClr     = dark ? "#1e3a4a"  : "#cbd5e1"
  const cfgBg       = dark ? "#070e1c"  : "#f1f5f9"
  const cfgBorder   = dark ? "#1a2535"  : "#e2e8f0"
  const cfgKey      = dark ? "#475569"  : "#94a3b8"
  const cfgVal      = dark ? "#94a3b8"  : "#475569"
  const cfgTitle    = dark ? "#38bdf8"  : "#0ea5e9"
  const btnExpBg    = dark ? "#071828"  : "#eff6ff"
  const btnExpBd    = dark ? "#38bdf8"  : "#0ea5e9"
  const btnExpClr   = dark ? "#7dd3fc"  : "#0369a1"
  const btnColBg    = dark ? "#0f172a"  : "#f1f5f9"
  const btnColBd    = dark ? "#1e293b"  : "#cbd5e1"
  const btnColClr   = dark ? "#475569"  : "#94a3b8"

  const btnBase: React.CSSProperties = {
    borderRadius: 4,
    padding: "2px 8px",
    fontSize: 10,
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: "0.03em",
    border: "1px solid",
    lineHeight: 1.6,
  }

  return (
    <div style={{
      background: chromeBg,
      minHeight: 220,
      padding: "14px 12px 28px",
      fontFamily: "'JetBrains Mono','Fira Code','Cascadia Code',monospace",
      borderRadius: 10,
      transition: "background 0.2s",
    }}>
      {/* Top bar: subtitle left, buttons right */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
        <div style={{ fontSize: 9.5, color: subtitleClr, letterSpacing: "0.03em", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title && <span style={{ marginRight: 6, fontWeight: 700 }}>{title}</span>}
          {subtitle}
        </div>
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
          <button onClick={expandAll}  style={{ ...btnBase, background: btnExpBg, borderColor: btnExpBd, color: btnExpClr }}>+ all</button>
          <button onClick={collapseAll} style={{ ...btnBase, background: btnColBg, borderColor: btnColBd, color: btnColClr }}>− all</button>
        </div>
      </div>

      <div style={{ maxWidth: 460, margin: "0 auto" }}>
        <Col nodes={nodes} expanded={expanded} onToggle={toggle} onCollapseDesc={collapseDesc} lineColor={connClr} palette={palette} />
      </div>

      {configEntries && configEntries.length > 0 && (
        <div style={{
          maxWidth: 460, margin: "18px auto 0",
          border: `1px solid ${cfgBorder}`, borderRadius: 8,
          background: cfgBg, padding: "8px 12px",
          fontSize: 9.5, lineHeight: 2,
        }}>
          <div style={{ color: cfgTitle, marginBottom: 3, fontWeight: 700, fontSize: 10 }}>config.json</div>
          {configEntries.map(([k, v]) => (
            <span key={k} style={{ marginRight: 12, display: "inline-block" }}>
              <span style={{ color: cfgKey }}>{k}: </span>
              <span style={{ color: cfgVal }}>{v}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
