import type { DiagramParams } from "./shared"

export default function PlaceholderDiagram(_p: DiagramParams) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground h-full min-h-[200px]">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 17.5h7M17.5 14v7" />
      </svg>
      <span className="text-xs font-medium opacity-50">Coming Soon</span>
    </div>
  )
}
