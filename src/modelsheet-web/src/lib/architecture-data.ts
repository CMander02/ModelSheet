import type { ArchitectureSpec, DiagramParams, ModelInfo, TreeNode } from "./types"

function applyTemplate(value: unknown, params: DiagramParams): unknown {
  if (typeof value !== "string") return value
  return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const param = params[key]
    if (param === null || param === undefined) return ""
    return String(param)
  })
}

function renderNode(node: TreeNode, params: DiagramParams): TreeNode {
  if (node.type === "row") {
    return {
      ...node,
      children: node.children.map(child => renderNode(child, params) as typeof child),
    }
  }

  if (node.type === "group") {
    return {
      ...node,
      label: applyTemplate(node.label, params) as string,
      sub: applyTemplate(node.sub, params) as string | undefined,
      badge: applyTemplate(node.badge, params) as string | undefined,
      children: node.children.map(child => renderNode(child, params)),
    }
  }

  return {
    ...node,
    label: applyTemplate(node.label, params) as string,
    sub: applyTemplate(node.sub, params) as string | undefined,
  }
}

export function modelDiagramParams(model?: ModelInfo | null): DiagramParams {
  if (!model) return {}
  return {
    numLayers: model.numLayers,
    numHeads: model.numHeads,
    numKvHeads: model.numKvHeads,
    hiddenSize: model.hiddenSize,
    contextLength: model.contextLength,
    vocabSize: model.vocabSize,
    intermediateSize: model.intermediateSize,
    numExperts: model.numExperts,
    numSharedExperts: model.numSharedExperts,
    numExpertsPerToken: model.numExpertsPerToken,
  }
}

export function renderArchitectureDiagram(
  arch: ArchitectureSpec,
  overrides: DiagramParams = {},
): { nodes: TreeNode[]; subtitle?: string } {
  const params = { ...arch.defaultParams, ...overrides }
  return {
    nodes: arch.diagramNodes.map(node => renderNode(node, params)),
    subtitle: applyTemplate(arch.diagramSubtitle, params) as string | undefined,
  }
}

export function archMatchesFamily(arch: ArchitectureSpec, family: string): boolean {
  const q = family.toLowerCase()
  return (
    arch.id === q ||
    arch.family.toLowerCase() === q ||
    (arch.modelTypeAliases?.some(alias => alias.toLowerCase() === q) ?? false)
  )
}

export async function loadArchitectures(): Promise<ArchitectureSpec[]> {
  const resp = await fetch("/api/architectures")
  if (!resp.ok) return []
  return resp.json()
}

export async function loadArchitecture(id: string): Promise<ArchitectureSpec | null> {
  const resp = await fetch(`/api/architecture?id=${encodeURIComponent(id)}`)
  if (resp.status === 404) return null
  if (!resp.ok) throw new Error(`Architecture load failed: ${resp.status}`)
  return resp.json()
}
