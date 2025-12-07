"use client"

import type { ModelInfo } from "@/lib/types"
import type { Language } from "@/lib/i18n"
import { getTranslations } from "@/lib/i18n"
import { formatParameters, formatDate, formatContextLength } from "@/lib/model-utils"
import { Copy, Check } from "lucide-react"
import { useState } from "react"

interface ModelCardProps {
  model: ModelInfo
  onClose?: () => void
  language: Language
}

export function ModelCard({ model, onClose, language }: ModelCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const t = getTranslations(language)

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const DetailSection = ({
    title,
    items,
  }: {
    title: string
    items: Array<{ label: string; value: any; copyable?: boolean }>
  }) => {
    const hasContent = items.some((item) => item.value !== undefined && item.value !== null && item.value !== "-")

    if (!hasContent) return null

    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="grid gap-2 pl-4 border-l border-border">
          {items.map(
            (item) =>
              item.value !== undefined &&
              item.value !== null && (
                <div key={item.label} className="flex items-start justify-between gap-4">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground text-right">
                      {Array.isArray(item.value) ? item.value.join(", ") : String(item.value)}
                    </span>
                    {item.copyable && (
                      <button
                        onClick={() => copyToClipboard(String(item.value), item.label)}
                        className="p-1 hover:bg-muted rounded transition-colors"
                        title="复制"
                      >
                        {copiedField === item.label ? (
                          <Check className="h-3 w-3 text-primary" />
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ),
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 max-w-4xl mx-auto">
      {/* 关闭按钮 */}
      {onClose && (
        <button
          onClick={onClose}
          className="mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {t.common.back}
        </button>
      )}

      {/* 模型头部 */}
      <div className="space-y-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{model.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {model.provider && `${t.common.provider}: ${model.provider}`}
          </p>
        </div>

        {/* 主要参数徽章 */}
        <div className="flex flex-wrap gap-2">
          {model.releaseDate && (
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
              <span className="text-xs text-primary font-medium">{formatDate(model.releaseDate)}</span>
            </div>
          )}
          {model.totalParameters && (
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1">
              <span className="text-xs text-accent font-medium">{formatParameters(model.totalParameters)}</span>
            </div>
          )}
          {model.contextLength && (
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-3 py-1">
              <span className="text-xs text-purple-500 font-medium">
                {t.common.search}: {formatContextLength(model.contextLength)}
              </span>
            </div>
          )}
          {model.moe && (
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1">
              <span className="text-xs text-orange-500 font-medium">MoE</span>
            </div>
          )}
          {model.isInferenceModel && (
            <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1">
              <span className="text-xs text-green-500 font-medium">{t.common.inferenceModel}</span>
            </div>
          )}
        </div>
      </div>

      {/* 详细信息 */}
      <div className="space-y-6 divide-y divide-border">
        {/* 基本信息 */}
        <DetailSection
          title="基本信息"
          items={[
            { label: "模型 ID", value: model.id, copyable: true },
            { label: "模型类型", value: model.modelType },
            { label: t.common.baseModel, value: model.baseModel },
            { label: t.common.provider, value: model.provider },
          ]}
        />

        {/* 规模和性能 */}
        <DetailSection
          title="规模和性能"
          items={[
            {
              label: t.common.parameters,
              value: model.totalParameters ? formatParameters(model.totalParameters) : "-",
            },
            { label: "训练 Token 数", value: model.trainingTokens ? formatParameters(model.trainingTokens) : "-" },
            { label: "上下文长度", value: model.contextLength ? formatContextLength(model.contextLength) : "-" },
            { label: "Embedding 维度", value: model.embeddingDim },
            { label: "架构", value: model.architecture },
            { label: "MoE 架构", value: model.moe ? "是" : "否" },
          ]}
        />

        {/* 模态和编码 */}
        <DetailSection
          title="模态和编码"
          items={[
            { label: "输入模态", value: model.inputModalities?.join(", ") },
            { label: "输出模态", value: model.outputModalities?.join(", ") },
            { label: "位置编码", value: model.positionEncoding },
          ]}
        />

        {/* 部署和优化 */}
        <DetailSection
          title="部署和优化"
          items={[
            { label: t.common.inferenceModel, value: model.isInferenceModel ? "是" : "否" },
            { label: "量化支持", value: model.quantizationSupport?.join(", ") },
            { label: "训练数据", value: model.trainingData },
            { label: "许可证", value: model.licensingInfo },
          ]}
        />

        {/* 发布信息 */}
        <DetailSection
          title="发布信息"
          items={[{ label: t.common.releaseDate, value: model.releaseDate ? formatDate(model.releaseDate) : "-" }]}
        />
      </div>

      {/* 数据完整度指示 */}
      <div className="mt-6 pt-6 border-t border-border">
        <div className="text-xs text-muted-foreground">
          此模型的信息完整度：
          {Math.round(
            ((Object.values(model).filter((v) => v !== undefined && v !== null && v !== "").length /
              Object.keys(model).length) *
              100) as unknown as number,
          )}
          %
        </div>
      </div>
    </div>
  )
}
