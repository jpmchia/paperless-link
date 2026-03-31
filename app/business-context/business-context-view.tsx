"use client"

import * as React from "react"
import { Database, Plus, RefreshCw, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuditHistoryTable, type AuditHistoryColumn } from "@/components/audit-history-table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { deleteJson, getJson, postJson } from "@/lib/paperless-client"
import type { ContextField, ContextFieldHistoryEntry } from "@/lib/link-iq-types"

type Props = {
  initialFields: ContextField[]
  initialLoadError?: string | null
}

type FieldScope = "system" | "instance"

const BUSINESS_SECTION = "business_context"
const SCOPES: FieldScope[] = ["system", "instance"]

function emptyField(scope: FieldScope): ContextField {
  return {
    field_id: "",
    section: BUSINESS_SECTION,
    scope,
    key: "",
    label: "",
    description: "",
    field_mode: "input",
    data_type: "string",
    acceptable_values: [],
    sample_values: [],
    value: "",
    schema_locked: false,
    status: "active",
  }
}

function toLines(values?: string[]) {
  return (values ?? []).join("\n")
}

function fromLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function toSemicolon(values?: string[]) {
  return (values ?? []).join("; ")
}

function formatDateTime(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function describeDynamicSource(field: ContextField) {
  switch (field.dynamic_source) {
    case "source.document_types":
      return `Generated from Document Types${field.source_id ? ` in ${field.source_id}` : ""}`
    case "source.correspondents":
      return `Generated from Correspondents${field.source_id ? ` in ${field.source_id}` : ""}`
    case "link_iq.taxonomy_paths":
      return "Generated from active Link-IQ taxonomy paths"
    default:
      return "System-generated value"
  }
}

function slugifyKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export function BusinessContextView({ initialFields, initialLoadError = null }: Props) {
  const [fields, setFields] = React.useState(initialFields)
  const [scope, setScope] = React.useState<FieldScope>("system")
  const [selectedFieldId, setSelectedFieldId] = React.useState("")
  const [creatingNew, setCreatingNew] = React.useState(false)
  const [keyManuallyEdited, setKeyManuallyEdited] = React.useState(false)
  const [draft, setDraft] = React.useState<ContextField>(() => emptyField("system"))
  const [history, setHistory] = React.useState<ContextFieldHistoryEntry[]>([])
  const [loading, setLoading] = React.useState(false)
  const [historyLoading, setHistoryLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [regenerating, setRegenerating] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(initialLoadError)

  const historyColumns = React.useMemo<AuditHistoryColumn<ContextFieldHistoryEntry>[]>(
    () => [
      {
        id: "changed_at",
        label: "Date / time",
        defaultWidth: 170,
        minWidth: 140,
        sortable: true,
        sortValue: (row) => new Date(row.changed_at ?? "").getTime() || 0,
        render: (row) => formatDateTime(row.changed_at),
      },
      {
        id: "changed_by",
        label: "Changed by",
        defaultWidth: 150,
        minWidth: 130,
        sortable: true,
        sortValue: (row) => row.changed_by_username || row.changed_by_user_id || "System",
        render: (row) => row.changed_by_username || row.changed_by_user_id || "System",
      },
      {
        id: "value",
        label: "Value",
        defaultWidth: 240,
        minWidth: 180,
        sortable: true,
        sortValue: (row) => row.value || "",
        render: (row) => row.value?.trim() || "-",
        cellClassName: "whitespace-normal break-words",
      },
      {
        id: "description",
        label: "Description",
        defaultWidth: 320,
        minWidth: 240,
        render: (row) => row.description?.trim() || "-",
        cellClassName: "whitespace-normal break-words",
      },
      {
        id: "acceptable_values",
        label: "Acceptable Values",
        defaultWidth: 220,
        minWidth: 180,
        render: (row) => toSemicolon(row.acceptable_values) || "-",
        cellClassName: "whitespace-normal break-words",
      },
      {
        id: "sample_values",
        label: "Sample Values",
        defaultWidth: 220,
        minWidth: 180,
        render: (row) => toSemicolon(row.sample_values) || "-",
        cellClassName: "whitespace-normal break-words",
      },
    ],
    []
  )

  const businessFields = React.useMemo(
    () => fields.filter((field) => field.section === BUSINESS_SECTION),
    [fields]
  )

  const fieldsByScope = React.useMemo(
    () => ({
      system: businessFields.filter((field) => field.scope === "system"),
      instance: businessFields.filter((field) => field.scope === "instance"),
    }),
    [businessFields]
  )

  const selectedField = React.useMemo(
    () => businessFields.find((field) => field.field_id === selectedFieldId) ?? null,
    [businessFields, selectedFieldId]
  )

  const schemaLocked = Boolean(draft.schema_locked)
  const isInputField = (draft.field_mode || "input") === "input"
  const isDynamicField = (draft.value_source || "manual") === "dynamic"
  const editorTitle = draft.field_id
    ? draft.label.trim()
      ? `Editing ${draft.label.trim()} business context`
      : "Editing business context"
    : "Creating new business context definition"
  const editorDescription = draft.field_id
    ? "Maintain prompt context definitions and keep an auditable record of every change that can affect model output."
    : "Create a new business context definition and capture the information that should guide prompts and workflow behavior."

  React.useEffect(() => {
    if (creatingNew) {
      setKeyManuallyEdited(false)
      setDraft(emptyField(scope))
      return
    }
    if (selectedField) {
      setKeyManuallyEdited(true)
      setDraft({ ...selectedField })
      return
    }
    if (selectedFieldId) {
      setSelectedFieldId("")
    }
    setKeyManuallyEdited(false)
    setDraft(emptyField(scope))
  }, [creatingNew, scope, selectedField, selectedFieldId])

  React.useEffect(() => {
    if (!selectedFieldId && !creatingNew) {
      const fallbackField = SCOPES.flatMap((value) => fieldsByScope[value])[0]
      if (fallbackField) {
        setScope(fallbackField.scope as FieldScope)
        setSelectedFieldId(fallbackField.field_id)
      }
    }
  }, [creatingNew, fieldsByScope, selectedFieldId])

  const loadHistory = React.useCallback(async (fieldId: string) => {
    const trimmedFieldId = fieldId.trim()
    if (!trimmedFieldId) {
      setHistory([])
      return
    }

    setHistoryLoading(true)
    try {
      const result = await getJson<{ history?: ContextFieldHistoryEntry[] }>(
        `/api/link-iq/context-fields/${trimmedFieldId}/history?limit=100`
      )
      setHistory(result.history ?? [])
    } catch (error) {
      toast.error("Failed to load field history", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadHistory(selectedFieldId)
  }, [loadHistory, selectedFieldId])

  async function reloadFields(nextScope = scope, nextFieldId?: string) {
    setLoading(true)
    try {
      const result = await getJson<{ fields?: ContextField[] }>(
        `/api/link-iq/context-fields?section=${BUSINESS_SECTION}`
      )
      const nextFields = result.fields ?? []
      setFields(nextFields)
      setLoadError(null)
      const nextScoped = nextFields.filter(
        (field) => field.section === BUSINESS_SECTION && field.scope === nextScope
      )
      const resolvedFieldId =
        nextFieldId && nextScoped.some((field) => field.field_id === nextFieldId)
          ? nextFieldId
          : nextScoped[0]?.field_id ?? ""
      setCreatingNew(false)
      setSelectedFieldId(resolvedFieldId)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      setLoadError(message)
      toast.error("Failed to reload business context", {
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (initialLoadError || initialFields.length === 0) {
      void reloadFields(scope, selectedFieldId || undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleNewField(nextScope: FieldScope = scope) {
    setCreatingNew(true)
    setKeyManuallyEdited(false)
    setScope(nextScope)
    setSelectedFieldId("")
    setHistory([])
    setDraft(emptyField(nextScope))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const stored = await postJson<ContextField>("/api/link-iq/context-fields", {
        ...draft,
        section: BUSINESS_SECTION,
        scope,
      })
      toast.success(
        draft.field_id
          ? "Business context field updated"
          : "Business context field created"
      )
      setCreatingNew(false)
      await reloadFields(scope, stored.field_id)
      await loadHistory(stored.field_id)
    } catch (error) {
      toast.error("Failed to save business context field", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedFieldId || schemaLocked) return
    setDeleting(true)
    try {
      await deleteJson(`/api/link-iq/context-fields/${selectedFieldId}`)
      toast.success("Business context field deleted")
      await reloadFields(scope)
    } catch (error) {
      toast.error("Failed to delete business context field", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setDeleting(false)
    }
  }

  async function handleRegenerateDynamicField() {
    if (!isDynamicField || !selectedFieldId) return

    setRegenerating(true)
    try {
      const result = await postJson<{ updated_count?: number }>(
        "/api/link-iq/context-fields/sync",
        {}
      )
      await reloadFields(scope, selectedFieldId)
      await loadHistory(selectedFieldId)
      toast.success("Generated fields refreshed", {
        description:
          (result.updated_count ?? 0) > 0
            ? `${result.updated_count} generated field${result.updated_count === 1 ? "" : "s"} updated`
            : "No generated values changed",
      })
    } catch (error) {
      toast.error("Failed to refresh generated fields", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 gap-0 overflow-hidden px-4 py-4">
      <div className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)] gap-6 overflow-hidden">
        <Card className="min-h-0 overflow-hidden bg-transparent shadow-none mt-0 pt-0">
          <CardHeader className="px-0 pb-0 pt-0">
            <CardDescription className="text-sm text-muted-foreground mt-0 pt-0">
              Shared system and instance fields used to enrich AI prompts and background context.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 space-y-5 overflow-y-auto px-0 pb-0 pt-4">
            {loadError ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                Unable to load business context from link-iq: {loadError}
              </div>
            ) : null}
            {SCOPES.map((groupScope) => {
              const groupFields = fieldsByScope[groupScope]
              return (
                <div key={groupScope} className="space-y-2">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <div className="text-sm font-medium">
                      {groupScope === "system" ? "System Fields" : "Instance Fields"}
                    </div>
                    {groupScope === "instance" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleNewField(groupScope)}
                      >
                        <Plus className="size-3.5" />
                        Add
                      </Button>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    {groupFields.map((field) => (
                      <button
                        key={field.field_id}
                        type="button"
                        onClick={() => {
                          setCreatingNew(false)
                          setKeyManuallyEdited(true)
                          setScope(field.scope as FieldScope)
                          setSelectedFieldId(field.field_id)
                        }}
                        className={
                          "w-full rounded-lg border px-3 py-2 text-left transition-colors " +
                          (field.field_id === selectedFieldId
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/40")
                        }
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-sm">{field.label}</div>
                          <div className="flex items-center gap-1.5">
                            {field.value_source === "dynamic" ? (
                              <Badge variant="secondary">generated</Badge>
                            ) : field.schema_locked ? (
                              <Badge variant="secondary">locked</Badge>
                            ) : null}
                            {field.value_source === "dynamic" ? (
                              <Badge variant="outline">{field.data_type}</Badge>
                            ) : null}
                            {field.value_source !== "dynamic" ? (
                              <Badge variant="outline">{field.field_mode || "input"}</Badge>
                            ) : null}
                            {field.value_source !== "dynamic" ? (
                              <Badge variant="outline">{field.data_type}</Badge>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">{field.key}</div>
                      </button>
                    ))}
                    {groupFields.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        No {groupScope} fields configured yet.
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <div className="grid min-h-0 gap-6 overflow-hidden grid-rows-[minmax(0,1fr)_minmax(260px,36%)]">
          <Card className="min-h-0 overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg mb-2">
                    <Database className="mr-2 size-4" />
                    {draft.field_id ? (
                      <>
                        <span>Editing</span>
                        <span className="bg-primary/10 px-2 text-xl font-semibold text-accent-foreground">
                          {draft.label.trim() || "Business Context"}
                        </span>
                        <span>business context</span>
                      </>
                    ) : (
                      editorTitle
                    )}
                  </CardTitle>
                  <CardDescription>
                    {editorDescription}{" "}
                    <span className="text-xs">
                      {loading
                        ? "Reloading fields..."
                        : "These values are injected into AI prompt execution as shared context."}
                    </span>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{scope}</Badge>
                  {isDynamicField ? <Badge variant="secondary">generated</Badge> : null}
                  <Badge variant="outline">{draft.field_mode || "input"}</Badge>
                  <Badge variant="outline">{BUSINESS_SECTION}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid min-h-0 gap-4 overflow-y-auto lg:grid-cols-2">
              {schemaLocked ? (
                <div className="text-xs text-destructive lg:col-span-2">
                  This is a system defined field. Its label, key, mode, and data type are predefined but its descriptions and values should be tailoured for your business.
                </div>
              ) : null}

              <div className="mt-2 grid gap-2">
                <Label className="text-sm" htmlFor="context-field-label">Label</Label>
                <p className="text-xs text-muted-foreground">
                  Human-readable display name for this field. Keep it clear enough that reviewers and prompt authors immediately understand what the value represents.
                </p>
                <Input
                  id="context-field-label"
                  value={draft.label}
                  disabled={schemaLocked}
                  onChange={(event) =>
                    setDraft((current) => {
                      const nextLabel = event.target.value
                      const nextDraft = { ...current, label: nextLabel }

                      if (creatingNew && !keyManuallyEdited) {
                        nextDraft.key = slugifyKey(nextLabel)
                      }

                      return nextDraft
                    })
                  }
                />
              </div>
              <div className="mt-2 grid gap-2">
                <Label className="text-sm" htmlFor="context-field-key">Key</Label>
                <p className="text-xs text-muted-foreground">
                  Stable machine key used in prompts and process templates. Prefer lowercase snake_case because prompts will reference it directly.
                </p>
                <Input
                  id="context-field-key"
                  value={draft.key}
                  disabled={schemaLocked}
                  onChange={(event) => {
                    setKeyManuallyEdited(true)
                    setDraft((current) => ({ ...current, key: event.target.value }))
                  }}
                />
              </div>
              <div className="mt-2 grid gap-2">
                <Label className="text-sm" htmlFor="context-field-mode">Field Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Input fields provide static deployment context to the model. Output fields define target structures, expected ranges, or controlled values for generated results.
                </p>
                <Select
                  value={draft.field_mode || "input"}
                  disabled={schemaLocked}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      acceptable_values:
                        value === "input" ? [] : current.acceptable_values,
                      sample_values:
                        value === "input" ? [] : current.sample_values,
                      field_mode: value,
                    }))
                  }
                >
                  <SelectTrigger id="context-field-mode" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="input">Input</SelectItem>
                    <SelectItem value="output">Output</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-2 grid gap-2">
                <Label className="text-sm" htmlFor="context-field-type">Data Type</Label>
                <p className="text-xs text-muted-foreground">
                  Declares the expected value shape. Use <code>List</code> when the runtime value should be treated as multiple items rather than a single string.
                </p>
                <Select
                  value={draft.data_type}
                  disabled={schemaLocked}
                  onValueChange={(value) =>
                    setDraft((current) => ({ ...current, data_type: value }))
                  }
                >
                  <SelectTrigger id="context-field-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="enum">Enum</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="url">URL</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="list">List</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-2 grid gap-2 lg:col-span-2">
                <Label className="text-sm" htmlFor="context-field-description">Description</Label>
                <p className="text-xs text-muted-foreground">
                  Describe what this field means, how it should be maintained, and how prompts or workflows should interpret it. This is the single shared definition used for both people and AI.
                </p>
                <Textarea
                  id="context-field-description"
                  value={draft.description ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, description: event.target.value }))
                  }
                  rows={1}
                />
              </div>
              <div className="grid gap-2 lg:col-span-2">
                <Label className="text-sm" htmlFor="context-field-value">Current Value</Label>
                <p className="text-xs text-muted-foreground">
                  {isDynamicField
                    ? `${describeDynamicSource(draft)}. This value is maintained automatically and included in prompt context as a generated snapshot.`
                    : (
                      <>
                        The actual business or instance value to inject into prompts. For{" "}
                        <code>List</code> values, enter one item per line or separate them
                        with commas.
                      </>
                    )}
                </p>
                <Textarea
                  id="context-field-value"
                  value={draft.value ?? ""}
                  disabled={isDynamicField}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, value: event.target.value }))
                  }
                  rows={draft.data_type === "list" ? 5 : 3}
                  placeholder={
                    draft.data_type === "list"
                      ? "One value per line or comma-separated"
                      : undefined
                  }
                />
              </div>
              {!isInputField ? (
                <>
                  <div className="mt-2 grid gap-2">
                    <Label className="text-sm" htmlFor="context-field-acceptable-values">Acceptable Values</Label>
                    <Textarea
                      id="context-field-acceptable-values"
                      value={toLines(draft.acceptable_values)}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          acceptable_values: fromLines(event.target.value),
                        }))
                      }
                      rows={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      One value per line. Use this for controlled vocabularies or constrained outputs the model should stay within.
                    </p>
                  </div>
                  <div className="mt-2 grid gap-2">
                    <Label className="text-sm" htmlFor="context-field-sample-values">Sample Values</Label>
                    <Textarea
                      id="context-field-sample-values"
                      value={toLines(draft.sample_values)}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          sample_values: fromLines(event.target.value),
                        }))
                      }
                      rows={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      One example per line. Include realistic mock or representative values so prompts have concrete examples for expected output.
                    </p>
                  </div>
                </>
              ) : null}

              <div className="lg:col-span-2 flex items-end justify-between gap-3">
                <div className="mt-2 grid gap-2">
                  <Label className="text-sm" htmlFor="context-field-status">Status</Label>
                  <p className="text-xs text-muted-foreground">
                    Active fields are included in prompt context. Inactive fields will not be provided to the model or influence AI generation.
                  </p>
                  <Select
                    value={draft.status}
                    onValueChange={(value) =>
                      setDraft((current) => ({ ...current, status: value }))
                    }
                  >
                    <SelectTrigger id="context-field-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  {isDynamicField ? (
                    <Button
                      variant="outline"
                      onClick={() => void handleRegenerateDynamicField()}
                      disabled={regenerating || saving || loading}
                    >
                      <RefreshCw className={regenerating ? "size-4 animate-spin" : "size-4"} />
                      Re-generate
                    </Button>
                  ) : null}
                  {draft.field_id && !schemaLocked ? (
                    <Button
                      variant="outline"
                      onClick={() => void handleDelete()}
                      disabled={deleting || saving}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  ) : null}
                  <Button
                    onClick={() => void handleSave()}
                    disabled={saving || !draft.label.trim() || !draft.key.trim()}
                  >
                    <Save className="size-4" />
                    Save Field
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="min-h-0 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Audit History</CardTitle>
              <CardDescription>
                Each saved change appends a revision snapshot so prompt-affecting context can be audited and replayed over time.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-0">
                {historyLoading ? (
                  <div className="text-xs text-muted-foreground">Loading history...</div>
                ) : null}

                <AuditHistoryTable
                  columns={historyColumns}
                  rows={history}
                  getRowId={(entry) => entry.revision_id}
                  loading={historyLoading}
                  defaultSortColumnId="changed_at"
                  defaultSortDirection="desc"
                  emptyMessage={
                    selectedFieldId
                      ? "No revisions recorded yet. Saving this field will create the first audit entry."
                      : "Select or create a field to view its audit history."
                  }
                />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
