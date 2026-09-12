import { Box, Building2 } from "lucide-react"
import type { ComponentType } from "react"
import providersData from "../../../../data/providers.json"
import DeepSeekIcon from "@lobehub/icons/es/DeepSeek/components/Color"
import ZhipuIcon from "@lobehub/icons/es/Zhipu/components/Color"
import MinimaxIcon from "@lobehub/icons/es/Minimax/components/Color"
import YiIcon from "@lobehub/icons/es/Yi/components/Color"
import InternLMIcon from "@lobehub/icons/es/InternLM/components/Color"
import BaiduIcon from "@lobehub/icons/es/Baidu/components/Color"
import StepfunIcon from "@lobehub/icons/es/Stepfun/components/Color"
import Ai360Icon from "@lobehub/icons/es/Ai360/components/Color"
import DoubaoIcon from "@lobehub/icons/es/Doubao/components/Color"
import MetaIcon from "@lobehub/icons/es/Meta/components/Color"
import OpenAIIcon from "@lobehub/icons/es/OpenAI/components/Mono"
import AnthropicIcon from "@lobehub/icons/es/Anthropic/components/Mono"
import GoogleIcon from "@lobehub/icons/es/Google/components/Color"
import DeepMindIcon from "@lobehub/icons/es/DeepMind/components/Color"
import MistralIcon from "@lobehub/icons/es/Mistral/components/Color"
import MicrosoftIcon from "@lobehub/icons/es/Microsoft/components/Color"
import CohereIcon from "@lobehub/icons/es/Cohere/components/Color"
import Ai21Icon from "@lobehub/icons/es/Ai21/components/Mono"
import PerplexityIcon from "@lobehub/icons/es/Perplexity/components/Color"
import HuggingFaceIcon from "@lobehub/icons/es/HuggingFace/components/Color"
import XAIIcon from "@lobehub/icons/es/XAI/components/Mono"
import StabilityIcon from "@lobehub/icons/es/Stability/components/Color"
import NvidiaIcon from "@lobehub/icons/es/Nvidia/components/Color"
import AwsIcon from "@lobehub/icons/es/Aws/components/Color"
import Ai2Icon from "@lobehub/icons/es/Ai2/components/Color"
import CursorIcon from "@lobehub/icons/es/Cursor/components/Mono"
import QwenIcon from "@lobehub/icons/es/Qwen/components/Color"
import ClaudeIcon from "@lobehub/icons/es/Claude/components/Color"
import GeminiIcon from "@lobehub/icons/es/Gemini/components/Color"
import GemmaIcon from "@lobehub/icons/es/Gemma/components/Color"
import GrokIcon from "@lobehub/icons/es/Grok/components/Mono"
import TIIIcon from "@lobehub/icons/es/TII/components/Color"
import ChatGLMIcon from "@lobehub/icons/es/ChatGLM/components/Color"

type IconComponent = ComponentType<{ size?: number }>

// Only catalog brands are imported; generic icon matchers also include unrelated media/product icons.
const icons: Record<string, IconComponent> = {
  deepseek: DeepSeekIcon,
  zhipu: ZhipuIcon,
  minimax: MinimaxIcon,
  yi: YiIcon,
  internlm: InternLMIcon,
  baidu: BaiduIcon,
  stepfun: StepfunIcon,
  ai360: Ai360Icon,
  doubao: DoubaoIcon,
  meta: MetaIcon,
  openai: OpenAIIcon,
  anthropic: AnthropicIcon,
  google: GoogleIcon,
  deepmind: DeepMindIcon,
  mistral: MistralIcon,
  microsoft: MicrosoftIcon,
  cohere: CohereIcon,
  ai21: Ai21Icon,
  perplexity: PerplexityIcon,
  huggingface: HuggingFaceIcon,
  xai: XAIIcon,
  stability: StabilityIcon,
  nvidia: NvidiaIcon,
  aws: AwsIcon,
  ai2: Ai2Icon,
  cursor: CursorIcon,
  qwen: QwenIcon,
  claude: ClaudeIcon,
  gemini: GeminiIcon,
  gemma: GemmaIcon,
  grok: GrokIcon,
  llama: MetaIcon,
  phi: MicrosoftIcon,
  falcon: TIIIcon,
  chatglm: ChatGLMIcon,
}

const aliases: Record<string, string> = {
  "deepseek-ai": "deepseek", "zhipu ai": "zhipu", "zai-org": "zhipu", "thudm": "zhipu",
  "01.ai": "yi", "01-ai": "yi", "shanghai ai lab": "internlm", "step": "stepfun",
  "mistral ai": "mistral", "mistralai": "mistral", "google deepmind": "deepmind",
  "ai21 labs": "ai21", "hugging face": "huggingface", "stability ai": "stability",
  "amazon": "aws", "allen ai": "ai2", "allenai": "ai2", "llama team": "meta",
}
const normalize = (name: string) => aliases[name.toLowerCase()] ?? name.toLowerCase()
const orgProviders = new Map<string, string>()
for (const [name, config] of Object.entries(providersData.providers)) {
  const key = normalize(name)
  for (const alias of [name, config.i18n.en, config.i18n.zh]) aliases[alias.toLowerCase()] = key
  for (const org of config.orgs ?? []) orgProviders.set(org.toLowerCase(), key)
}

export function ProviderIcon({ provider, size = 18 }: { provider: string; size?: number }) {
  const Icon = icons[normalize(provider)] ?? Building2
  return <Icon size={size} />
}

const modelBrands: [RegExp, string][] = [
  [/claude/i, "claude"], [/gemini/i, "gemini"], [/gemma/i, "gemma"],
  [/grok/i, "grok"], [/llama/i, "llama"], [/phi[-\d]/i, "phi"],
  [/falcon/i, "falcon"], [/glm/i, "chatglm"], [/deepseek/i, "deepseek"],
  [/qwen|qwq|qvq/i, "qwen"], [/gpt|^o[134](?:-|$)/i, "openai"],
]

export function ModelIcon({ model, provider, size = 18 }: { model: string; provider?: string | null; size?: number }) {
  const [org, name = org] = model.split("/")
  const match = modelBrands.find(([pattern]) => pattern.test(name))
  const key = match?.[1] ?? orgProviders.get(org.toLowerCase()) ?? normalize(provider ?? org)
  const Icon = icons[key] ?? Box
  return <Icon size={size} />
}
