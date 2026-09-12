import { memo, type ComponentType, type CSSProperties } from "react"

interface IconProps {
  size?: number
  style?: CSSProperties
  className?: string
}

interface AvatarStyle {
  AVATAR_BACKGROUND?: string
  AVATAR_COLOR?: string
  AVATAR_ICON_MULTIPLE?: number
  TITLE: string
}

// Keep the catalog's avatar artwork without loading the icon package's UI/theme framework.
export function createBrandAvatar(Icon: ComponentType<IconProps>, styles: AvatarStyle) {
  return memo(function BrandAvatar({ size = 18 }: IconProps) {
    return (
      <span aria-label={styles.TITLE} style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none",
        width: size, height: size, borderRadius: Math.floor(size * 0.1),
        background: styles.AVATAR_BACKGROUND, color: styles.AVATAR_COLOR,
      }}>
        <Icon size={size} style={{ transform: `scale(${styles.AVATAR_ICON_MULTIPLE ?? 0.75})` }} />
      </span>
    )
  })
}
