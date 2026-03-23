"use client"

import * as React from "react"
import { ExternalLink, Lock, RotateCcw, Save } from "lucide-react"
import { toast } from "sonner"

import { updateConfig, uploadConfigLogo } from "@/app/config/actions"
import { configCategories, configOptions, configOptionTypes, type ConfigOption } from "@/app/config/config-options"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type ConfigRecord = Record<string, unknown> & { id?: number }

function normalizeConfig(initialConfig: unknown): ConfigRecord {
  if (Array.isArray(initialConfig)) {
    const first = initialConfig[0]
    return first && typeof first === "object" ? (first as ConfigRecord) : {}
  }

  return initialConfig && typeof initialConfig === "object" ? (initialConfig as ConfigRecord) : {}
}

function comparableConfig(config: ConfigRecord) {
  return JSON.stringify(config)
}

function toJsonEditorValue(value: unknown) {
  if (value == null || value === "") return ""
  if (typeof value === "string") return value
  return JSON.stringify(value, null, 2)
}

function parseJsonEditorValue(value: string) {
  if (!value.trim()) {
    return null
  }
  return JSON.parse(value)
}

function getFieldError(option: ConfigOption, value: unknown) {
  if (option.type !== configOptionTypes.json) {
    return null
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return null
  }

  try {
    JSON.parse(value)
    return null
  } catch {
    return "Invalid JSON"
  }
}

function docsUrl(configKey: string) {
  return `https://docs.paperless-ngx.com/configuration/#${configKey.toLowerCase()}`
}

function FieldCard({
  canEdit,
  children,
  onReset,
  option,
  resetDisabled,
}: {
  canEdit: boolean
  children: React.ReactNode
  onReset: () => void
  option: ConfigOption
  resetDisabled: boolean
}) {
  return (
    <Card size="sm" className="bg-muted/15">
      <CardHeader className="gap-2 border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>{option.title}</CardTitle>
            <CardDescription className="mt-1">
              {option.description ?? option.note ?? option.configKey}
            </CardDescription>
            {option.description && (
              <div className="mt-1 text-[0.7rem] text-muted-foreground/80">
                {option.configKey}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" asChild>
              <a href={docsUrl(option.configKey)} target="_blank" rel="noreferrer" aria-label={`Open docs for ${option.title}`}>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={resetDisabled || !canEdit} onClick={onReset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2">{children}</CardContent>
    </Card>
  )
}

export function SettingsForm({
  initialConfig,
  canEdit = true,
}: {
  initialConfig: unknown
  canEdit?: boolean
}) {
  const normalizedInitialConfig = React.useMemo(() => normalizeConfig(initialConfig), [initialConfig])
  const [config, setConfig] = React.useState<ConfigRecord>(normalizedInitialConfig)
  const [initialSnapshot, setInitialSnapshot] = React.useState(() => comparableConfig(normalizedInitialConfig))
  const [saving, setSaving] = React.useState(false)
  const [logoFile, setLogoFile] = React.useState<File | null>(null)

  React.useEffect(() => {
    setConfig(normalizedInitialConfig)
    setInitialSnapshot(comparableConfig(normalizedInitialConfig))
    setLogoFile(null)
  }, [normalizedInitialConfig])

  const jsonErrors = React.useMemo(() => {
    return Object.fromEntries(
      configOptions
        .filter((option) => option.key in config)
        .map((option) => [option.key, getFieldError(option, config[option.key])])
        .filter((entry) => entry[1] != null)
    ) as Record<string, string>
  }, [config])

  const availableOptions = React.useMemo(
    () => configOptions.filter((option) => option.key in config),
    [config]
  )

  const categories = React.useMemo(() => {
    return Object.values(configCategories).filter((category) =>
      availableOptions.some((option) => option.category === category)
    )
  }, [availableOptions])

  const unknownOptions = React.useMemo(() => {
    const knownKeys = new Set(configOptions.map((option) => option.key))
    return Object.fromEntries(
      Object.entries(config).filter(([key]) => !knownKeys.has(key))
    )
  }, [config])

  const isEmpty = Object.keys(config).length === 0
  const isDirty = initialSnapshot !== comparableConfig(config) || Boolean(logoFile)
  const hasErrors = Object.keys(jsonErrors).length > 0

  const setValue = React.useCallback((key: string, value: unknown) => {
    setConfig((current) => ({ ...current, [key]: value }))
  }, [])

  const resetValue = React.useCallback((key: string) => {
    setConfig((current) => ({ ...current, [key]: null }))
    if (key === "app_logo") {
      setLogoFile(null)
    }
  }, [])

  const saveConfig = React.useCallback(async () => {
    if (!config.id) {
      toast.error("Configuration record is missing an id")
      return
    }
    if (hasErrors) {
      toast.error("Fix invalid JSON fields before saving")
      return
    }

    setSaving(true)
    try {
      let workingConfig = config

      if (logoFile) {
        workingConfig = (await uploadConfigLogo(config.id, logoFile)) as ConfigRecord
      }

      const payload = Object.fromEntries(
        Object.entries(workingConfig)
          .filter(([key]) => key !== "id" && key !== "app_logo")
          .map(([key, value]) => {
            const option = configOptions.find((candidate) => candidate.key === key)
            if (option?.type === configOptionTypes.json && typeof value === "string") {
              return [key, parseJsonEditorValue(value)]
            }
            if ((option?.type === configOptionTypes.string || option?.type === configOptionTypes.password) && value === "") {
              return [key, null]
            }
            return [key, value]
          })
      )

      const updated = (await updateConfig(config.id, payload)) as ConfigRecord
      const nextState = {
        ...updated,
        user_args: toJsonEditorValue(updated.user_args),
        barcode_tag_mapping: toJsonEditorValue(updated.barcode_tag_mapping),
      }

      setConfig(nextState)
      setInitialSnapshot(comparableConfig(nextState))
      setLogoFile(null)
      toast.success("Configuration updated")
    } catch (error) {
      toast.error("Failed to save configuration", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSaving(false)
    }
  }, [config, hasErrors, logoFile])

  const discardChanges = React.useCallback(() => {
    setConfig(normalizedInitialConfig)
    setInitialSnapshot(comparableConfig(normalizedInitialConfig))
    setLogoFile(null)
  }, [normalizedInitialConfig])

  if (isEmpty) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        <p className="text-sm">Application configuration is not available.</p>
        <p className="mt-1 text-xs">This feature requires a Paperless-ngx version that exposes the config endpoint.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Global configuration options for this Paperless-ngx installation. Values set here override defaults for every user.
      </p>

      {!canEdit && (
        <div className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          You can view this configuration, but you do not have permission to change it.
        </div>
      )}

      <Tabs defaultValue={categories[0]} className="gap-4">
        <div className="flex flex-col gap-3 border-b pb-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="overflow-x-auto">
            <TabsList variant="line" className="min-w-max justify-start p-0">
              {categories.map((category) => (
                <TabsTrigger key={category} value={category} className="px-3">
                  {category}
                </TabsTrigger>
              ))}
              {Object.keys(unknownOptions).length > 0 && (
                <TabsTrigger value="other-settings" className="px-3">
                  Other Settings
                </TabsTrigger>
              )}
            </TabsList>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={!canEdit || saving || !isDirty} onClick={discardChanges}>
              Discard
            </Button>
            <Button type="button" disabled={!canEdit || saving || !isDirty || hasErrors} onClick={() => void saveConfig()}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving…" : "Save configuration"}
            </Button>
          </div>
        </div>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="m-0">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {availableOptions
                .filter((option) => option.category === category)
                .map((option) => {
                  const value = config[option.key]
                  const error = jsonErrors[option.key]

                  return (
                    <FieldCard
                      canEdit={canEdit}
                      key={option.key}
                      option={option}
                      onReset={() => resetValue(option.key)}
                      resetDisabled={value == null && !(option.key === "app_logo" && logoFile)}
                    >
                      {option.type === configOptionTypes.select && option.choices ? (
                        <Select
                          value={typeof value === "string" ? value : "__unset__"}
                          onValueChange={(nextValue) => setValue(option.key, nextValue === "__unset__" ? null : nextValue)}
                          disabled={!canEdit}
                        >
                          <SelectTrigger className="h-9 w-full text-sm">
                            <SelectValue placeholder="Use default" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unset__">Use default</SelectItem>
                            {option.choices.map((choice) => (
                              <SelectItem key={choice.id} value={choice.id}>
                                {choice.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}

                      {option.type === configOptionTypes.number ? (
                        <Input
                          type="number"
                          className="h-9 text-sm"
                          disabled={!canEdit}
                          value={typeof value === "number" ? String(value) : ""}
                          onChange={(event) =>
                            setValue(option.key, event.target.value === "" ? null : Number(event.target.value))
                          }
                          placeholder="Use default"
                        />
                      ) : null}

                      {option.type === configOptionTypes.boolean ? (
                        <div className="flex items-center justify-between rounded-md border border-border/70 bg-background px-3 py-2">
                          <div>
                            <div className="text-sm font-medium">{value == null ? "Use default" : value ? "Enabled" : "Disabled"}</div>
                            <div className="text-xs text-muted-foreground">Unset to inherit the backend default.</div>
                          </div>
                          <Switch
                            checked={Boolean(value)}
                            disabled={!canEdit}
                            onCheckedChange={(checked) => setValue(option.key, checked)}
                          />
                        </div>
                      ) : null}

                      {option.type === configOptionTypes.string || option.type === configOptionTypes.password ? (
                        <Input
                          type={option.type === configOptionTypes.password ? "password" : "text"}
                          className="h-9 text-sm"
                          disabled={!canEdit}
                          value={typeof value === "string" ? value : ""}
                          onChange={(event) => setValue(option.key, event.target.value)}
                          placeholder="Use default"
                        />
                      ) : null}

                      {option.type === configOptionTypes.json ? (
                        <>
                          <Textarea
                            className="min-h-28 font-mono text-xs"
                            disabled={!canEdit}
                            value={typeof value === "string" ? value : ""}
                            onChange={(event) => setValue(option.key, event.target.value)}
                            placeholder='{"example": true}'
                          />
                          {error ? <p className="text-xs text-destructive">{error}</p> : null}
                        </>
                      ) : null}

                      {option.type === configOptionTypes.file ? (
                        <div className="grid gap-3">
                          {typeof value === "string" && value ? (
                            <div className="grid gap-1">
                              <div className="text-xs font-medium text-muted-foreground">Current file</div>
                              <div className="flex items-center gap-3 rounded-md border border-border/70 bg-background px-3 py-3">
                                <div
                                  className="size-12 rounded-lg bg-contain bg-center bg-no-repeat ring-1 ring-border"
                                  style={{ backgroundImage: `url(${value})` }}
                                  aria-hidden="true"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-medium">Current logo preview</div>
                                  <div className="text-[0.7rem] text-muted-foreground">
                                    This is the image currently served by Paperless.
                                  </div>
                                </div>
                              </div>
                              <code className="rounded-md border bg-background px-3 py-2 text-[0.7rem]">{value}</code>
                            </div>
                          ) : (
                            <Badge variant="outline">No file configured</Badge>
                          )}
                          {logoFile ? (
                            <div className="grid gap-2">
                              <Badge variant="secondary" className="w-fit">
                                Ready to upload: {logoFile.name}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                The selected logo is staged locally until you save the configuration.
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={!canEdit || saving || hasErrors}
                                  onClick={() => void saveConfig()}
                                >
                                  {saving ? "Uploading…" : "Upload and save now"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={!canEdit || saving}
                                  onClick={() => setLogoFile(null)}
                                >
                                  Clear selection
                                </Button>
                              </div>
                            </div>
                          ) : null}
                          <Input
                            type="file"
                            accept="image/*,.svg"
                            className="h-9 text-sm"
                            disabled={!canEdit}
                            onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                          />
                        </div>
                      ) : null}
                    </FieldCard>
                  )
                })}
            </div>
          </TabsContent>
        ))}

        {Object.keys(unknownOptions).length > 0 && (
          <TabsContent value="other-settings" className="m-0">
            <Card>
              <CardHeader>
                <CardTitle>Other settings</CardTitle>
                <CardDescription>Backend keys not yet described in the UI metadata.</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="max-h-[28rem] overflow-auto rounded-md bg-muted/30 p-4 text-xs">
                  {JSON.stringify(unknownOptions, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
