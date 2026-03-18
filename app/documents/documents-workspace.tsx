"use client"

import * as React from "react"
import { updateUiSettings } from "@/lib/ui-settings"
import type { FilterParams } from "@/lib/api"
import { RealtimeDocumentListSync } from "@/components/realtime-document-list-sync"
import { DEFAULT_DISPLAY_FIELDS, LookupMaps } from "./columns"
import { FilterPanel } from "./filter-panel"
import { DataTable, DataTableHeaderBar } from "./data-table"
import { ColumnsPicker } from "./columns-picker"
import { CardGrid } from "./card-grid"
import { DisplayModePicker } from "./display-mode-picker"
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
      })
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [activeView?.id, displayMode])

  const cardSize = displayMode === "largeCards" ? largeCardSize : smallCardSize

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
        />
      ) : (
        <CardGrid
          data={data}
          lookup={lookup}
          displayMode={displayMode}
          displayFields={displayFields}
          cardSize={cardSize}
        />
      )}
    </div>
  )
}
