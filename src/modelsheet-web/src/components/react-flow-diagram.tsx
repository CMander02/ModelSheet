/**
 * React Flow wrapper for ModelSheet architecture diagrams.
 * Renders a set of nodes + edges with automatic dagre layout.
 */

import { useMemo } from "react"
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { NODE_TYPES } from "./react-flow-nodes"
import { layoutNodes, resetIds } from "./arch-diagrams/shared"
import type { LayoutOptions } from "./arch-diagrams/shared"

interface ReactFlowDiagramProps {
  nodes: Node[]
  edges: Edge[]
  fit?: boolean
  layout?: LayoutOptions
}

export function ReactFlowDiagram({
  nodes: rawNodes,
  edges: rawEdges,
  fit = false,
  layout,
}: ReactFlowDiagramProps) {
  // Stable identity — reset IDs & layout once per render
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    resetIds()
    const laid = layoutNodes(rawNodes, rawEdges, layout)
    return { nodes: laid, edges: rawEdges }
  }, [rawNodes, rawEdges, layout]) // eslint-disable-line react-hooks/exhaustive-deps

  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, _setEdges, onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div style={{ width: "100%", height: fit ? "100%" : "auto", minHeight: fit ? 400 : 300 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        fitView={fit}
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
        {fit && <Controls showInteractive={false} />}
      </ReactFlow>
    </div>
  )
}
