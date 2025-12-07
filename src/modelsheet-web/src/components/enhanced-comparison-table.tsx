/**
 * Enhanced comparison table with e-commerce style layout
 * 电商比价风格的模型对比表格
 */

import { X, ExternalLink, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { ModelInfo, ColumnConfig, ComplexityLevel } from "@/lib/types"
import { COMPLEXITY_PRESETS } from "@/lib/model-data"
import { formatValue, getHighlightClass } from "@/lib/formatters"

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
      <div className="rounded-lg border bg-card h-full">
        {/* Model Header */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{model.name}</h3>
              <p className="text-sm text-muted-foreground">{model.provider}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onRemoveModel(model.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Key Specs */}
          <div className="space-y-1 mt-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">参数量:</span>
              <span className="font-semibold">
                {formatValue(model.totalParameters, "number", "totalParameters")}
              </span>
            </div>
            {model.activeParameters && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">激活参数:</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {formatValue(model.activeParameters, "number", "activeParameters")}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">上下文:</span>
              <span className="font-semibold">
                {formatValue(model.contextLength, "number", "contextLength")}
              </span>
            </div>
          </div>

          {/* Links */}
          {model.huggingfaceUrl && (
            <a
              href={model.huggingfaceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
            >
              <ExternalLink className="h-3 w-3" />
              HuggingFace
            </a>
          )}
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
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <span className="font-medium text-sm">{title}</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 py-2 space-y-2">
          {fields.map((col) => {
            const value = model[col.key]
            const allValues = col.type === "number"
              ? models.map(m => m[col.key] as number | undefined)
              : []
            const highlightClass = col.type === "number"
              ? getHighlightClass(value as number, allValues)
              : ""

            return (
              <div key={col.key} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{col.label}:</span>
                <span className={`font-medium ${highlightClass} px-1 rounded`}>
                  {formatValue(value, col.type, col.key)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
