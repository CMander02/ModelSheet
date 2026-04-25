import { useEffect, useRef, useState } from "react"
import mermaid from "mermaid"

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  flowchart: {
    curve: "linear",
    nodeSpacing: 40,
    rankSpacing: 36,
    padding: 12,
    htmlLabels: false,
  },
  themeVariables: {
    fontSize: "13px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    primaryColor: "#dbeafe",
    primaryBorderColor: "#60a5fa",
    primaryTextColor: "#1e3a8a",
    lineColor: "#555",
  },
})

let idCounter = 0

function cleanupOrphan(id: string) {
  // Mermaid leaves a temporary div in <body> on render failure; remove it.
  const orphan = document.getElementById(id)
  if (orphan && orphan.parentElement === document.body) {
    orphan.parentElement.removeChild(orphan)
  }
}

export function MermaidDiagram({ definition }: { definition: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string>("")
  const id = useRef(`mermaid-${++idCounter}`)

  useEffect(() => {
    let cancelled = false
    setError("")
    setSvg("")
    mermaid.render(id.current, definition)
      .then(({ svg: rendered }) => {
        if (!cancelled) setSvg(rendered)
      })
      .catch((e) => {
        cleanupOrphan(id.current)
        if (!cancelled) setError(String(e))
      })
    return () => {
      cancelled = true
      cleanupOrphan(id.current)
    }
  }, [definition])

  if (error) return (
    <div className="text-xs text-red-500 font-mono p-2 whitespace-pre-wrap">{error}</div>
  )
  if (!svg) return (
    <div className="h-40 flex items-center justify-center text-muted-foreground text-xs">Rendering…</div>
  )
  return (
    <div ref={ref} className="w-full flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }} />
  )
}
