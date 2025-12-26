/**
 * Custom field selector dialog for "custom" complexity level
 * 自定义复杂度字段选择器
 */

import { useState, useEffect } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ColumnConfig } from "@/lib/types"

interface CustomFieldSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  allColumns: ColumnConfig[]
  selectedKeys: string[]
  onSave: (selectedKeys: string[]) => void
}

// 字段分组
const FIELD_GROUPS = {
  basic: {
    label: "基础信息",
    labelEn: "Basic Information",
    fields: ["name", "provider", "totalParameters", "activeParameters", "contextLength", "embeddingDim", "vocabSize"]
  },
  architecture: {
    label: "架构参数",
    labelEn: "Architecture",
    fields: ["architecture", "numLayers", "numHeads", "numKvHeads", "hiddenSize", "intermediateSize", "positionEncoding", "activation", "normType", "normEps", "attentionDropout", "mlpFactor", "gqaRatio"]
  },
  moe: {
    label: "MoE配置",
    labelEn: "MoE Configuration",
    fields: ["isMoe", "numExperts", "numSharedExperts", "numExpertsPerToken", "numActivatedExperts", "moeIntermediateSize"]
  },
  modalities: {
    label: "模态",
    labelEn: "Modalities",
    fields: ["inputModalities", "outputModalities"]
  },
  other: {
    label: "其他信息",
    labelEn: "Other Information",
    fields: ["huggingfaceUrl", "arxivUrl", "techReport", "createdAt"]
  }
}

export function CustomFieldSelector({
  open,
  onOpenChange,
  allColumns,
  selectedKeys,
  onSave,
}: CustomFieldSelectorProps) {
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selectedKeys))

  // 当对话框打开时重置本地状态
  useEffect(() => {
    if (open) {
      setLocalSelected(new Set(selectedKeys))
    }
  }, [open, selectedKeys])

  const handleToggle = (key: string) => {
    setLocalSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleToggleGroup = (groupFields: string[]) => {
    const allSelected = groupFields.every(field => localSelected.has(field))
    setLocalSelected(prev => {
      const next = new Set(prev)
      if (allSelected) {
        // 取消全选
        groupFields.forEach(field => next.delete(field))
      } else {
        // 全选
        groupFields.forEach(field => next.add(field))
      }
      return next
    })
  }

  const handleSave = () => {
    onSave(Array.from(localSelected))
    onOpenChange(false)
  }

  const handleReset = () => {
    // 重置为所有字段
    setLocalSelected(new Set(allColumns.map(col => col.key)))
  }

  const handleSelectNone = () => {
    // 清空选择(但至少保留name)
    setLocalSelected(new Set(["name"]))
  }

  // 按分组组织列
  const groupedColumns: Record<string, ColumnConfig[]> = {}
  Object.entries(FIELD_GROUPS).forEach(([groupKey, group]) => {
    groupedColumns[groupKey] = allColumns.filter(col => group.fields.includes(col.key))
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>自定义显示字段</DialogTitle>
          <DialogDescription>
            选择要显示的模型参数字段。已选择 {localSelected.size} / {allColumns.length} 个字段
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {Object.entries(FIELD_GROUPS).map(([groupKey, group]) => {
              const groupCols = groupedColumns[groupKey]
              if (groupCols.length === 0) return null

              const allSelected = groupCols.every(col => localSelected.has(col.key))
              const someSelected = groupCols.some(col => localSelected.has(col.key))

              return (
                <div key={groupKey} className="space-y-3">
                  {/* Group Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={someSelected && !allSelected ? "indeterminate" : allSelected}
                        onCheckedChange={() => handleToggleGroup(group.fields)}
                      />
                      <h3 className="font-semibold text-sm">
                        {group.label}
                        <span className="text-muted-foreground ml-2 font-normal">
                          ({groupCols.filter(col => localSelected.has(col.key)).length}/{groupCols.length})
                        </span>
                      </h3>
                    </div>
                  </div>

                  {/* Group Fields */}
                  <div className="ml-6 grid grid-cols-3 gap-3">
                    {groupCols.map((col) => (
                      <div key={col.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`field-${col.key}`}
                          checked={localSelected.has(col.key)}
                          onCheckedChange={() => handleToggle(col.key)}
                          disabled={col.key === "name"} // name字段必选
                        />
                        <label
                          htmlFor={`field-${col.key}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {col.label}
                          {col.key === "name" && (
                            <span className="text-xs text-muted-foreground ml-1">(必选)</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <div className="flex-1 flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectNone}>
              清空
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              全选
            </Button>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>
            <Check className="mr-2 h-4 w-4" />
            应用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
