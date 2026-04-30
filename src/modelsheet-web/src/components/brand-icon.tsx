import { ModelIcon, ProviderIcon } from "@lobehub/icons"
import AntGroupIcon    from "@lobehub/icons/es/AntGroup"
import ArceeIcon       from "@lobehub/icons/es/Arcee"
import BAAIIcon        from "@lobehub/icons/es/BAAI"
import BaichuanIcon    from "@lobehub/icons/es/Baichuan"
import ByteDanceIcon   from "@lobehub/icons/es/ByteDance"
import DeepCogitoIcon  from "@lobehub/icons/es/DeepCogito"
import InfinigenceIcon from "@lobehub/icons/es/Infinigence"
import HunyuanIcon     from "@lobehub/icons/es/Hunyuan"
import KimiIcon        from "@lobehub/icons/es/Kimi"
import LiquidIcon      from "@lobehub/icons/es/Liquid"
import MoonshotIcon    from "@lobehub/icons/es/Moonshot"
import NousResearchIcon from "@lobehub/icons/es/NousResearch"
import RwkvIcon        from "@lobehub/icons/es/Rwkv"
import SkyworkIcon     from "@lobehub/icons/es/Skywork"
import SnowflakeIcon   from "@lobehub/icons/es/Snowflake"
import TIIIcon         from "@lobehub/icons/es/TII"
import UpstageIcon     from "@lobehub/icons/es/Upstage"
import XiaomiMiMoIcon  from "@lobehub/icons/es/XiaomiMiMo"
import YandexIcon      from "@lobehub/icons/es/Yandex"

const ICON_SIZE = 18

// ─── Lobehub Avatar icon map ───────────────────────────────────────────────
// Keys: HF org slugs + provider display names (EN + ZH)
// Values: lobehub icon component with .Avatar variant (self-contained background)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AvatarIconComponent = React.ComponentType<any>

const LOBEHUB_AVATAR_MAP: Record<string, AvatarIconComponent> = {
  // Kimi — model-level (HF org) uses Kimi product icon
  "moonshotai":    KimiIcon.Avatar,

  // Moonshot AI — provider column uses Moonshot company icon
  "Moonshot AI":   MoonshotIcon.Avatar,
  "月之暗面":       MoonshotIcon.Avatar,

  // Arcee AI
  "Arcee AI":      ArceeIcon.Avatar,
  "arcee-ai":      ArceeIcon.Avatar,

  // Snowflake
  "Snowflake":     SnowflakeIcon.Avatar,
  "snowflake":     SnowflakeIcon.Avatar,

  // Yandex
  "Yandex":        YandexIcon.Avatar,
  "yandex":        YandexIcon.Avatar,

  // ByteDance (general — Doubao / Seed)
  "ByteDance":     ByteDanceIcon.Avatar,
  "ByteDance Seed": ByteDanceIcon.Avatar,
  "字节跳动":       ByteDanceIcon.Avatar,
  "字节 Seed":      ByteDanceIcon.Avatar,
  "ByteDance-Seed": ByteDanceIcon.Avatar,
  "bytedance-research": ByteDanceIcon.Avatar,

  // Skywork / 昆仑万维
  "Skywork":       SkyworkIcon.Avatar,
  "昆仑万维":       SkyworkIcon.Avatar,

  // Deep Cogito
  "Deep Cogito":   DeepCogitoIcon.Avatar,
  "deepcogito":    DeepCogitoIcon.Avatar,

  // Liquid AI
  "Liquid AI":     LiquidIcon.Avatar,
  "LiquidAI":      LiquidIcon.Avatar,

  // Tencent Hunyuan
  "腾讯混元":       HunyuanIcon.Avatar,
  "Tencent Hunyuan": HunyuanIcon.Avatar,
  "tencent":       HunyuanIcon.Avatar,

  // Xiaomi
  "Xiaomi MiMo":   XiaomiMiMoIcon.Avatar,
  "小米 MiMo":      XiaomiMiMoIcon.Avatar,
  "XiaomiMiMo":    XiaomiMiMoIcon.Avatar,

  // TII
  "TII":           TIIIcon.Avatar,
  "tii":           TIIIcon.Avatar,

  // Upstage
  "Upstage":       UpstageIcon.Avatar,
  "upstage":       UpstageIcon.Avatar,

  // Nous Research
  "Nous Research": NousResearchIcon.Avatar,
  "NousResearch":  NousResearchIcon.Avatar,
  "nous-research": NousResearchIcon.Avatar,

  // BAAI
  "BAAI":          BAAIIcon.Avatar,
  "baai":          BAAIIcon.Avatar,

  // Baichuan
  "Baichuan":      BaichuanIcon.Avatar,
  "Baichuan AI":   BaichuanIcon.Avatar,
  "百川智能":       BaichuanIcon.Avatar,
  "baichuan-inc":  BaichuanIcon.Avatar,

  // Infinigence
  "Infinigence":   InfinigenceIcon.Avatar,
  "infinigence":   InfinigenceIcon.Avatar,

  // RWKV
  "RWKV":          RwkvIcon.Avatar,
  "rwkv":          RwkvIcon.Avatar,
  "BlinkDL":       RwkvIcon.Avatar,

  // Ant Group
  "Ant Group":     AntGroupIcon.Avatar,
  "蚂蚁集团":       AntGroupIcon.Avatar,
  "inclusionAI":   AntGroupIcon.Avatar,
}

// ─── Custom local image map ────────────────────────────────────────────────
// Only for providers NOT in lobehub at all.

const CUSTOM_LOGO_MAP: Record<string, string> = {
  // OpenBMB
  "openbmb":      "/icons/providers/openbmb.png",
  "OpenBMB":      "/icons/providers/openbmb.png",

  // RedNote Hi-Lab
  "rednote-hilab":   "/icons/providers/rednote-hilab.png",
  "RedNote Hi-Lab":  "/icons/providers/rednote-hilab.png",
  "小红书 Hi-Lab":    "/icons/providers/rednote-hilab.png",

  // AIDC-AI (Alibaba International)
  "AIDC-AI":             "/icons/providers/aidc-ai.png",
  "Alibaba International": "/icons/providers/aidc-ai.png",

  // Open Thoughts (community)
  "open-thoughts":  "/icons/providers/open-thoughts.png",
  "Open Thoughts":  "/icons/providers/open-thoughts.png",

  // Qwen (Alibaba) — custom color SVG
  "Qwen":           "/icons/providers/qwen.svg",
  "通义千问":        "/icons/providers/qwen.svg",
  "Damo Academy":   "/icons/providers/qwen.svg",
  "达摩院":          "/icons/providers/qwen.svg",
  "alibaba-PAI":    "/icons/providers/qwen.svg",
  "Alibaba-NLP":    "/icons/providers/qwen.svg",

  // moonshotai org → Kimi icon (handled via LOBEHUB_AVATAR_MAP in ModelBrandIcon)

  // Cursor
  "cursor":         "/icons/providers/cursor.png",
  "Cursor":         "/icons/providers/cursor.png",

  // Unsloth
  "unsloth":        "/icons/providers/unsloth.png",

  // Reka AI
  "RekaAI":         "/icons/providers/reka-ai.png",
  "Reka AI":        "/icons/providers/reka-ai.png",
  "Reka":           "/icons/providers/reka-ai.png",

  // Qihoo 360
  "qihoo360":       "/icons/providers/qihoo360.png",
  "Qihoo 360":      "/icons/providers/qihoo360.png",
  "360":            "/icons/providers/qihoo360.png",

  // Stepfun / 阶跃星辰
  "stepfun-ai":     "/icons/providers/stepfun.png",
  "Stepfun":        "/icons/providers/stepfun.png",
  "阶跃星辰":        "/icons/providers/stepfun.png",

  // Allen AI / AI2
  "allenai":        "/icons/providers/allen-ai.png",
  "Allen AI":       "/icons/providers/allen-ai.png",
  "艾伦人工智能研究院": "/icons/providers/allen-ai.png",

  // Poolside
  "poolside":       "/icons/providers/poolside.webp",
  "Poolside":       "/icons/providers/poolside.webp",
}

// ─── Provider key map (for ProviderIcon fallback) ──────────────────────────

const PROVIDER_KEY_MAP: Record<string, string> = {
  // Chinese labs
  "Qwen": "qwen",
  "通义千问": "qwen",
  "Damo Academy": "qwen",
  "达摩院": "qwen",
  "DeepSeek": "deepseek",
  "深度求索": "deepseek",
  "Zhipu AI": "zhipu",
  "智谱 AI": "zhipu",
  "Moonshot AI": "moonshot",
  "月之暗面": "moonshot",
  "MiniMax": "minimax",
  "01.AI": "yi",
  "零一万物": "yi",
  "Shanghai AI Lab": "internlm",
  "InternLM": "internlm",
  "书生浦语": "internlm",
  "Baidu": "baidu",
  "百度": "baidu",
  "Step": "stepfun",
  "Stepfun": "stepfun",
  "阶跃星辰": "stepfun",
  "腾讯混元": "tencent",
  "Tencent Hunyuan": "tencent",
  "Xiaomi MiMo": "xiaomi",
  "小米 MiMo": "xiaomi",
  "360": "ai360",
  "ByteDance": "doubao",
  "字节跳动": "doubao",
  "Doubao": "doubao",
  "豆包": "doubao",
  "RedNote": "rednote",
  "小红书": "rednote",
  // Western labs
  "Meta": "meta",
  "Llama Team": "meta",
  "Llama 团队": "meta",
  "OpenAI": "openai",
  "Anthropic": "anthropic",
  "Google": "google",
  "Google DeepMind": "deepmind",
  "DeepMind": "deepmind",
  "Mistral AI": "mistral",
  "Mistral": "mistral",
  "Microsoft": "microsoft",
  "Cohere": "cohere",
  "AI21": "ai21",
  "AI21 Labs": "ai21",
  "Perplexity": "perplexity",
  "Hugging Face": "huggingface",
  "xAI": "xai",
  "Stability AI": "stability",
  "NVIDIA": "nvidia",
  "Amazon": "aws",
  "Allen AI": "ai2",
  "AllenAI": "ai2",
  "Cursor": "cursor",
  "cursor": "cursor",
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function orgFromModelId(model?: string | null): string | undefined {
  if (!model || !model.includes("/")) return undefined
  return model.split("/")[0]
}

function lookupCustomLogo(keys: (string | null | undefined)[]): string | undefined {
  for (const k of keys) {
    if (k && CUSTOM_LOGO_MAP[k]) return CUSTOM_LOGO_MAP[k]
  }
  return undefined
}

function lookupAvatarIcon(keys: (string | null | undefined)[]): AvatarIconComponent | undefined {
  for (const k of keys) {
    if (k && LOBEHUB_AVATAR_MAP[k]) return LOBEHUB_AVATAR_MAP[k]
  }
  return undefined
}

function lookupProviderKey(provider?: string | null): string | undefined {
  if (!provider) return undefined
  if (PROVIDER_KEY_MAP[provider]) return PROVIDER_KEY_MAP[provider]
  return provider.toLowerCase().replace(/\s+/g, "") || undefined
}

const wrapperStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", flex: "none" }

// ─── ModelBrandIcon ────────────────────────────────────────────────────────

interface ModelBrandIconProps {
  model?: string | null
  provider?: string | null
  size?: number
  className?: string
}

export function ModelBrandIcon({ model, provider, size = ICON_SIZE, className }: ModelBrandIconProps) {
  if (!model) return null
  const org = orgFromModelId(model)

  // 1. Lobehub Avatar by org slug (e.g. moonshotai → Kimi)
  const AvatarIcon = lookupAvatarIcon([org])
  if (AvatarIcon) {
    return (
      <span className={className} style={wrapperStyle}>
        <AvatarIcon size={size} />
      </span>
    )
  }

  // 2. Local custom image
  const custom = lookupCustomLogo([org, provider])
  if (custom) {
    return (
      <span className={className} style={wrapperStyle}>
        <img src={custom} alt="" width={size} height={size} style={{ borderRadius: 4, objectFit: "contain" }} />
      </span>
    )
  }

  // 3. Lobehub ModelIcon
  return (
    <span className={className} style={wrapperStyle}>
      <ModelIcon model={model} size={size} type="color" />
    </span>
  )
}

// ─── ProviderBrandIcon ─────────────────────────────────────────────────────

interface ProviderBrandIconProps {
  provider?: string | null
  orgHint?: string | null
  size?: number
  className?: string
}

export function ProviderBrandIcon({ provider, orgHint, size = ICON_SIZE, className }: ProviderBrandIconProps) {
  // 1. Lobehub Avatar icon (self-contained background — best quality)
  const AvatarIcon = lookupAvatarIcon([provider, orgHint])
  if (AvatarIcon) {
    return (
      <span className={className} style={wrapperStyle}>
        <AvatarIcon size={size} />
      </span>
    )
  }

  // 2. Local custom image
  const custom = lookupCustomLogo([provider, orgHint])
  if (custom) {
    return (
      <span className={className} style={wrapperStyle}>
        <img src={custom} alt="" width={size} height={size} style={{ borderRadius: 4, objectFit: "contain" }} />
      </span>
    )
  }

  // 3. Lobehub ProviderIcon (flat, no background)
  const key = lookupProviderKey(provider)
  if (!key) return null
  return (
    <span className={className} style={wrapperStyle}>
      <ProviderIcon provider={key} size={size} type="color" />
    </span>
  )
}
