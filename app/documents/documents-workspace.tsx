"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { updateUiSettings } from "@/app/actions/ui-settings"
import type { FilterParams } from "@/lib/api"
import { RealtimeDocumentListSync } from "@/components/realtime-document-list-sync"
import { DEFAULT_DISPLAY_FIELDS, LookupMaps } from "./columns"
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

interface DocumentsWorkspaceProps {
  activeView?: any
  correspondents: any[]
  currentFilters: FilterParams
  currentPage: number
  currentPageSize: number
  customFields: Array<{ id: number; name: string }>
  data: any[]
  documentTypes: any[]
  groupsList?: any[]
  lookup: LookupMaps
  pageCount: number
  savedViews: any[]
  storagePaths: any[]
  tags: any[]
  title?: string | null
  totalCount: number
  users?: Array<{ id: number; username?: string; first_name?: string; last_name?: string }>
  currentUserId?: number | null
  initialDisplayMode?: string | null
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
}: DocumentsWorkspaceProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeViewDisplayFieldsKey = React.useMemo(
    () => activeView?.display_fields?.join(",") ?? "",
    [activeView?.display_fields]
  )

  const [displayFields, setDisplayFields] = React.useState<string[]>(
    activeView?.display_fields?.length ? activeView.display_fields : DEFAULT_DISPLAY_FIELDS
  )
  const [displayMode, setDisplayMode] = React.useState<DocumentDisplayMode>(() =>
    resolveDocumentDisplayMode(activeView?.display_mode, initialDisplayMode)
  )
  const [smallCardSize, setSmallCardSize] = React.useState(190)
  const [largeCardSize, setLargeCardSize] = React.useState(280)
  const [previewDocument, setPreviewDocument] = React.useState<{
    id: number
    title?: string
  } | null>(null)

  React.useEffect(() => {
    if (activeView?.display_fields?.length) {
      setDisplayFields(activeView.display_fields)
    } else {
      setDisplayFields(DEFAULT_DISPLAY_FIELDS)
    }
  }, [activeView?.id, activeViewDisplayFieldsKey])

  React.useEffect(() => {
    setDisplayMode(resolveDocumentDisplayMode(activeView?.display_mode, initialDisplayMode))
  }, [activeView?.id, activeView?.display_mode, initialDisplayMode])

  React.useEffect(() => {
    if (activeView?.id) return

    const timeout = window.setTimeout(() => {
      void updateUiSettings({
        document_list_display_mode: displayMode,
      }).catch(() => {
        // Silently ignore workspace preference persistence failures.
      })
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [activeView?.id, displayMode])

  const cardSize = displayMode === "largeCards" ? largeCardSize : smallCardSize
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
          currentFilters={currentFilters}
          usersList={users}
          groupsList={groupsList}
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
