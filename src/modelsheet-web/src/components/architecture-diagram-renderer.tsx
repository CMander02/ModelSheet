import { memo, useMemo } from "react"
import type { ArchitectureSpec, DiagramParams } from "@/lib/types"
import { renderArchitectureDiagram } from "@/lib/architecture-data"
import { ArchTreeDiagram } from "./arch-tree-diagram"

export const ArchitectureDiagramRenderer = memo(function ArchitectureDiagramRenderer({
  architecture,
  params,
  configEntries,
}: {
  architecture: ArchitectureSpec
  params?: DiagramParams
  configEntries?: Array<[string, string]>
}) {
  const rendered = useMemo(() => renderArchitectureDiagram(architecture, params), [architecture, params])
  return (
    <ArchTreeDiagram
      nodes={rendered.nodes}
      subtitle={rendered.subtitle}
      configEntries={configEntries}
    />
  )
})
