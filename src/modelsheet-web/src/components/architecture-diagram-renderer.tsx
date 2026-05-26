import type { ArchitectureSpec, DiagramParams } from "@/lib/types"
import { renderArchitectureDiagram } from "@/lib/architecture-data"
import { ArchTreeDiagram } from "./arch-tree-diagram"

export function ArchitectureDiagramRenderer({
  architecture,
  params,
}: {
  architecture: ArchitectureSpec
  params?: DiagramParams
}) {
  const rendered = renderArchitectureDiagram(architecture, params)
  return (
    <ArchTreeDiagram
      nodes={rendered.nodes}
      subtitle={rendered.subtitle}
    />
  )
}
