/**
 * Modality icons component
 * 显示模型输入/输出模态的图标组件
 *
 * Icons: Type (text), Image, AudioLines (audio), Video
 */

import { Type, Image, AudioLines, Video } from "lucide-react"
import { cn } from "@/lib/utils"

type Modality = "text" | "image" | "audio" | "video"

interface ModalityIconsProps {
  modalities: string[]
  className?: string
}

const MODALITY_ICONS: Record<Modality, React.ComponentType<{ className?: string }>> = {
  text: Type,
  image: Image,
  audio: AudioLines,
  video: Video,
}

const MODALITY_ORDER: Modality[] = ["text", "image", "audio", "video"]

export function ModalityIcons({ modalities, className }: ModalityIconsProps) {
  if (!modalities || modalities.length === 0) {
    return <span className="text-muted-foreground">-</span>
  }

  const activeModalities = new Set(modalities.map(m => m.toLowerCase()))

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {MODALITY_ORDER.map((modality) => {
        const Icon = MODALITY_ICONS[modality]
        const isActive = activeModalities.has(modality)

        return (
          <Icon
            key={modality}
            className={cn(
              "h-4 w-4 transition-opacity",
              isActive
                ? "text-foreground opacity-100"
                : "text-muted-foreground opacity-30"
            )}
          />
        )
      })}
    </div>
  )
}

/**
 * Compact modality display showing only active modalities
 */
export function ModalityIconsCompact({ modalities, className }: ModalityIconsProps) {
  if (!modalities || modalities.length === 0) {
    return <span className="text-muted-foreground">-</span>
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {modalities.map((modality) => {
        const mod = modality.toLowerCase() as Modality
        const Icon = MODALITY_ICONS[mod]
        if (!Icon) return null

        return (
          <Icon
            key={modality}
            className="h-4 w-4 text-foreground"
          />
        )
      })}
    </div>
  )
}
