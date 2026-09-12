import { ModelIcon, ProviderIcon } from "./catalog-icons"
import { createBrandAvatar } from "./brand-avatar"
import { createElement } from "react"
import AntGroupIconMono from "@lobehub/icons/es/AntGroup/components/Mono"
import * as AntGroupIconStyle from "@lobehub/icons/es/AntGroup/style"
import ArceeIconMono from "@lobehub/icons/es/Arcee/components/Mono"
import * as ArceeIconStyle from "@lobehub/icons/es/Arcee/style"
import BAAIIconMono from "@lobehub/icons/es/BAAI/components/Mono"
import * as BAAIIconStyle from "@lobehub/icons/es/BAAI/style"
import BaichuanIconMono from "@lobehub/icons/es/Baichuan/components/Mono"
import * as BaichuanIconStyle from "@lobehub/icons/es/Baichuan/style"
import ByteDanceIconMono from "@lobehub/icons/es/ByteDance/components/Mono"
import * as ByteDanceIconStyle from "@lobehub/icons/es/ByteDance/style"
import DeepCogitoIconMono from "@lobehub/icons/es/DeepCogito/components/Mono"
import * as DeepCogitoIconStyle from "@lobehub/icons/es/DeepCogito/style"
import InfinigenceIconMono from "@lobehub/icons/es/Infinigence/components/Mono"
import * as InfinigenceIconStyle from "@lobehub/icons/es/Infinigence/style"
import KimiIconMono from "@lobehub/icons/es/Kimi/components/Mono"
import * as KimiIconStyle from "@lobehub/icons/es/Kimi/style"
import LiquidIconMono from "@lobehub/icons/es/Liquid/components/Mono"
import * as LiquidIconStyle from "@lobehub/icons/es/Liquid/style"
import LongCatIconMono from "@lobehub/icons/es/LongCat/components/Mono"
import * as LongCatIconStyle from "@lobehub/icons/es/LongCat/style"
import MoonshotIconMono from "@lobehub/icons/es/Moonshot/components/Mono"
import * as MoonshotIconStyle from "@lobehub/icons/es/Moonshot/style"
import NousResearchIconMono from "@lobehub/icons/es/NousResearch/components/Mono"
import * as NousResearchIconStyle from "@lobehub/icons/es/NousResearch/style"
import RwkvIconMono from "@lobehub/icons/es/Rwkv/components/Mono"
import * as RwkvIconStyle from "@lobehub/icons/es/Rwkv/style"
import SkyworkIconMono from "@lobehub/icons/es/Skywork/components/Mono"
import * as SkyworkIconStyle from "@lobehub/icons/es/Skywork/style"
import SnowflakeIconMono from "@lobehub/icons/es/Snowflake/components/Mono"
import * as SnowflakeIconStyle from "@lobehub/icons/es/Snowflake/style"
import TIIIconMono from "@lobehub/icons/es/TII/components/Mono"
import * as TIIIconStyle from "@lobehub/icons/es/TII/style"
import UpstageIconMono from "@lobehub/icons/es/Upstage/components/Mono"
import * as UpstageIconStyle from "@lobehub/icons/es/Upstage/style"
import XiaomiMiMoIconMono from "@lobehub/icons/es/XiaomiMiMo/components/Mono"
import * as XiaomiMiMoIconStyle from "@lobehub/icons/es/XiaomiMiMo/style"
import YandexIconMono from "@lobehub/icons/es/Yandex/components/Mono"
import * as YandexIconStyle from "@lobehub/icons/es/Yandex/style"
import LGIconMono from "@lobehub/icons/es/LG/components/Mono"
import * as LGIconStyle from "@lobehub/icons/es/LG/style"
import IFlyTekCloudIconMono from "@lobehub/icons/es/IFlyTekCloud/components/Mono"
import * as IFlyTekCloudIconStyle from "@lobehub/icons/es/IFlyTekCloud/style"
import SparkIconMono from "@lobehub/icons/es/Spark/components/Mono"
import * as SparkIconStyle from "@lobehub/icons/es/Spark/style"
import TencentIcon from "@lobehub/icons/es/Tencent/components/Color"
import HunyuanIcon from "@lobehub/icons/es/Hunyuan/components/Color"

const AntGroupIcon = createBrandAvatar(AntGroupIconMono, AntGroupIconStyle)
const ArceeIcon = createBrandAvatar(ArceeIconMono, ArceeIconStyle)
const BAAIIcon = createBrandAvatar(BAAIIconMono, BAAIIconStyle)
const BaichuanIcon = createBrandAvatar(BaichuanIconMono, BaichuanIconStyle)
const ByteDanceIcon = createBrandAvatar(ByteDanceIconMono, ByteDanceIconStyle)
const DeepCogitoIcon = createBrandAvatar(DeepCogitoIconMono, DeepCogitoIconStyle)
const InfinigenceIcon = createBrandAvatar(InfinigenceIconMono, InfinigenceIconStyle)
const KimiIcon = createBrandAvatar(KimiIconMono, KimiIconStyle)
const LiquidIcon = createBrandAvatar(LiquidIconMono, LiquidIconStyle)
const LongCatIcon = createBrandAvatar(LongCatIconMono, LongCatIconStyle)
const MoonshotIcon = createBrandAvatar(MoonshotIconMono, MoonshotIconStyle)
const NousResearchIcon = createBrandAvatar(NousResearchIconMono, NousResearchIconStyle)
const RwkvIcon = createBrandAvatar(RwkvIconMono, RwkvIconStyle)
const SkyworkIcon = createBrandAvatar(SkyworkIconMono, SkyworkIconStyle)
const SnowflakeIcon = createBrandAvatar(SnowflakeIconMono, SnowflakeIconStyle)
const TIIIcon = createBrandAvatar(TIIIconMono, TIIIconStyle)
const UpstageIcon = createBrandAvatar(UpstageIconMono, UpstageIconStyle)
const XiaomiMiMoIcon = createBrandAvatar(XiaomiMiMoIconMono, XiaomiMiMoIconStyle)
const YandexIcon = createBrandAvatar(YandexIconMono, YandexIconStyle)
const LGIcon = createBrandAvatar(LGIconMono, LGIconStyle)
const IFlyTekCloudIcon = createBrandAvatar(IFlyTekCloudIconMono, IFlyTekCloudIconStyle)
const SparkIcon = createBrandAvatar(SparkIconMono, SparkIconStyle)

const ICON_SIZE = 18

// ─── Lobehub Avatar icon map ───────────────────────────────────────────────
// Keys: HF org slugs + provider display names (EN + ZH)
// Values: Lobehub .Avatar or .Color components matching the brand's artwork

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AvatarIconComponent = React.ComponentType<any>

const LOBEHUB_AVATAR_MAP: Record<string, AvatarIconComponent> = {
  // Tencent company and Hunyuan product identities
  "腾讯":           TencentIcon,
  "Tencent":        TencentIcon,
  "tencent":        TencentIcon,
  "腾讯混元":       HunyuanIcon,
  "Tencent Hunyuan": HunyuanIcon,
  "Tencent-Hunyuan": HunyuanIcon,
  "tencent-hunyuan": HunyuanIcon,
  "混元":           HunyuanIcon,
  "Hunyuan":        HunyuanIcon,
  "hunyuan":        HunyuanIcon,

  "LG AI":         LGIcon,
  "LG AI Research": LGIcon,
  "LG AI 研究院":    LGIcon,
  "LGAI-EXAONE":    LGIcon,

  "iFlyTek":       IFlyTekCloudIcon,
  "科大讯飞":        IFlyTekCloudIcon,
  "iFlytek":       IFlyTekCloudIcon,
  "iFlytekOpenSource": IFlyTekCloudIcon,
  "XHToken":       IFlyTekCloudIcon,
  // Kimi — model-level (HF org) uses Kimi product icon
  "moonshotai":    KimiIcon,

  // Moonshot AI — provider column uses Moonshot company icon
  "Moonshot AI":   MoonshotIcon,
  "月之暗面":       MoonshotIcon,

  // Arcee AI
  "Arcee AI":      ArceeIcon,
  "arcee-ai":      ArceeIcon,

  // Snowflake
  "Snowflake":     SnowflakeIcon,
  "snowflake":     SnowflakeIcon,

  // Yandex
  "Yandex":        YandexIcon,
  "yandex":        YandexIcon,

  // ByteDance (general — Doubao / Seed)
  "ByteDance":     ByteDanceIcon,
  "ByteDance Seed": ByteDanceIcon,
  "字节跳动":       ByteDanceIcon,
  "字节 Seed":      ByteDanceIcon,
  "ByteDance-Seed": ByteDanceIcon,
  "bytedance-research": ByteDanceIcon,

  // Skywork / 昆仑万维
  "Skywork":       SkyworkIcon,
  "昆仑万维":       SkyworkIcon,

  // Deep Cogito
  "Deep Cogito":   DeepCogitoIcon,
  "deepcogito":    DeepCogitoIcon,

  // Liquid AI
  "Liquid AI":     LiquidIcon,
  "LiquidAI":      LiquidIcon,

  // Xiaomi
  "Xiaomi MiMo":   XiaomiMiMoIcon,
  "小米 MiMo":      XiaomiMiMoIcon,
  "XiaomiMiMo":    XiaomiMiMoIcon,

  // TII
  "TII":           TIIIcon,
  "tii":           TIIIcon,

  // Upstage
  "Upstage":       UpstageIcon,
  "upstage":       UpstageIcon,

  // Nous Research
  "Nous Research": NousResearchIcon,
  "NousResearch":  NousResearchIcon,
  "nous-research": NousResearchIcon,

  // BAAI
  "BAAI":          BAAIIcon,
  "baai":          BAAIIcon,

  // Baichuan
  "Baichuan":      BaichuanIcon,
  "Baichuan AI":   BaichuanIcon,
  "百川智能":       BaichuanIcon,
  "baichuan-inc":  BaichuanIcon,

  // Infinigence
  "Infinigence":   InfinigenceIcon,
  "infinigence":   InfinigenceIcon,

  // RWKV
  "RWKV":          RwkvIcon,
  "rwkv":          RwkvIcon,
  "BlinkDL":       RwkvIcon,

  // Ant Group
  "Ant Group":     AntGroupIcon,
  "AntGroup":      AntGroupIcon,
  "蚂蚁集团":       AntGroupIcon,
  "inclusionAI":   AntGroupIcon,
}

const MODEL_AVATAR_MAP: Record<string, AvatarIconComponent> = {
  "meituan-longcat": LongCatIcon,
  "XHToken": SparkIcon,
  "iFlytek": SparkIcon,
}

// ─── Custom local image map ────────────────────────────────────────────────
// Only for providers NOT in lobehub at all.

const CUSTOM_LOGO_MAP: Record<string, string> = {
  // NEX — Shanghai Innovation Institute and partner teams
  "nex-agi": "/icons/providers/nex-agi-mark.svg",
  "Nex AGI": "/icons/providers/nex-agi-mark.svg",
  "Nex AGI（上海创智学院联合团队）": "/icons/providers/nex-agi-mark.svg",

  // Tsinghua AIR × ByteDance Seed Joint Lab
  "SIA Lab": "/icons/providers/tsinghua.svg",
  "BytedTsinghua-SIA": "/icons/providers/tsinghua.svg",
  "Tsinghua AIR × ByteDance Seed Joint Lab": "/icons/providers/tsinghua.svg",
  "清华 AIR × 字节跳动 Seed 联合实验室": "/icons/providers/tsinghua.svg",

  "OpenPangu": "/icons/providers/openpangu.svg",
  "openpangu": "/icons/providers/openpangu.svg",

  // Haotian Liu's public GitHub avatar, linked from his Hugging Face profile
  "liuhaotian": "/icons/providers/liuhaotian.jpg",
  "Haotian Liu (individual developer)": "/icons/providers/liuhaotian.jpg",
  "Haotian Liu（个人开发者）": "/icons/providers/liuhaotian.jpg",
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

  // Qwen (Alibaba) — current official favicon
  "Qwen":           "/icons/providers/qwen.png",
  "通义千问":        "/icons/providers/qwen.png",
  "Damo Academy":   "/icons/providers/qwen.png",
  "达摩院":          "/icons/providers/qwen.png",
  "alibaba-PAI":    "/icons/providers/qwen.png",
  "Alibaba-NLP":    "/icons/providers/qwen.png",

  // JD / 京东
  "JD":             "/icons/providers/jd.png",
  "JD.com":         "/icons/providers/jd.png",
  "京东":           "/icons/providers/jd.png",
  "jd-opensource": "/icons/providers/jd.png",
  "jdopensource":  "/icons/providers/jd.png",

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

  // Cognitive Computations / dphn / Dolphin
  "Cognitive Computations": "/icons/providers/cognitive-computations.png",
  "dphn":                   "/icons/providers/cognitive-computations.png",
  "cognitive-computations": "/icons/providers/cognitive-computations.png",

  // Weixin
  "微信":       "/icons/providers/wechat.svg",
  "Weixin":     "/icons/providers/wechat.svg",
  "weixin":     "/icons/providers/wechat.svg",

  // Meituan
  "Meituan":    "/icons/providers/meituan.png",
  "meituan":    "/icons/providers/meituan.png",

  // Thinking Machines Lab
  "thinkingmachines":      "/icons/providers/thinking-machines.svg",
  "Thinking Machines":     "/icons/providers/thinking-machines.svg",
  "Thinking Machines Lab": "/icons/providers/thinking-machines.svg",

  // IBM Granite
  "ibm-granite": "/icons/providers/ibm-granite.svg",
  "ibm":          "/icons/providers/ibm-granite.svg",
  "IBM":          "/icons/providers/ibm-granite.svg",
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
  "Meituan": "meituan",
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

  // 1. Hunyuan / Hy families share the Tencent org with other research models.
  const ProductAvatarIcon = /^tencent\/(?:hunyuan|hy(?:\d|[-_]))/i.test(model)
    ? HunyuanIcon
    : org ? MODEL_AVATAR_MAP[org] : undefined
  if (ProductAvatarIcon) {
    return (
      <span className={className} style={wrapperStyle}>
        <ProductAvatarIcon size={size} />
      </span>
    )
  }

  // 2. Lobehub Avatar by org slug (e.g. moonshotai → Kimi)
  const AvatarIcon = lookupAvatarIcon([org])
  if (AvatarIcon) {
    return (
      <span className={className} style={wrapperStyle}>
        {createElement(AvatarIcon, { size })}
      </span>
    )
  }

  // 3. Local custom image
  const custom = lookupCustomLogo([org, provider])
  if (custom) {
    return (
      <span className={className} style={wrapperStyle}>
        <img src={custom} alt="" loading="lazy" decoding="async" width={size} height={size} style={{ borderRadius: 4, objectFit: "contain" }} />
      </span>
    )
  }

  // 4. Lobehub ModelIcon
  return (
    <span className={className} style={wrapperStyle}>
      <ModelIcon model={model} provider={provider} size={size} />
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
        {createElement(AvatarIcon, { size })}
      </span>
    )
  }

  // 2. Local custom image
  const custom = lookupCustomLogo([provider, orgHint])
  if (custom) {
    return (
      <span className={className} style={wrapperStyle}>
        <img src={custom} alt="" loading="lazy" decoding="async" width={size} height={size} style={{ borderRadius: 4, objectFit: "contain" }} />
      </span>
    )
  }

  // 3. Lobehub ProviderIcon (flat, no background)
  const key = lookupProviderKey(provider)
  if (!key) return null
  return (
    <span className={className} style={wrapperStyle}>
      <ProviderIcon provider={key} size={size} />
    </span>
  )
}
