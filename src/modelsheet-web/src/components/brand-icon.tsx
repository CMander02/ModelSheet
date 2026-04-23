import { ModelIcon, ProviderIcon } from "@lobehub/icons"

const ICON_SIZE = 18

// Custom provider logos not in @lobehub/icons — stored under public/icons/providers/
// Keyed by the HF-org slug (what appears before the / in model.id) AND display names.
const CUSTOM_LOGO_MAP: Record<string, string> = {
  // OpenBMB (open-source project, HF org avatar)
  "openbmb": "/icons/providers/openbmb.png",
  "OpenBMB": "/icons/providers/openbmb.png",

  // RedNote Hi-Lab (小红书 Hi-Lab, GitHub org avatar)
  "rednote-hilab": "/icons/providers/rednote-hilab.png",
  "RedNote Hi-Lab": "/icons/providers/rednote-hilab.png",
  "小红书 Hi-Lab": "/icons/providers/rednote-hilab.png",

  // AIDC-AI (Alibaba International Digital Commerce)
  "AIDC-AI": "/icons/providers/aidc-ai.png",
  "Alibaba International": "/icons/providers/aidc-ai.png",

  // open-thoughts (community, GitHub avatar)
  "open-thoughts": "/icons/providers/open-thoughts.png",
  "Open Thoughts": "/icons/providers/open-thoughts.png",

  // Arcee AI (HF org avatar)
  "arcee-ai": "/icons/providers/arcee-ai.png",
  "Arcee AI": "/icons/providers/arcee-ai.png",

  // Snowflake (HF org avatar)
  "Snowflake": "/icons/providers/snowflake.png",
  "snowflake": "/icons/providers/snowflake.png",

  // Yandex (HF org avatar)
  "yandex": "/icons/providers/yandex.png",
  "Yandex": "/icons/providers/yandex.png",

  // ByteDance Seed (distinct brand from general ByteDance)
  "ByteDance-Seed": "/icons/providers/bytedance-seed.png",
  "bytedance-research": "/icons/providers/bytedance-seed.png",
  "ByteDance Seed": "/icons/providers/bytedance-seed.png",
  "字节 Seed": "/icons/providers/bytedance-seed.png",

  // ByteDance (general — Doubao etc.)
  "ByteDance": "/icons/providers/bytedance.png",
  "字节跳动": "/icons/providers/bytedance.png",

  // Qwen (Alibaba) — force color SVG for "Qwen Team" display name
  "Qwen": "/icons/providers/qwen.svg",
  "Qwen Team": "/icons/providers/qwen.svg",
  "通义千问团队": "/icons/providers/qwen.svg",
  "Damo Academy": "/icons/providers/qwen.svg",
  "达摩院": "/icons/providers/qwen.svg",
  "alibaba-PAI": "/icons/providers/qwen.svg",
  "Alibaba-NLP": "/icons/providers/qwen.svg",

  // Moonshot AI / Kimi (HF org avatar)
  "moonshotai": "/icons/providers/moonshot.png",
  "Moonshot AI": "/icons/providers/moonshot.png",
  "月之暗面": "/icons/providers/moonshot.png",

  // Xiaomi (HF org avatar)
  "XiaomiMiMo": "/icons/providers/xiaomi.png",
  "Xiaomi": "/icons/providers/xiaomi.png",
  "小米": "/icons/providers/xiaomi.png",

  // Cursor (official icon)
  "cursor": "/icons/providers/cursor.png",
  "Cursor": "/icons/providers/cursor.png",

  // Unsloth (HF org avatar)
  "unsloth": "/icons/providers/unsloth.png",

  // Liquid AI (HF org avatar)
  "LiquidAI": "/icons/providers/liquid-ai.png",
  "Liquid AI": "/icons/providers/liquid-ai.png",

  // Skywork / 昆仑万维 (HF org avatar)
  "Skywork": "/icons/providers/skywork.png",
  "昆仑万维": "/icons/providers/skywork.png",

  // Reka AI (HF org avatar)
  "RekaAI": "/icons/providers/reka-ai.png",
  "Reka AI": "/icons/providers/reka-ai.png",
  "Reka": "/icons/providers/reka-ai.png",

  // Deep Cogito (HF org avatar)
  "deepcogito": "/icons/providers/deep-cogito.png",
  "Deep Cogito": "/icons/providers/deep-cogito.png",

  // Qihoo 360 (HF org avatar)
  "qihoo360": "/icons/providers/qihoo360.png",
  "Qihoo 360": "/icons/providers/qihoo360.png",
  "360": "/icons/providers/qihoo360.png",

  // Allen AI / AI2 (HF org avatar)
  "allenai": "/icons/providers/allen-ai.png",
  "Allen AI": "/icons/providers/allen-ai.png",
  "艾伦人工智能研究院": "/icons/providers/allen-ai.png",

  // Ant Group / inclusionAI — logo from Ling model README
  "inclusionAI": "/icons/providers/ant-group.png",
  "Ant Group": "/icons/providers/ant-group.png",
  "蚂蚁集团": "/icons/providers/ant-group.png",
}

// Map our display-name/provider-name to lobehub provider keys.
// See https://lobehub.com/icons for the full list.
const PROVIDER_KEY_MAP: Record<string, string> = {
  // Chinese labs
  "Qwen Team": "qwen",
  "通义千问团队": "qwen",
  "Damo Academy": "qwen",
  "达摩院": "qwen",
  "DeepSeek": "deepseek",
  "深度求索": "deepseek",
  "Zhipu AI": "zhipu",
  "智谱 AI": "zhipu",
  "Moonshot AI": "moonshot",
  "月之暗面": "moonshot",
  "MiniMax": "minimax",
  "Baichuan AI": "baichuan",
  "百川智能": "baichuan",
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
  "Tencent": "tencent",
  "腾讯": "tencent",
  "Xiaomi": "xiaomi",
  "小米": "xiaomi",
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

  // Cursor — lobehub ships an official icon
  "Cursor": "cursor",
  "cursor": "cursor",
}

function lookupProviderKey(provider?: string | null): string | undefined {
  if (!provider) return undefined
  if (PROVIDER_KEY_MAP[provider]) return PROVIDER_KEY_MAP[provider]
  // Last-resort: lowercase + strip spaces — works for simple cases
  const slug = provider.toLowerCase().replace(/\s+/g, "")
  return slug || undefined
}

// Try to extract the HF org from a model ID like "openbmb/MiniCPM-o-2_6".
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

const wrapperStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", flex: "none" }

interface ModelBrandIconProps {
  model?: string | null
  provider?: string | null
  size?: number
  className?: string
}

/**
 * Render a model-level icon. Priority:
 * 1. Custom logo by HF org or by provider display-name (local PNG/SVG)
 * 2. Lobe ModelIcon (recognizes many model IDs)
 */
export function ModelBrandIcon({ model, provider, size = ICON_SIZE, className }: ModelBrandIconProps) {
  if (!model) return null
  const custom = lookupCustomLogo([orgFromModelId(model), provider])
  if (custom) {
    return (
      <span className={className} style={wrapperStyle}>
        <img src={custom} alt="" width={size} height={size} style={{ borderRadius: 4, objectFit: "contain" }} />
      </span>
    )
  }
  return (
    <span className={className} style={wrapperStyle}>
      <ModelIcon model={model} size={size} type="color" />
    </span>
  )
}

interface ProviderBrandIconProps {
  provider?: string | null
  orgHint?: string | null
  size?: number
  className?: string
}

/**
 * Render the provider-level icon. Priority:
 * 1. Custom logo by provider display name or org
 * 2. Lobe ProviderIcon (mapped via PROVIDER_KEY_MAP)
 */
export function ProviderBrandIcon({ provider, orgHint, size = ICON_SIZE, className }: ProviderBrandIconProps) {
  const custom = lookupCustomLogo([provider, orgHint])
  if (custom) {
    return (
      <span className={className} style={wrapperStyle}>
        <img src={custom} alt="" width={size} height={size} style={{ borderRadius: 4, objectFit: "contain" }} />
      </span>
    )
  }
  const key = lookupProviderKey(provider)
  if (!key) return null
  return (
    <span className={className} style={wrapperStyle}>
      <ProviderIcon provider={key} size={size} type="color" />
    </span>
  )
}
