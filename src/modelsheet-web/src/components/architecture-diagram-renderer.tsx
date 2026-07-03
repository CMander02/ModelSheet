import type { ArchitectureSpec, DiagramParams } from "@/lib/types"
import { renderArchitectureDiagram } from "@/lib/architecture-data"
import { ArchTreeDiagram } from "./arch-tree-diagram"

export function ArchitectureDiagramRenderer({
  architecture,
  params,
  configEntries,
}: {
  architecture: ArchitectureSpec
  params?: DiagramParams
  configEntries?: Array<[string, string]>
}) {
  const rendered = renderArchitectureDiagram(architecture, params)
  return (
    <ArchTreeDiagram
      nodes={rendered.nodes}
      subtitle={rendered.subtitle}
      configEntries={configEntries}
    />
  )
}
