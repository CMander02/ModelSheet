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
  const orphan = document.getElementById(id)
  if (orphan && orphan.parentElement === document.body) {
    orphan.parentElement.removeChild(orphan)
  }
}

interface MermaidDiagramProps {
  definition: string
  /** When true, scales the SVG to fill the parent container while preserving aspect ratio */
  fit?: boolean
}

export function MermaidDiagram({ definition, fit = false }: MermaidDiagramProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [scale, setScale] = useState(1)
  const id = useRef(`mermaid-${++idCounter}`)

  useEffect(() => {
    let cancelled = false
    setError("")
    setSvg("")
    setScale(1)
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

  // After SVG is injected, compute the scale needed to fill the wrapper
  useEffect(() => {
    if (!fit || !svg || !wrapperRef.current) return

    const wrapper = wrapperRef.current
    const svgEl = wrapper.querySelector("svg")
    if (!svgEl) return

    // Use viewBox for natural (unscaled) dimensions — getBoundingClientRect
    // reflects the constrained render size, not the diagram's intrinsic size.
    const vb = svgEl.viewBox?.baseVal
    const svgW = vb && vb.width > 0 ? vb.width : svgEl.getBoundingClientRect().width
    const svgH = vb && vb.height > 0 ? vb.height : svgEl.getBoundingClientRect().height
    const containerW = wrapper.clientWidth
    const containerH = wrapper.clientHeight

    if (svgW === 0 || svgH === 0 || containerW === 0 || containerH === 0) return

    const padding = 48 // breathing room
    const s = Math.min((containerW - padding) / svgW, (containerH - padding) / svgH)
    setScale(Math.max(0.3, s))
  }, [svg, fit])

  if (error) return (
    <div className="text-xs text-red-500 font-mono p-2 whitespace-pre-wrap">{error}</div>
  )
  if (!svg) return (
    <div className="h-40 flex items-center justify-center text-muted-foreground text-xs">Rendering…</div>
  )

  if (fit) {
    return (
      <div
        ref={wrapperRef}
        className="w-full h-full flex items-center justify-center"
        style={{ overflow: "hidden" }}
      >
        <div
          style={{ transform: `scale(${scale})`, transformOrigin: "center center", transition: "transform 0.15s ease" }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    )
  }

  return (
    <div className="w-full flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }} />
  )
}
