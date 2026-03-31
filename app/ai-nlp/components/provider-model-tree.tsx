"use client"

import { Bot, Plus, Server } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TreeView, type TreeDataItem } from "@/components/tree-view"
import type { AIModel, AIProvider } from "@/lib/link-iq-types"

type Props = {
  providers: AIProvider[]
  models: AIModel[]
  selectedProviderID: string
  selectedModelKey: string
  onSelectProvider: (provider: AIProvider) => void
  onSelectModel: (provider: AIProvider, model: AIModel) => void
  onCreateProvider: () => void
}

export function ProviderModelTree({
  providers,
  models,
  selectedProviderID,
  selectedModelKey,
  onSelectProvider,
  onSelectModel,
  onCreateProvider,
}: Props) {
  const treeData: TreeDataItem[] = providers.map((provider) => {
    const providerModels = models
      .filter((model) => model.provider_id === provider.provider_id)
      .sort((left, right) => left.label.localeCompare(right.label))

    return {
      id: `provider:${provider.provider_id}`,
      name: provider.label,
      icon: Server,
      onClick: () => onSelectProvider(provider),
      children: providerModels.map((model) => ({
        id: `model:${model.model_id}`,
        name: model.label,
        icon: Bot,
        onClick: () => onSelectModel(provider, model),
      })),
    }
  })

  const selectedItemId = selectedModelKey.startsWith("enabled:")
    ? `model:${selectedModelKey.slice("enabled:".length)}`
    : selectedProviderID
      ? `provider:${selectedProviderID}`
      : undefined

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">Providers & models</div>
        <Button size="sm" variant="outline" onClick={onCreateProvider}>
          <Plus className="size-4" />
          New
        </Button>
      </div>
      <div className="min-h-0 overflow-hidden rounded-lg border">
        <TreeView
          data={treeData}
          initialSelectedItemId={selectedItemId}
          className="h-full min-h-0 overflow-auto"
        />
      </div>
    </div>
  )
}
