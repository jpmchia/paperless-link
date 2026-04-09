"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { Dialog as DraggableDialog, DialogBody as DraggableDialogBody, DialogHeader as DraggableDialogHeader, DialogTitle as DraggableDialogTitle, LargeEditorDialogContent } from "@/components/draggable-dialog"
import { getJson, withQuery } from "@/lib/paperless-client"
import { TagsTable } from "@/app/tags/tags-table"
import { CorrespondentsTable } from "@/app/correspondents/correspondents-table"
import { DocumentTypesTable } from "@/app/document-types/document-types-table"
import { CustomFieldsTable } from "@/app/custom-fields/custom-fields-table"

export type SidebarManagementDialogKind =
  | "tags"
  | "correspondents"
  | "documentTypes"
  | "customFields"

interface PaginatedResults<T> {
  results?: T[]
}

type TagItem = React.ComponentProps<typeof TagsTable>["initialTags"][number]
type CorrespondentItem =
  React.ComponentProps<typeof CorrespondentsTable>["initialCorrespondents"][number]
type DocumentTypeItem =
  React.ComponentProps<typeof DocumentTypesTable>["initialItems"][number]
type CustomFieldItem =
  React.ComponentProps<typeof CustomFieldsTable>["initialItems"][number]

interface SidebarManagementDialogProps {
  kind: SidebarManagementDialogKind | null
  onOpenChange: (open: boolean) => void
}

interface SidebarManagementDialogData {
  correspondents: CorrespondentItem[]
  customFields: CustomFieldItem[]
  documentTypes: DocumentTypeItem[]
  tags: TagItem[]
}

const EMPTY_DATA: SidebarManagementDialogData = {
  correspondents: [],
  customFields: [],
  documentTypes: [],
  tags: [],
}

const DIALOG_META: Record<
  SidebarManagementDialogKind,
  { endpoint: string; title: string }
> = {
  correspondents: {
    endpoint: withQuery("/api/management/lookups", { kind: "correspondents" }),
    title: "Correspondents",
  },
  customFields: {
    endpoint: withQuery("/api/management/lookups", { kind: "custom-fields" }),
    title: "Custom Fields",
  },
  documentTypes: {
    endpoint: withQuery("/api/management/lookups", { kind: "document-types" }),
    title: "Document Types",
  },
  tags: {
    endpoint: withQuery("/api/management/lookups", { kind: "tags" }),
    title: "Tags",
  },
}

function normalizeDialogItems<T>(payload: unknown, kind: SidebarManagementDialogKind): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (!payload || typeof payload !== "object") return []

  const record = payload as Record<string, unknown>

  if (Array.isArray(record.results)) return record.results as T[]
  if (Array.isArray(record.all)) return record.all as T[]

  // Be tolerant of shape differences across endpoints/proxy variants.
  const kindKeys: Record<SidebarManagementDialogKind, string[]> = {
    tags: ["tags"],
    correspondents: ["correspondents"],
    documentTypes: ["document_types", "documentTypes"],
    customFields: ["custom_fields", "customFields"],
  }
  for (const key of kindKeys[kind]) {
    if (Array.isArray(record[key])) return record[key] as T[]
  }

  return []
}

export function SidebarManagementDialog({
  kind,
  onOpenChange,
}: SidebarManagementDialogProps) {
  const [data, setData] = React.useState<SidebarManagementDialogData>(EMPTY_DATA)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!kind) return
    const currentKind = kind

    let cancelled = false
    setLoading(true)
    setError(null)

    async function load() {
      try {
        const endpoint = `${DIALOG_META[currentKind].endpoint}${
          DIALOG_META[currentKind].endpoint.includes("?") ? "&" : "?"
        }_t=${Date.now()}`
        const response = await getJson<
          PaginatedResults<
            TagItem | CorrespondentItem | DocumentTypeItem | CustomFieldItem
          >
        >(endpoint, { cache: "no-store" })
        if (cancelled) return

        const items = normalizeDialogItems<
          TagItem | CorrespondentItem | DocumentTypeItem | CustomFieldItem
        >(response, currentKind)
        setData((current) => ({
          ...current,
          [currentKind]: items,
        }))
      } catch (loadError) {
        if (cancelled) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load management data."
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [kind])

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open)
    if (!open) {
      setError(null)
      setLoading(false)
    }
  }

  const renderContent = () => {
    if (!kind) return null

    if (loading) {
      return (
        <div className="flex min-h-[24rem] items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading {DIALOG_META[kind].title.toLowerCase()}…
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex min-h-[24rem] items-center justify-center text-sm text-destructive">
          {error}
        </div>
      )
    }

    switch (kind) {
      case "tags":
        return <TagsTable initialTags={data.tags} />
      case "correspondents":
        return <CorrespondentsTable initialCorrespondents={data.correspondents} />
      case "documentTypes":
        return <DocumentTypesTable initialItems={data.documentTypes} />
      case "customFields":
        return <CustomFieldsTable initialItems={data.customFields} />
      default:
        return null
    }
  }

  return (
    <DraggableDialog modal={false} open={kind !== null} onOpenChange={handleOpenChange}>
      <LargeEditorDialogContent overlay={false} initialWidth={1100} minWidth={980} initialHeight={760} maxHeight={980}>
        <DraggableDialogHeader>
          <DraggableDialogTitle>
            {kind ? DIALOG_META[kind].title : ""}
          </DraggableDialogTitle>
        </DraggableDialogHeader>
        <DraggableDialogBody className="pb-6">
          {renderContent()}
        </DraggableDialogBody>
      </LargeEditorDialogContent>
    </DraggableDialog>
  )
}
