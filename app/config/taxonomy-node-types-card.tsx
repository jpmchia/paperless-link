"use client"

import * as React from "react"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { saveConfiguredTaxonomyNodeTypes } from "@/app/config/actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

type Props = {
  canEdit: boolean
  initialNodeTypes: string[]
}

function toEditorValue(nodeTypes: string[]) {
  return nodeTypes.join("\n")
}

function parseEditorValue(value: string) {
  return value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function TaxonomyNodeTypesCard({ canEdit, initialNodeTypes }: Props) {
  const [value, setValue] = React.useState(() =>
    toEditorValue(initialNodeTypes)
  )
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    setValue(toEditorValue(initialNodeTypes))
  }, [initialNodeTypes])

  const isDirty = value !== toEditorValue(initialNodeTypes)

  async function handleSave() {
    setSaving(true)
    try {
      const nextNodeTypes = await saveConfiguredTaxonomyNodeTypes(
        parseEditorValue(value)
      )
      setValue(toEditorValue(nextNodeTypes))
      toast.success("Taxonomy node types updated")
    } catch (error) {
      toast.error("Failed to save taxonomy node types", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Taxonomy Node Types</CardTitle>
        <CardDescription>
          Configure the allowed taxonomy node types used in the taxonomy editor.
          Enter one value per line, for example: Company, Line of Business,
          Business Area, Function, Department, Monthly Process, Document Type.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={!canEdit || saving}
          placeholder={
            "Company\nLine of Business\nBusiness Area\nFunction\nDepartment\nMonthly Process\nDocument Type"
          }
          className="min-h-48 font-mono text-sm"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            The taxonomy editor will only allow selecting from this list.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!canEdit || saving || !isDirty}
              onClick={() => setValue(toEditorValue(initialNodeTypes))}
            >
              Discard
            </Button>
            <Button
              type="button"
              disabled={!canEdit || saving || !isDirty}
              onClick={() => void handleSave()}
            >
              <Save className="size-4" />
              {saving ? "Saving..." : "Save Types"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
