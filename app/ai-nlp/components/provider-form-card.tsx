"use client"

import { Database, Save, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AIProvider } from "@/lib/link-iq-types"

type Props = {
  providerDraft: AIProvider
  providerSourceValue: string
  providerAdvancedOpen: boolean
  savingProvider: boolean
  deletingProvider: boolean
  onProviderAdvancedOpenChange: (open: boolean) => void
  onDraftChange: (updater: (current: AIProvider) => AIProvider) => void
  onProviderSourceChange: (value: string) => void
  onDelete: () => void
  onSave: () => void
}

export function ProviderFormCard({
  providerDraft,
  providerSourceValue,
  providerAdvancedOpen,
  savingProvider,
  deletingProvider,
  onProviderAdvancedOpenChange,
  onDraftChange,
  onProviderSourceChange,
  onDelete,
  onSave,
}: Props) {
  const isEditing = Boolean(providerDraft.provider_id)
  const providerLabel = providerDraft.label.trim() || "Provider"

  return (
    <Card className="min-h-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="mb-2 flex flex-wrap items-center gap-2">
          {isEditing ? (
            <>
              <span>Editing</span>
              <span className="ui-card-title rounded-md bg-primary/10 px-2 text-primary">
                {providerLabel}
              </span>
            </>
          ) : (
            "Create new Provider"
          )}
        </CardTitle>
        <CardDescription>
          Define the base URL, API key, and compatibility settings for OpenAI-compatible providers or Anthropic native endpoints.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        <div className="ui-field-stack">
          <Label htmlFor="provider-label">Label</Label>
          <Input
            id="provider-label"
            value={providerDraft.label}
            onChange={(event) =>
              onDraftChange((current) => ({ ...current, label: event.target.value }))
            }
          />
        </div>
        <div className="ui-field-stack">
          <Label htmlFor="provider-status">Status</Label>
          <Select
            value={providerDraft.status}
            onValueChange={(value) =>
              onDraftChange((current) => ({ ...current, status: value }))
            }
          >
            <SelectTrigger id="provider-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ui-field-stack">
          <Label htmlFor="provider-type">Provider Source</Label>
          <Select value={providerSourceValue} onValueChange={onProviderSourceChange}>
            <SelectTrigger id="provider-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="external">External</SelectItem>
              <SelectItem value="self_hosted">Self-hosted</SelectItem>
              <SelectItem value="linkiq">LinkIQ managed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ui-field-stack">
          <Label htmlFor="provider-compatibility">API Style</Label>
          <Select
            value={providerDraft.compatibility_mode || defaultCompatibilityMode(providerDraft.provider_type)}
            onValueChange={(value) =>
              onDraftChange((current) => ({ ...current, compatibility_mode: value }))
            }
          >
            <SelectTrigger id="provider-compatibility" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI-compatible</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ui-field-stack lg:col-span-2">
          <Label htmlFor="provider-base-url">Base API URL</Label>
          <Input
            id="provider-base-url"
            value={providerDraft.base_url}
            onChange={(event) =>
              onDraftChange((current) => ({ ...current, base_url: event.target.value }))
            }
            placeholder={
              providerDraft.compatibility_mode === "anthropic"
                ? "https://api.anthropic.com/v1"
                : "https://api.openai.com/v1"
            }
          />
        </div>
        <div className="ui-field-stack lg:col-span-2">
          <Label htmlFor="provider-api-key">API Key</Label>
          <Input
            id="provider-api-key"
            value={providerDraft.api_key ?? ""}
            onChange={(event) =>
              onDraftChange((current) => ({ ...current, api_key: event.target.value }))
            }
            placeholder={providerDraft.compatibility_mode === "anthropic" ? "sk-ant-..." : "sk-..."}
          />
        </div>
        <div className="ui-field-stack lg:col-span-2">
          <Label htmlFor="provider-description">Description</Label>
          <Input
            id="provider-description"
            value={providerDraft.description ?? ""}
            onChange={(event) =>
              onDraftChange((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
        </div>
        <div className="lg:col-span-2">
          <Collapsible
            open={providerAdvancedOpen}
            onOpenChange={onProviderAdvancedOpenChange}
            className="rounded-lg border"
          >
            <CollapsibleTrigger className="ui-card-title flex w-full items-center justify-between px-4 py-3 text-left text-sm">
              <span>Advanced settings...</span>
              <Badge variant="outline">{providerAdvancedOpen ? "Hide" : "Show"}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t">
              <div className="grid gap-4 p-4 lg:grid-cols-3">
                <div className="ui-field-stack">
                  <Label htmlFor="provider-organization">Organization</Label>
                  <Input
                    id="provider-organization"
                    value={providerDraft.organization ?? ""}
                    onChange={(event) =>
                      onDraftChange((current) => ({
                        ...current,
                        organization: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="ui-field-stack">
                  <Label htmlFor="provider-project">Project</Label>
                  <Input
                    id="provider-project"
                    value={providerDraft.project ?? ""}
                    onChange={(event) =>
                      onDraftChange((current) => ({ ...current, project: event.target.value }))
                    }
                  />
                </div>
                <div className="ui-field-stack">
                  <Label htmlFor="provider-timeout">Timeout Seconds</Label>
                  <Input
                    id="provider-timeout"
                    type="number"
                    value={providerDraft.timeout_seconds ?? 30}
                    onChange={(event) =>
                      onDraftChange((current) => ({
                        ...current,
                        timeout_seconds: Number(event.target.value) || 30,
                      }))
                    }
                  />
                </div>
                <div className="ui-field-stack lg:col-span-2">
                  <Label htmlFor="provider-pricing-url">Pricing Source URL</Label>
                  <Input
                    id="provider-pricing-url"
                    value={providerDraft.pricing_source_url ?? ""}
                    onChange={(event) =>
                      onDraftChange((current) => ({
                        ...current,
                        pricing_source_url: event.target.value,
                      }))
                    }
                    placeholder="https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json"
                  />
                </div>
                <div className="ui-field-stack">
                  <Label htmlFor="provider-pricing-refresh">Pricing Refresh Hours</Label>
                  <Input
                    id="provider-pricing-refresh"
                    type="number"
                    value={providerDraft.pricing_refresh_hours ?? 24}
                    onChange={(event) =>
                      onDraftChange((current) => ({
                        ...current,
                        pricing_refresh_hours: Number(event.target.value) || 24,
                      }))
                    }
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div className="ui-help-text min-w-0 flex-1">
              {providerDraft.compatibility_mode === "anthropic"
                ? "Uses Anthropic native headers and the Messages API."
                : "Uses OpenAI-compatible model listing and chat completions."}
            </div>
            <div className="flex items-center gap-2">
              {providerDraft.provider_id ? (
                <Button variant="outline" onClick={onDelete} disabled={deletingProvider || savingProvider}>
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              ) : null}
              <Button
                onClick={onSave}
                disabled={
                  savingProvider ||
                  !providerDraft.label.trim() ||
                  !providerDraft.base_url.trim()
                }
              >
                <Save className="size-4" />
                Save Provider
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function defaultCompatibilityMode(providerType: string) {
  return providerType === "anthropic" ? "anthropic" : "openai"
}
