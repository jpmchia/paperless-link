"use client"

import * as React from "react"
import Editor from "@monaco-editor/react"
import { GripVertical, Save } from "lucide-react"
import type { IDisposable, editor as MonacoEditor } from "monaco-editor"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import type { AIProcessConfig } from "@/lib/link-iq-types"
import type {
  PromptFieldDescriptor,
  PromptFieldReferenceDescriptor,
} from "./types"

type Props = {
  promptDraft: AIProcessConfig
  businessFields: PromptFieldDescriptor[]
  processFields: PromptFieldDescriptor[]
  renderedPrompt: string
  selectedFieldID: string
  onSelectField: (fieldID: string) => void
  onChangePromptTemplate: (value: string) => void
  onChangeRetainHistory: (value: boolean) => void
  onChangeIncludeHistory: (value: boolean) => void
  onChangeHistoryTextLength: (value: number | undefined) => void
  onInsertField: (token: string, explicitPosition?: number) => void
  onReload: () => void
  onSave: () => void
  loading: boolean
  saving: boolean
  renderFieldPillsInEditor: boolean
  onChangeRenderFieldPillsInEditor: (value: boolean) => void
  referenceDescriptors: Map<string, PromptFieldReferenceDescriptor>
  promptEditorRef: React.MutableRefObject<MonacoEditor.IStandaloneCodeEditor | null>
  selectionListenerRef: React.MutableRefObject<IDisposable | null>
  decorationIDsRef: React.MutableRefObject<string[]>
  rememberSelectionFromEditor: () => void
  applyFieldDecorations: () => void
}

export function PromptTemplateConfigurationCard({
  promptDraft,
  businessFields,
  processFields,
  renderedPrompt,
  selectedFieldID,
  onSelectField,
  onChangePromptTemplate,
  onChangeRetainHistory,
  onChangeIncludeHistory,
  onChangeHistoryTextLength,
  onInsertField,
  onReload,
  onSave,
  loading,
  saving,
  renderFieldPillsInEditor,
  onChangeRenderFieldPillsInEditor,
  promptEditorRef,
  selectionListenerRef,
  rememberSelectionFromEditor,
  applyFieldDecorations,
}: Props) {
  const allFields = React.useMemo(
    () => [...processFields, ...businessFields],
    [businessFields, processFields]
  )
  const selectedField = React.useMemo(
    () =>
      allFields.find((field) => field.id === selectedFieldID) ??
      processFields[0] ??
      null,
    [allFields, processFields, selectedFieldID]
  )

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">
          Step 1. Prompt template configuration
        </CardTitle>
        <CardDescription>
          Define the reusable taxonomy prompt template and the fields available
          to it.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.9fr)]">
            <div className="grid gap-4">
              <FieldPaletteBox
                title="Business context fields"
                description="System-wide and instance business context fields available to this prompt."
                fields={businessFields}
                selectedFieldID={selectedFieldID}
                onSelectField={onSelectField}
                onInsertField={onInsertField}
              />
              <FieldPaletteBox
                title="Taxonomy process fields"
                description="Fields specific to the taxonomy description generation process."
                fields={processFields}
                selectedFieldID={selectedFieldID}
                onSelectField={onSelectField}
                onInsertField={onInsertField}
              />
            </div>

            <SelectedFieldPreview field={selectedField} />
          </div>

          <div className="grid min-h-0 flex-1 gap-4">
            <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem]">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="taxonomy-process-retain-history">
                    Retain history
                  </Label>
                  <Switch
                    id="taxonomy-process-retain-history"
                    checked={promptDraft.retain_history !== false}
                    onCheckedChange={onChangeRetainHistory}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Keep generated prompt and response history for this process.
                  Default is enabled.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="taxonomy-process-include-history">
                    Include history in prompt
                  </Label>
                  <Switch
                    id="taxonomy-process-include-history"
                    checked={promptDraft.include_history !== false}
                    disabled={promptDraft.retain_history === false}
                    onCheckedChange={onChangeIncludeHistory}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Feed retained history back into prompt construction for
                  continuity.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxonomy-process-history-length">
                  History text length
                </Label>
                <Input
                  id="taxonomy-process-history-length"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  disabled={
                    promptDraft.retain_history === false ||
                    promptDraft.include_history === false
                  }
                  value={promptDraft.history_text_length ?? ""}
                  onChange={(event) => {
                    const nextValue = Number.parseInt(event.target.value, 10)
                    onChangeHistoryTextLength(
                      Number.isFinite(nextValue) && nextValue > 0
                        ? nextValue
                        : undefined
                    )
                  }}
                  placeholder="4000"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum history text to include, in characters.
                </p>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="taxonomy-prompt">Prompt Template</Label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch
                    size="sm"
                    checked={renderFieldPillsInEditor}
                    onCheckedChange={onChangeRenderFieldPillsInEditor}
                    aria-label="Toggle inline field rendering in editor"
                  />
                  Render field pills in editor
                </label>
              </div>
              <div
                className="min-h-0 flex-1 overflow-hidden rounded-md border"
                onDragOver={(event) => {
                  event.preventDefault()
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  const token =
                    event.dataTransfer.getData(
                      "application/x-linkiq-prompt-token"
                    ) || event.dataTransfer.getData("text/plain")
                  if (!token) return
                  onInsertField(token)
                }}
              >
                <Editor
                  height="100%"
                  defaultLanguage="handlebars"
                  theme="vs-dark"
                  value={promptDraft.prompt_template}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineNumbers: "on",
                    wordWrap: "on",
                    scrollBeyondLastLine: false,
                    padding: { top: 12, bottom: 12 },
                    automaticLayout: true,
                  }}
                  onMount={(editor) => {
                    promptEditorRef.current = editor
                    selectionListenerRef.current?.dispose()
                    selectionListenerRef.current =
                      editor.onDidChangeCursorSelection(() => {
                        rememberSelectionFromEditor()
                      })
                    rememberSelectionFromEditor()
                    applyFieldDecorations()
                  }}
                  onChange={(value) => onChangePromptTemplate(value ?? "")}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Prompt preview</Label>
              <div className="max-h-56 overflow-y-auto rounded-md border bg-muted/20 px-4 py-3 text-xs leading-6 text-foreground">
                <pre className="whitespace-pre-wrap">
                  {renderedPrompt ||
                    "The live rendered prompt will appear here as you edit the template."}
                </pre>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onReload} disabled={loading}>
              Reload
            </Button>
            <Button
              onClick={onSave}
              disabled={saving || !promptDraft.prompt_template.trim()}
            >
              <Save className="size-4" />
              Save template
            </Button>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
          <div>
            <div className="text-sm font-medium">Template Syntax</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Recommended syntax is Go <code>text/template</code>. It gives
              variable substitution and built-in <code>if</code>/
              <code>else</code> logic without introducing another runtime.
            </div>
          </div>

          <div>
            <div className="text-sm font-medium">Available Variables</div>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>
                <code>{"{{ .label }}"}</code> node label
              </li>
              <li>
                <code>{"{{ .parent_path }}"}</code> parent path
              </li>
              <li>
                <code>{"{{ .path_preview }}"}</code> proposed full path
              </li>
              <li>
                <code>{"{{ .source_scope }}"}</code> source scope
              </li>
              <li>
                <code>{"{{ .source_id }}"}</code> source identifier
              </li>
              <li>
                <code>{"{{ .existing_description }}"}</code> current
                description, if any
              </li>
              <li>
                <code>
                  {
                    '{{ with .business_context }}{{ index . "organisation_name" }}{{ end }}'
                  }
                </code>{" "}
                business context values from the Business Context screen
              </li>
              <li>
                <code>{"{{ .system_context }}"}</code> and{" "}
                <code>{"{{ .instance_context }}"}</code> maps for shared static
                fields
              </li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-medium">Conditional Example</div>
            <pre className="mt-2 overflow-x-auto rounded-md bg-background p-3 text-[11px] leading-5 text-muted-foreground">
              <code>{`Node label: {{ .label }}\n{{ if .parent_path }}Parent: {{ .parent_path }}{{ end }}`}</code>
            </pre>
          </div>

          <div>
            <div className="text-sm font-medium">Product Direction</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Keep provider and model assignments task-specific. That lets the
              commercial service layer route different enrichment workloads to
              managed or customer-supplied models without changing prompt
              definitions.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SelectedFieldPreview({
  field,
}: {
  field: PromptFieldDescriptor | null
}) {
  return (
    <div className="h-full rounded-lg border bg-background p-4">
      <div className="text-sm font-medium">
        {field?.label || "Field details"}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {field?.description ||
          "Select a field to inspect its meaning and example values."}
      </div>
      {field ? (
        <div className="mt-3 space-y-3 text-xs">
          <div>
            <div className="font-medium text-foreground">Template token</div>
            <code className="mt-1 block overflow-x-auto rounded-md bg-muted px-2 py-2 text-[11px] text-foreground">
              {field.token}
            </code>
          </div>
          {field.currentValue ? (
            <div>
              <div className="font-medium text-foreground">Current value</div>
              <div className="mt-1 text-muted-foreground">
                {field.currentValue}
              </div>
            </div>
          ) : null}
          {field.sampleValues?.length ? (
            <div>
              <div className="font-medium text-foreground">Sample values</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {field.sampleValues.map((value) => (
                  <Badge
                    key={value}
                    variant="outline"
                    className="h-auto px-2 py-1 text-[11px]"
                  >
                    {value}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          {field.acceptableValues?.length ? (
            <div>
              <div className="font-medium text-foreground">
                Acceptable values
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {field.acceptableValues.map((value) => (
                  <Badge
                    key={value}
                    variant="secondary"
                    className="h-auto px-2 py-1 text-[11px]"
                  >
                    {value}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          {field.dataType ? (
            <div className="text-muted-foreground">
              Data type:{" "}
              <span className="text-foreground">{field.dataType}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function FieldPaletteBox({
  title,
  description,
  fields,
  selectedFieldID,
  onSelectField,
  onInsertField,
}: {
  title: string
  description: string
  fields: PromptFieldDescriptor[]
  selectedFieldID: string
  onSelectField: (fieldID: string) => void
  onInsertField: (token: string) => void
}) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{description}</div>
      <ScrollArea className="mt-3 h-32">
        <div className="flex flex-wrap gap-2 pr-3">
          {fields.length > 0 ? (
            fields.map((field) => (
              <FieldPill
                key={field.id}
                field={field}
                isSelected={field.id === selectedFieldID}
                onSelect={() => onSelectField(field.id)}
                onInsert={() => onInsertField(field.token)}
              />
            ))
          ) : (
            <div className="text-xs text-muted-foreground">
              No fields available.
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="mt-2 text-[11px] text-muted-foreground">
        Click to inspect, double-click to insert, or drag into the prompt
        template.
      </div>
    </div>
  )
}

function FieldPill({
  field,
  isSelected,
  onSelect,
  onInsert,
}: {
  field: PromptFieldDescriptor
  isSelected: boolean
  onSelect: () => void
  onInsert: () => void
}) {
  return (
    <button
      type="button"
      draggable
      onClick={onSelect}
      onDoubleClick={onInsert}
      onDragStart={(event) => {
        event.dataTransfer.setData(
          "application/x-linkiq-prompt-token",
          field.token
        )
        event.dataTransfer.setData("text/plain", field.token)
        event.dataTransfer.effectAllowed = "copy"
      }}
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
        (isSelected
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border bg-muted/40 text-foreground hover:bg-muted")
      }
    >
      <GripVertical className="size-3.5 opacity-50" />
      {field.label}
    </button>
  )
}
