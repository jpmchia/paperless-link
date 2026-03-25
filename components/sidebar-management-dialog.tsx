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
    endpoint: withQuery("/api/proxy/correspondents/", { page_size: 100000 }),
    title: "Correspondents",
  },
  customFields: {
    endpoint: withQuery("/api/proxy/custom_fields/", { page_size: 100000 }),
    title: "Custom Fields",
  },
  documentTypes: {
    endpoint: withQuery("/api/proxy/document_types/", { page_size: 100000 }),
    title: "Document Types",
  },
  tags: {
    endpoint: withQuery("/api/proxy/tags/", { page_size: 100000 }),
    title: "Tags",
  },
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
        const response = await getJson<
          PaginatedResults<
            TagItem | CorrespondentItem | DocumentTypeItem | CustomFieldItem
          >
        >(DIALOG_META[currentKind].endpoint)
        if (cancelled) return

        const items = Array.isArray(response?.results) ? response.results : []
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
