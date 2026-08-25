"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { Dialog as DraggableDialog, DialogBody as DraggableDialogBody, DialogHeader as DraggableDialogHeader, DialogTitle as DraggableDialogTitle, LargeEditorDialogContent } from "@/components/draggable-dialog"
import { getJson, withQuery } from "@/lib/paperless-client"
import { TagsTable } from "@/app/tags/tags-table"
import { CorrespondentsTable } from "@/app/correspondents/correspondents-table"
import { DocumentTypesTable } from "@/app/document-types/document-types-table"
import { CustomFieldsTable } from "@/app/custom-fields/custom-fields-table"
import { StoragePathsTable } from "@/app/storage-paths/storage-paths-table"

export type SidebarManagementDialogKind =
  | "tags"
  | "correspondents"
  | "documentTypes"
  | "storagePaths"
  | "customFields"

interface PaginatedResults<T> {
  results?: T[]
}

type TagItem = React.ComponentProps<typeof TagsTable>["initialTags"][number]
type CorrespondentItem =
  React.ComponentProps<typeof CorrespondentsTable>["initialCorrespondents"][number]
type DocumentTypeItem =
  React.ComponentProps<typeof DocumentTypesTable>["initialItems"][number]
type StoragePathItem =
  React.ComponentProps<typeof StoragePathsTable>["initialItems"][number]
type CustomFieldItem =
  React.ComponentProps<typeof CustomFieldsTable>["initialItems"][number]

interface SidebarManagementDialogData {
  correspondents: CorrespondentItem[]
  customFields: CustomFieldItem[]
  documentTypes: DocumentTypeItem[]
  storagePaths: StoragePathItem[]
  tags: TagItem[]
}

const EMPTY_DATA: SidebarManagementDialogData = {
  correspondents: [],
  customFields: [],
  documentTypes: [],
  storagePaths: [],
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
  storagePaths: {
    endpoint: withQuery("/api/management/lookups", { kind: "storage-paths" }),
    title: "Storage Paths",
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
    storagePaths: ["storage_paths", "storagePaths"],
    customFields: ["custom_fields", "customFields"],
  }
  for (const key of kindKeys[kind]) {
    if (Array.isArray(record[key])) return record[key] as T[]
  }

  return []
}

interface SidebarManagementDialogState {
  initialItemId: number | null
  kind: SidebarManagementDialogKind | null
  onItemsChange?: (() => void) | undefined
}

interface SidebarManagementDialogContextValue {
  activeDialogKind: SidebarManagementDialogKind | null
  closeManagementDialog: () => void
  openManagementDialog: (
    kind: SidebarManagementDialogKind,
    options?: {
      initialItemId?: number | null
      onItemsChange?: () => void
    }
  ) => void
}

const SidebarManagementDialogContext =
  React.createContext<SidebarManagementDialogContextValue | null>(null)

function SidebarManagementDialog({
  initialItemId,
  kind,
  onItemsChange,
  onOpenChange,
}: SidebarManagementDialogState & {
  onOpenChange: (open: boolean) => void
}) {
  const [data, setData] = React.useState<SidebarManagementDialogData>(EMPTY_DATA)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const didMountRef = React.useRef(false)

  React.useEffect(() => {
    didMountRef.current = false
  }, [initialItemId, kind])

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
            | TagItem
            | CorrespondentItem
            | DocumentTypeItem
            | StoragePathItem
            | CustomFieldItem
          >
        >(endpoint, { cache: "no-store" })
        if (cancelled) return

        const items = normalizeDialogItems<
          | TagItem
          | CorrespondentItem
          | DocumentTypeItem
          | StoragePathItem
          | CustomFieldItem
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

    const notifyItemsChange = () => {
      if (!didMountRef.current) {
        didMountRef.current = true
        return
      }

      onItemsChange?.()
    }

    switch (kind) {
      case "tags":
        return (
          <TagsTable
            initialTags={data.tags}
            initialEditTagId={initialItemId}
            onItemsChange={notifyItemsChange}
          />
        )
      case "correspondents":
        return (
          <CorrespondentsTable
            initialCorrespondents={data.correspondents}
            initialEditCorrespondentId={initialItemId}
            onItemsChange={notifyItemsChange}
          />
        )
      case "documentTypes":
        return (
          <DocumentTypesTable
            initialEditItemId={initialItemId}
            initialItems={data.documentTypes}
            onItemsChange={notifyItemsChange}
          />
        )
      case "storagePaths":
        return (
          <StoragePathsTable
            initialEditItemId={initialItemId}
            initialItems={data.storagePaths}
            onItemsChange={notifyItemsChange}
          />
        )
      case "customFields":
        return (
          <CustomFieldsTable
            initialItems={data.customFields}
            onItemsChange={notifyItemsChange}
          />
        )
      default:
        return assertNever(kind)
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

function assertNever(value: never): never {
  throw new Error(`Unhandled sidebar management dialog kind: ${String(value)}`)
}

export function SidebarManagementDialogProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [state, setState] = React.useState<SidebarManagementDialogState>({
    initialItemId: null,
    kind: null,
  })

  const closeManagementDialog = React.useCallback(() => {
    setState({
      initialItemId: null,
      kind: null,
    })
  }, [])

  const openManagementDialog = React.useCallback<
    SidebarManagementDialogContextValue["openManagementDialog"]
  >((kind, options = {}) => {
    setState({
      initialItemId: options.initialItemId ?? null,
      kind,
      onItemsChange: options.onItemsChange,
    })
  }, [])

  const value = React.useMemo<SidebarManagementDialogContextValue>(
    () => ({
      activeDialogKind: state.kind,
      closeManagementDialog,
      openManagementDialog,
    }),
    [closeManagementDialog, openManagementDialog, state.kind]
  )

  return (
    <SidebarManagementDialogContext.Provider value={value}>
      {children}
      <SidebarManagementDialog
        initialItemId={state.initialItemId}
        kind={state.kind}
        onItemsChange={state.onItemsChange}
        onOpenChange={(open) => {
          if (!open) {
            closeManagementDialog()
          }
        }}
      />
    </SidebarManagementDialogContext.Provider>
  )
}

export function useSidebarManagementDialog() {
  const context = React.useContext(SidebarManagementDialogContext)

  if (!context) {
    throw new Error(
      "useSidebarManagementDialog must be used within SidebarManagementDialogProvider"
    )
  }

  return context
}

export { SidebarManagementDialog }
