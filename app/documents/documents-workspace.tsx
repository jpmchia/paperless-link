"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { ColumnSizingState } from "@tanstack/react-table"
import { updateUiSettings } from "@/app/actions/ui-settings"
import type { FilterParams } from "@/lib/api"
import { toast } from "sonner"
import { RealtimeDocumentListSync } from "@/components/realtime-document-list-sync"
import { DEFAULT_DISPLAY_FIELDS, type Document, type LookupMaps } from "./columns"
import { FilterPanel } from "./filter-panel"
import { DataTable, DataTableHeaderBar } from "./data-table"
import { ColumnsPicker } from "./columns-picker"
import { CardGrid } from "./card-grid"
import { DisplayModePicker } from "./display-mode-picker"
import { DocumentPreviewDialog } from "./document-preview-dialog"
import {
  DEFAULT_DOCUMENT_DISPLAY_MODE,
  type DocumentDisplayMode,
  resolveDocumentDisplayMode,
} from "./display-mode"
import { toErrorMessage } from "@/lib/errors"

type LookupItem = { id: number; name: string }
type UserOption = { id: number; username?: string; first_name?: string; last_name?: string }
type TagOption = { id: number; name: string; color: string | number }
type CustomFieldOption = { id: number; name: string }
type DocumentTableLayout = {
  displayFields?: string[]
  columnSizing?: ColumnSizingState
  smallCardSize?: number
  largeCardSize?: number
}
type DocumentTableLayoutSettings = {
  global?: DocumentTableLayout
  views?: Record<string, DocumentTableLayout>
}

function comparableLayout(layout: DocumentTableLayout | null | undefined): DocumentTableLayout {
  return {
    columnSizing: layout?.columnSizing ?? {},
    smallCardSize: layout?.smallCardSize ?? 190,
    largeCardSize: layout?.largeCardSize ?? 280,
  }
}

const DOCUMENT_TABLE_LAYOUTS_STORAGE_KEY = "paperless-document-table-layouts"

function layoutsEqual(left: DocumentTableLayout | null | undefined, right: DocumentTableLayout | null | undefined) {
  return JSON.stringify(comparableLayout(left)) === JSON.stringify(comparableLayout(right))
}

function readStoredTableLayouts(): DocumentTableLayoutSettings | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(DOCUMENT_TABLE_LAYOUTS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DocumentTableLayoutSettings
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

function writeStoredTableLayouts(layouts: DocumentTableLayoutSettings) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(
      DOCUMENT_TABLE_LAYOUTS_STORAGE_KEY,
      JSON.stringify(layouts)
    )
  } catch {
    // Ignore local persistence failures.
  }
}

interface DocumentsWorkspaceProps {
  activeView?: React.ComponentProps<typeof FilterPanel>["activeView"]
  correspondents: LookupItem[]
  currentFilters: FilterParams
  currentPage: number
  currentPageSize: number
  customFields: CustomFieldOption[]
  data: Document[]
  documentTypes: LookupItem[]
  groupsList?: LookupItem[]
  lookup: LookupMaps
  pageCount: number
  savedViews: React.ComponentProps<typeof FilterPanel>["savedViews"]
  storagePaths: LookupItem[]
  tags: TagOption[]
  title?: string | null
  totalCount: number
  users?: UserOption[]
  currentUserId?: number | null
  initialDisplayMode?: string | null
  initialTableLayouts?: DocumentTableLayoutSettings | null
}

export function DocumentsWorkspace({
  activeView,
  correspondents,
  currentFilters,
  currentPage,
  currentPageSize,
  customFields,
  data,
  documentTypes,
  groupsList = [],
  lookup,
  pageCount,
  savedViews,
  storagePaths,
  tags,
  totalCount,
  users = [],
  currentUserId,
  initialDisplayMode,
  initialTableLayouts,
}: DocumentsWorkspaceProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tableLayouts, setTableLayouts] = React.useState<DocumentTableLayoutSettings>(
    initialTableLayouts ?? {}
  )

  React.useEffect(() => {
    setTableLayouts(initialTableLayouts ?? {})
  }, [initialTableLayouts])

  React.useEffect(() => {
    const storedLayouts = readStoredTableLayouts()
    if (!storedLayouts) return

    setTableLayouts((current) => ({
      global: storedLayouts.global ?? current.global,
      views: {
        ...(current.views ?? {}),
        ...(storedLayouts.views ?? {}),
      },
    }))
  }, [])

  const activeViewLayout = React.useMemo<DocumentTableLayout | null>(
    () =>
      activeView?.id != null
        ? tableLayouts.views?.[String(activeView.id)] ?? null
        : tableLayouts.global ?? null,
    [activeView?.id, tableLayouts]
  )
  const activeViewDisplayFields = activeView?.display_fields
  const activeViewDisplayFieldsKey = React.useMemo(
    () => activeViewDisplayFields?.join(",") ?? "",
    [activeViewDisplayFields]
  )

  const [displayFields, setDisplayFields] = React.useState<string[]>(
    activeView?.display_fields?.length
      ? activeView.display_fields
      : activeViewLayout?.displayFields?.length
        ? activeViewLayout.displayFields
        : DEFAULT_DISPLAY_FIELDS
  )
  const [displayMode, setDisplayMode] = React.useState<DocumentDisplayMode>(() =>
    resolveDocumentDisplayMode(activeView?.display_mode, initialDisplayMode)
  )
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>(
    activeViewLayout?.columnSizing ?? {}
  )
  const [smallCardSize, setSmallCardSize] = React.useState(
    activeViewLayout?.smallCardSize ?? 190
  )
  const [largeCardSize, setLargeCardSize] = React.useState(
    activeViewLayout?.largeCardSize ?? 280
  )
  const [previewDocument, setPreviewDocument] = React.useState<{
    id: number
    title?: string
  } | null>(null)

  React.useEffect(() => {
    if (activeViewDisplayFields?.length) {
      setDisplayFields(activeViewDisplayFields)
    } else if (activeViewLayout?.displayFields?.length) {
      setDisplayFields(activeViewLayout.displayFields)
    } else {
      setDisplayFields(DEFAULT_DISPLAY_FIELDS)
    }
  }, [activeView?.id, activeViewDisplayFields, activeViewDisplayFieldsKey, activeViewLayout])

  React.useEffect(() => {
    setColumnSizing(activeViewLayout?.columnSizing ?? {})
  }, [activeView?.id, activeViewLayout])

  React.useEffect(() => {
    setSmallCardSize(activeViewLayout?.smallCardSize ?? 190)
    setLargeCardSize(activeViewLayout?.largeCardSize ?? 280)
  }, [activeView?.id, activeViewLayout])

  React.useEffect(() => {
    setDisplayMode(resolveDocumentDisplayMode(activeView?.display_mode, initialDisplayMode))
  }, [activeView?.id, activeView?.display_mode, initialDisplayMode])

  React.useEffect(() => {
    if (activeView?.id) return

    const nextLayouts: DocumentTableLayoutSettings = {
      ...tableLayouts,
      global: {
        ...tableLayouts.global,
        displayFields,
        columnSizing,
        smallCardSize,
        largeCardSize,
      },
      views: tableLayouts.views ?? {},
    }

    const timeout = window.setTimeout(() => {
      setTableLayouts(nextLayouts)
      writeStoredTableLayouts(nextLayouts)
      void updateUiSettings({
        document_list_display_mode: displayMode,
        document_table_layouts: nextLayouts,
      }).catch(() => {
        // Silently ignore workspace preference persistence failures.
      })
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [activeView?.id, displayMode, displayFields, columnSizing, smallCardSize, largeCardSize, tableLayouts])

  const cardSize = displayMode === "largeCards" ? largeCardSize : smallCardSize
  const currentActiveViewLayout = React.useMemo<DocumentTableLayout>(
    () => ({
      columnSizing,
      smallCardSize,
      largeCardSize,
    }),
    [columnSizing, smallCardSize, largeCardSize]
  )
  const activeViewLayoutDirty = React.useMemo(
    () => Boolean(activeView?.id) && !layoutsEqual(activeViewLayout, currentActiveViewLayout),
    [activeView?.id, activeViewLayout, currentActiveViewLayout]
  )
  const previewDocuments = React.useMemo(
    () =>
      data.map((document) => ({
        id: document.id,
        title: document.title,
      })),
    [data]
  )

  const handleCardSizeChange = React.useCallback(
    (value: number) => {
      if (displayMode === "largeCards") {
        setLargeCardSize(value)
        return
      }

      if (displayMode === DEFAULT_DOCUMENT_DISPLAY_MODE || displayMode === "smallCards") {
        setSmallCardSize(value)
      }
    },
    [displayMode]
  )

  const persistViewLayout = React.useCallback(
    async (viewId: number) => {
      const nextLayouts: DocumentTableLayoutSettings = {
        ...tableLayouts,
        global: tableLayouts.global,
        views: {
          ...(tableLayouts.views ?? {}),
          [String(viewId)]: {
            ...(tableLayouts.views?.[String(viewId)] ?? {}),
            ...currentActiveViewLayout,
          },
        },
      }

      setTableLayouts(nextLayouts)
      writeStoredTableLayouts(nextLayouts)
      try {
        await updateUiSettings({
          document_table_layouts: nextLayouts,
        })
      } catch (error) {
        toast.error("Saved view updated, but layout could not be persisted", {
          description: toErrorMessage(error),
        })
      }
    },
    [currentActiveViewLayout, tableLayouts]
  )

  React.useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false

      const tagName = target.tagName
      return (
        target.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT"
      )
    }

    const clickHotkeyTarget = (selector: string) => {
      const target = document.querySelector<HTMLElement>(selector)
      target?.click()
    }

    const navigatePage = (nextPage: number) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("page", String(nextPage))
      router.push(`?${params.toString()}`)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (previewDocument) {
        if (event.key === "ArrowLeft") {
          const currentIndex = previewDocuments.findIndex(
            (document) => document.id === previewDocument.id
          )
          if (currentIndex > 0) {
            event.preventDefault()
            setPreviewDocument(previewDocuments[currentIndex - 1])
          }
          return
        }

        if (event.key === "ArrowRight") {
          const currentIndex = previewDocuments.findIndex(
            (document) => document.id === previewDocument.id
          )
          if (currentIndex >= 0 && currentIndex < previewDocuments.length - 1) {
            event.preventDefault()
            setPreviewDocument(previewDocuments[currentIndex + 1])
          }
          return
        }
      }

      if (isEditableTarget(event.target)) return

      if (event.key === "/") {
        event.preventDefault()
        document
          .querySelector<HTMLInputElement>('[data-documents-hotkey="search-input"]')
          ?.focus()
        return
      }

      if (!event.altKey) return

      switch (event.key) {
        case "1":
          event.preventDefault()
          setDisplayMode("table")
          return
        case "2":
          event.preventDefault()
          setDisplayMode("smallCards")
          return
        case "3":
          event.preventDefault()
          setDisplayMode("largeCards")
          return
        case "c":
        case "C":
          event.preventDefault()
          clickHotkeyTarget('[data-documents-hotkey="columns-trigger"]')
          return
        case "f":
        case "F":
          event.preventDefault()
          clickHotkeyTarget('[data-documents-hotkey="dates-trigger"]')
          return
        case "v":
        case "V":
          event.preventDefault()
          clickHotkeyTarget('[data-documents-hotkey="views-trigger"]')
          return
        case "ArrowLeft":
          if (currentPage > 1) {
            event.preventDefault()
            navigatePage(currentPage - 1)
          }
          return
        case "ArrowRight":
          if (currentPage < pageCount) {
            event.preventDefault()
            navigatePage(currentPage + 1)
          }
          return
        default:
          return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentPage, pageCount, previewDocument, previewDocuments, router, searchParams])

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <RealtimeDocumentListSync />
      <DataTableHeaderBar
        currentPage={currentPage}
        pageCount={pageCount}
        totalCount={totalCount}
        displayMode={displayMode}
        cardSize={cardSize}
        onCardSizeChange={handleCardSizeChange}
      />
      <FilterPanel
        correspondents={correspondents}
        documentTypes={documentTypes}
        storagePaths={storagePaths}
        tags={tags}
        users={users}
        savedViews={savedViews}
        activeViewId={activeView?.id ?? null}
        activeViewName={activeView?.name ?? null}
        activeView={activeView}
        initialFilters={currentFilters}
        currentUserId={currentUserId}
        extraDirty={activeViewLayoutDirty}
        onSaveExtras={
          activeView?.id != null
            ? (() => {
                const activeViewId = activeView.id
                return async () => {
                  await persistViewLayout(activeViewId)
                }
              })()
            : undefined
        }
        onCreateViewExtras={async (createdViewId) => {
          await persistViewLayout(createdViewId)
        }}
        trailingControls={(
          <>
            <DisplayModePicker
              displayMode={displayMode}
              onDisplayModeChange={setDisplayMode}
            />
            <ColumnsPicker
              customFields={customFields}
              displayFields={displayFields}
              onDisplayFieldsChange={setDisplayFields}
            />
          </>
        )}
        currentDisplayMode={displayMode}
        currentDisplayFields={displayFields}
        currentPageSize={currentPageSize}
      />
      {displayMode === "table" ? (
        <DataTable
          lookup={lookup}
          data={data}
          pageCount={pageCount}
          displayFields={displayFields}
          columnSizing={columnSizing}
          currentFilters={currentFilters}
          usersList={users}
          groupsList={groupsList}
          onColumnSizingChange={setColumnSizing}
          onPreviewDocument={setPreviewDocument}
        />
      ) : (
        <CardGrid
          data={data}
          lookup={lookup}
          displayMode={displayMode}
          displayFields={displayFields}
          cardSize={cardSize}
          onPreviewDocument={setPreviewDocument}
        />
      )}
      <DocumentPreviewDialog
        documentId={previewDocument?.id ?? null}
        documentTitle={previewDocument?.title}
        documents={previewDocuments}
        onClose={() => setPreviewDocument(null)}
        onDocumentChange={setPreviewDocument}
      />
    </div>
  )
}
