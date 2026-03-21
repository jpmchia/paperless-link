"use client"

import * as React from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type SavedViewRule = {
  rule_type: number
  value: string
}

type NamedOption = {
  id: number
  name: string
}

type UserOption = {
  id: number
  username?: string
  first_name?: string
  last_name?: string
}

type CustomFieldOption = {
  id: number
  name: string
}

export type SavedViewRuleEditorLookups = {
  correspondents: NamedOption[]
  documentTypes: NamedOption[]
  storagePaths: NamedOption[]
  tags: NamedOption[]
  users: UserOption[]
  customFields: CustomFieldOption[]
}

type RuleValueKind = "text" | "number" | "boolean" | "date" | "option"

type RuleDefinition = {
  id: number
  label: string
  valueKind: RuleValueKind
  options?: Array<{ value: string; label: string }>
}

function formatUser(user: UserOption) {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim()
  return fullName || user.username || `User #${user.id}`
}

function buildRuleDefinitions(lookups: SavedViewRuleEditorLookups): RuleDefinition[] {
  const mapOptions = (items: NamedOption[]) =>
    items.map((item) => ({ value: String(item.id), label: item.name }))

  return [
    { id: 20, label: "Query", valueKind: "text" },
    { id: 0, label: "Title contains", valueKind: "text" },
    { id: 1, label: "Content contains", valueKind: "text" },
    { id: 19, label: "Title or content contains", valueKind: "text" },
    { id: 21, label: "More like document", valueKind: "number" },
    { id: 3, label: "Correspondent is", valueKind: "option", options: mapOptions(lookups.correspondents) },
    { id: 26, label: "Correspondent is any of", valueKind: "option", options: mapOptions(lookups.correspondents) },
    { id: 27, label: "Correspondent is none of", valueKind: "option", options: mapOptions(lookups.correspondents) },
    { id: 4, label: "Document type is", valueKind: "option", options: mapOptions(lookups.documentTypes) },
    { id: 28, label: "Document type is any of", valueKind: "option", options: mapOptions(lookups.documentTypes) },
    { id: 29, label: "Document type is none of", valueKind: "option", options: mapOptions(lookups.documentTypes) },
    { id: 25, label: "Storage path is", valueKind: "option", options: mapOptions(lookups.storagePaths) },
    { id: 30, label: "Storage path is any of", valueKind: "option", options: mapOptions(lookups.storagePaths) },
    { id: 31, label: "Storage path is none of", valueKind: "option", options: mapOptions(lookups.storagePaths) },
    { id: 6, label: "Has all tags", valueKind: "option", options: mapOptions(lookups.tags) },
    { id: 22, label: "Has any tags", valueKind: "option", options: mapOptions(lookups.tags) },
    { id: 17, label: "Excludes tags", valueKind: "option", options: mapOptions(lookups.tags) },
    {
      id: 7,
      label: "Has any tags",
      valueKind: "boolean",
      options: [
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ],
    },
    {
      id: 5,
      label: "In inbox",
      valueKind: "boolean",
      options: [
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ],
    },
    { id: 2, label: "ASN is at least", valueKind: "number" },
    { id: 23, label: "ASN is at least", valueKind: "number" },
    { id: 24, label: "ASN is at most", valueKind: "number" },
    {
      id: 18,
      label: "ASN is empty",
      valueKind: "boolean",
      options: [{ value: "true", label: "Yes" }],
    },
    { id: 8, label: "Created before", valueKind: "date" },
    { id: 9, label: "Created after", valueKind: "date" },
    { id: 13, label: "Added before", valueKind: "date" },
    { id: 14, label: "Added after", valueKind: "date" },
    { id: 36, label: "Custom fields contain", valueKind: "text" },
    { id: 42, label: "Custom field query", valueKind: "text" },
    { id: 32, label: "Owner is", valueKind: "option", options: lookups.users.map((user) => ({ value: String(user.id), label: formatUser(user) })) },
    { id: 33, label: "Owner is any of", valueKind: "option", options: lookups.users.map((user) => ({ value: String(user.id), label: formatUser(user) })) },
    { id: 35, label: "Owner excludes", valueKind: "option", options: lookups.users.map((user) => ({ value: String(user.id), label: formatUser(user) })) },
    {
      id: 34,
      label: "Owner is empty",
      valueKind: "boolean",
      options: [
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ],
    },
    { id: 37, label: "Shared by user", valueKind: "option", options: lookups.users.map((user) => ({ value: String(user.id), label: formatUser(user) })) },
  ]
}

function renderValueControl(
  rule: SavedViewRule,
  definition: RuleDefinition,
  onChange: (value: string) => void
) {
  if (definition.valueKind === "option" || definition.valueKind === "boolean") {
    const options = definition.options ?? []
    const selected = options.some((option) => option.value === rule.value)
      ? rule.value
      : undefined
    return (
      <Select value={selected} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select value" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={`${definition.id}-${option.value}`} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (definition.valueKind === "date") {
    return <Input type="date" value={rule.value} onChange={(event) => onChange(event.target.value)} />
  }

  if (definition.valueKind === "number") {
    return (
      <Input
        type="number"
        value={rule.value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Enter number"
      />
    )
  }

  return (
    <Input
      value={rule.value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Enter value"
    />
  )
}

export function FilterRuleEditor({
  rules,
  lookups,
  onChange,
}: {
  rules: SavedViewRule[]
  lookups: SavedViewRuleEditorLookups
  onChange: (rules: SavedViewRule[]) => void
}) {
  const definitions = React.useMemo(() => buildRuleDefinitions(lookups), [lookups])
  const defaultRuleType = definitions[0]?.id ?? 20

  const updateRule = (index: number, partial: Partial<SavedViewRule>) => {
    onChange(
      rules.map((rule, currentIndex) =>
        currentIndex === index ? { ...rule, ...partial } : rule
      )
    )
  }

  const removeRule = (index: number) => {
    onChange(rules.filter((_, currentIndex) => currentIndex !== index))
  }

  const addRule = () => {
    onChange([...rules, { rule_type: defaultRuleType, value: "" }])
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>Filter rules</Label>
          <p className="text-xs text-muted-foreground">
            Build the saved view criteria explicitly, like NGX.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRule}>
          <Plus className="mr-2 h-4 w-4" />
          Add rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No rules yet. This saved view will match all documents unless you add filters.
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, index) => {
            const definition =
              definitions.find((candidate) => candidate.id === rule.rule_type) ??
              definitions[0]

            return (
              <div
                key={`${rule.rule_type}-${index}`}
                className="grid gap-3 rounded-lg border p-3 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_auto]"
              >
                <div className="space-y-1.5">
                  <Label>Rule</Label>
                  <Select
                    value={String(rule.rule_type)}
                    onValueChange={(value) =>
                      updateRule(index, { rule_type: Number(value), value: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {definitions.map((candidate) => (
                        <SelectItem key={candidate.id} value={String(candidate.id)}>
                          {candidate.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Value</Label>
                  {renderValueControl(rule, definition, (value) => updateRule(index, { value }))}
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:text-destructive"
                    onClick={() => removeRule(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
