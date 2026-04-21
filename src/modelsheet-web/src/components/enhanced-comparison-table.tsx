/**
 * Enhanced comparison table with e-commerce style layout
 * 电商比价风格的模型对比表格
 */

import { X, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { ModelInfo, ColumnConfig, ComplexityLevel } from "@/lib/types"
import { COMPLEXITY_PRESETS } from "@/lib/model-data"
import { formatValue, getHighlightClass } from "@/lib/formatters"
import { ModelBrandIcon, ProviderBrandIcon } from "@/components/brand-icon"
import { ParamCell } from "@/components/param-cell"

interface EnhancedComparisonTableProps {
  models: ModelInfo[]
  columns: ColumnConfig[]
  onRemoveModel: (modelId: string) => void
  complexity: ComplexityLevel
}

export function EnhancedComparisonTable({
  models,
  columns,
  onRemoveModel,
  complexity,
}: EnhancedComparisonTableProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    architecture: false,
    moe: false,
    tokenizer: false,
  })

  const preset = COMPLEXITY_PRESETS[complexity]
  const visibleColumns = columns.filter((col) => preset.columns.includes(col.key))

  // Group columns by category
  const basicFields = ["name", "provider", "totalParameters", "activeParameters", "contextLength", "embeddingDim", "vocabSize"]
  const architectureFields = ["architecture", "numLayers", "numHeads", "numKvHeads", "hiddenSize", "intermediateSize", "positionEncoding", "activation", "normType", "mlpFactor", "gqaRatio"]
  const moeFields = ["isMoe", "numExperts", "numExpertsPerToken"]
  const tokenizerFields = ["hasChatTemplate", "bosToken", "eosToken"]
  const typeFields = ["isAdapter", "baseModel"]

  const groupedColumns = {
    basic: visibleColumns.filter(col => basicFields.includes(col.key)),
    architecture: visibleColumns.filter(col => architectureFields.includes(col.key)),
    moe: visibleColumns.filter(col => moeFields.includes(col.key)),
    tokenizer: visibleColumns.filter(col => tokenizerFields.includes(col.key)),
    type: visibleColumns.filter(col => typeFields.includes(col.key)),
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const renderModelCard = (model: ModelInfo) => (
    <div key={model.id} className="flex-1 min-w-[280px] max-w-[400px]">
      <div className="rounded-lg border bg-card h-full shadow-sm hover:shadow-md transition-shadow">
        {/* Model Header - 增强视觉层级 */}
        <div className="p-6 border-b bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              {model.huggingfaceUrl ? (
                <a
                  href={model.huggingfaceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-bold text-xl truncate mb-1 hover:text-primary hover:underline transition-colors"
                >
                  <ModelBrandIcon model={model.id} size={22} />
                  <span className="truncate">{model.name}</span>
                </a>
              ) : (
                <h3 className="inline-flex items-center gap-2 font-bold text-xl truncate mb-1">
                  <ModelBrandIcon model={model.id} size={22} />
                  <span className="truncate">{model.name}</span>
                </h3>
              )}
              <p className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground mt-1">
                <ProviderBrandIcon provider={model.provider} size={14} />
                <span>{model.provider}</span>
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onRemoveModel(model.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Key Specs */}
          <div className="grid grid-cols-1 gap-1 mt-4">
            <div className="flex justify-between items-center px-3 py-1.5">
              <span className="text-xs text-muted-foreground">参数量</span>
              <span className="font-bold text-sm">
                <ParamCell value={model.totalParameters} model={model} />
              </span>
            </div>
            {model.activeParameters && (
              <div className="flex justify-between items-center px-3 py-1.5">
                <span className="text-xs text-muted-foreground">激活参数</span>
                <span className="font-bold text-sm">
                  <ParamCell value={model.activeParameters} model={model} />
                </span>
              </div>
            )}
            <div className="flex justify-between items-center px-3 py-1.5">
              <span className="text-xs text-muted-foreground">上下文</span>
              <span className="font-bold text-sm">
                {formatValue(model.contextLength, "number", "contextLength")}
              </span>
            </div>
          </div>
        </div>

        {/* Model Details */}
        <div className="divide-y">
          {/* Basic Info */}
          {groupedColumns.basic.length > 0 && (
            <DetailsSection
              title="基础信息"
              fields={groupedColumns.basic.filter(c => !["name", "provider", "totalParameters", "activeParameters", "contextLength"].includes(c.key))}
              model={model}
              models={models}
              isExpanded={expandedSections.basic}
              onToggle={() => toggleSection("basic")}
            />
          )}

          {/* Architecture */}
          {groupedColumns.architecture.length > 0 && (
            <DetailsSection
              title="架构参数"
              fields={groupedColumns.architecture}
              model={model}
              models={models}
              isExpanded={expandedSections.architecture}
              onToggle={() => toggleSection("architecture")}
            />
          )}

          {/* MoE */}
          {groupedColumns.moe.length > 0 && model.isMoe && (
            <DetailsSection
              title="MoE配置"
              fields={groupedColumns.moe}
              model={model}
              models={models}
              isExpanded={expandedSections.moe}
              onToggle={() => toggleSection("moe")}
            />
          )}

          {/* Tokenizer */}
          {groupedColumns.tokenizer.length > 0 && (
            <DetailsSection
              title="Tokenizer"
              fields={groupedColumns.tokenizer}
              model={model}
              models={models}
              isExpanded={expandedSections.tokenizer}
              onToggle={() => toggleSection("tokenizer")}
            />
          )}

          {/* Type Flags */}
          {groupedColumns.type.length > 0 && (
            <DetailsSection
              title="类型标记"
              fields={groupedColumns.type}
              model={model}
              models={models}
              isExpanded={expandedSections.type}
              onToggle={() => toggleSection("type")}
            />
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Comparison Grid */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {models.map(renderModelCard)}
      </div>
    </div>
  )
}

interface DetailsSectionProps {
  title: string
  fields: ColumnConfig[]
  model: ModelInfo
  models: ModelInfo[]
  isExpanded: boolean
  onToggle: () => void
}

function DetailsSection({ title, fields, model, models, isExpanded, onToggle }: DetailsSectionProps) {
  if (fields.length === 0) return null

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors group"
      >
        <span className="font-semibold text-sm group-hover:text-primary transition-colors">{title}</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 py-3 space-y-2.5 bg-muted/10 animate-in fade-in-50 duration-200">
          {fields.map((col) => {
            const value = model[col.key]
            const allValues = col.type === "number"
              ? models.map(m => m[col.key] as number | undefined)
              : []
            const highlightClass = col.type === "number"
              ? getHighlightClass(value as number, allValues)
              : ""

            return (
              <div key={col.key} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">{col.label}</span>
                <span className={`font-semibold ${highlightClass} px-2 py-0.5 rounded transition-colors`}>
                  {col.key === "huggingfaceUrl" && value ? (
                    <a
                      href={value as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary hover:underline transition-colors"
                    >
                      {(value as string).replace(/^https?:\/\/huggingface\.co\//, '')}
                    </a>
                  ) : col.key === "arxivUrl" && value ? (
                    <a
                      href={value as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary hover:underline transition-colors"
                    >
                      {(value as string).match(/(\d{4}\.\d{4,5})/)?.[1] || value}
                    </a>
                  ) : (
                    formatValue(value, col.type, col.key)
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
