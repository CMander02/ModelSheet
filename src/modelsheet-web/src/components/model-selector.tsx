import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import type { ModelInfo } from "@/lib/types"

interface ModelSelectorProps {
  models: ModelInfo[]
  selectedModels: ModelInfo[]
  onSelectModel: (model: ModelInfo) => void
}

export function ModelSelector({
  models,
  selectedModels,
  onSelectModel,
}: ModelSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredModels = models.filter((model) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      model.name?.toLowerCase().includes(searchLower) ||
      model.provider?.toLowerCase().includes(searchLower)
    )
  })

  const isSelected = (model: ModelInfo) => {
    return selectedModels.some((m) => m.id === model.id)
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="搜索模型..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
        {filteredModels.map((model) => (
          <div
            key={model.id}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              isSelected(model)
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => onSelectModel(model)}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={isSelected(model)}
                onCheckedChange={() => onSelectModel(model)}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{model.name}</h3>
                <p className="text-xs text-muted-foreground truncate">
                  {model.provider}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredModels.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          没有找到匹配的模型
        </div>
      )}
    </div>
  )
}
