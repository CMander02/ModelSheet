import type { Language } from "./i18n"

const LABELS: Record<string, [string, string]> = {
  choice: ["选择", "Choice"], score: ["评分", "Score"], ranking: ["排序", "Ranking"],
  routing: ["路由", "Routing"], abstention: ["拒绝", "Abstention"],
  "single-forward": ["单次前向", "Single forward"], contrastive: ["对比评分", "Contrastive"], api: ["托管 API", "Hosted API"],
}
export function decisionLabel(value: string, language: Language): string {
  return LABELS[value]?.[language === "zh" ? 0 : 1] ?? value
}
export const DECISION_TYPES = ["choice", "score", "ranking", "routing", "abstention"] as const
