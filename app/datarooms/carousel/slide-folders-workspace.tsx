"use client"

import * as React from "react"
import type { DataroomFolder, DataroomReleaseItem } from "@/lib/link-iq-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CarouselItem } from "@/components/ui/carousel"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/app/documents/data-table"
import { FolderHierarchyCard } from "@/app/datarooms/components/folder-hierarchy-card"
import type { PublishWorkspaceView } from "../datarooms-types"

export type DataroomsFoldersWorkspaceSlideProps = {
  folderHierarchy: React.ComponentProps<typeof FolderHierarchyCard>
  workspace: {
    effectivePublishWorkspaceView: PublishWorkspaceView
    isManualSelectedFolder: boolean
    setPublishWorkspaceView: (value: PublishWorkspaceView) => void
    selectedHierarchyFolder: DataroomFolder | null | undefined
    documentsLoading: boolean
    documentSearch: string
    setDocumentSearch: (value: string) => void
    loadSourceDocuments: () => void | Promise<void>
    documentsTableData: React.ComponentProps<typeof DataTable>["data"]
    documentsLookup: React.ComponentProps<typeof DataTable>["lookup"]
    setSelectedDocumentIDs: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
    setSelectedReleaseDocumentID: (id: string) => void
    selectedFolderPublishedItems: DataroomReleaseItem[]
    selectedFolderScheduledItems: DataroomReleaseItem[]
    folders: DataroomFolder[]
    formatDateTime: (value?: string | null) => string
    scheduleSelectedDocuments: () => void | Promise<void>
    selectedId: string
    selectedDocumentCount: number
    publishingDocuments: boolean
    immediateWorkspaceRows: Array<{
      id: string
      title: string
      publishedAt?: string
      status: string
      scheduledAt?: string
    }>
    scheduledWorkspaceRows: Array<{
      id: string
      title: string
      status: string
      referenceTime?: string
    }>
    lastPublishedAtForSelectedFolder: string | undefined
    scheduledDefaultTime: string
  }
}

export function DataroomsCarouselFoldersWorkspaceSlide({
  folderHierarchy,
  workspace,
}: DataroomsFoldersWorkspaceSlideProps) {
  const {
    effectivePublishWorkspaceView,
    isManualSelectedFolder,
    setPublishWorkspaceView,
    selectedHierarchyFolder,
    documentsLoading,
    documentSearch,
    setDocumentSearch,
    loadSourceDocuments,
    documentsTableData,
    documentsLookup,
    setSelectedDocumentIDs,
    setSelectedReleaseDocumentID,
    selectedFolderPublishedItems,
    selectedFolderScheduledItems,
    folders,
    formatDateTime,
    scheduleSelectedDocuments,
    selectedId,
    selectedDocumentCount,
    publishingDocuments,
    immediateWorkspaceRows,
    scheduledWorkspaceRows,
    lastPublishedAtForSelectedFolder,
    scheduledDefaultTime,
  } = workspace

  return (
    <CarouselItem className="h-full basis-full pl-0">
      <div className="grid h-full min-h-0 grid-cols-4 grid-rows-2 gap-4">
        <div className="col-span-2 row-span-2 min-h-0 overflow-auto">
          <FolderHierarchyCard {...folderHierarchy} />
        </div>
        {effectivePublishWorkspaceView === "manual" ? (
          <>
            <Card className="col-span-2 min-h-0">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle>Source documents</CardTitle>
                    <CardDescription>
                      {selectedHierarchyFolder
                        ? `Context: ${selectedHierarchyFolder.label} (${selectedHierarchyFolder.linked_item_label || "manual folder"})`
                        : "Select a folder in the tree to apply context, then choose source documents."}
                    </CardDescription>
                  </div>
                  <select
                    className="h-9 w-[190px] rounded-md border border-input bg-input/20 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                    value={effectivePublishWorkspaceView}
                    onChange={(event) =>
                      setPublishWorkspaceView(event.target.value as PublishWorkspaceView)
                    }
                    disabled={isManualSelectedFolder}
                  >
                    <option value="immediate">Immediate view</option>
                    <option value="scheduled">Scheduled view</option>
                    <option value="manual">Manual schedule view</option>
                  </select>
                  <Button
                    onClick={() => void scheduleSelectedDocuments()}
                    disabled={!selectedId || selectedDocumentCount === 0 || publishingDocuments}
                    className="min-w-[152px]"
                  >
                    {publishingDocuments ? "Scheduling..." : "Schedule selected"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  {/* <Input
                    value={documentSearch}
                    onChange={(event) => setDocumentSearch(event.target.value)}
                    placeholder="Search by title or ID"
                  /> */}
                  {/* <Button variant="outline" onClick={() => void loadSourceDocuments()} disabled={documentsLoading}>
                    Refresh
                  </Button> */}
                </div>
                <div className="h-[360px] min-h-0 overflow-hidden rounded-md border p-2">
                  {/* {documentsLoading ? (
                    <p className="text-muted-foreground text-xs">Loading documents...</p>
                  ) : documentsTableData.length === 0 ? (
                    <p className="text-muted-foreground text-xs">No matching documents.</p>
                  ) : ( */}
                    {/* <DataTable
                      lookup={documentsLookup}
                      data={documentsTableData}
                      pageCount={1}
                      onSelectedIdsChange={(ids) => {
                        setSelectedDocumentIDs(Object.fromEntries(ids.map((id) => [String(id), true])))
                      }}
                      onPreviewDocument={(document) => setSelectedReleaseDocumentID(String(document.id))}
                    />
                  )} */}
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-2 min-h-0">
              <CardHeader>
                <CardTitle>Published and scheduled</CardTitle>
                <CardDescription>
                  {selectedHierarchyFolder
                    ? `Showing release items for ${selectedHierarchyFolder.label}.`
                    : "Select a folder in the tree to scope release items."}
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-44 overflow-auto text-sm">
                <div className="space-y-2">
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">Published</p>
                    {selectedFolderPublishedItems.length === 0 ? (
                      <p className="text-muted-foreground text-xs">No published release items.</p>
                    ) : (
                      selectedFolderPublishedItems.slice(0, 80).map((item) => (
                        <div
                          key={`pub-${item.folder_id}-${item.document_id}`}
                          className="grid grid-cols-[84px_minmax(0,1fr)_120px] gap-2 rounded border px-2 py-1 text-xs"
                        >
                          <span className="font-mono text-muted-foreground">{item.document_id}</span>
                          <span className="truncate">
                            {folders.find((folder) => folder.folder_id === item.folder_id)?.label || item.folder_id}
                          </span>
                          <span className="text-right text-muted-foreground">
                            {item.published_at ? formatDateTime(item.published_at) : "published"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">Scheduled</p>
                    {selectedFolderScheduledItems.length === 0 ? (
                      <p className="text-muted-foreground text-xs">No scheduled release items.</p>
                    ) : (
                      selectedFolderScheduledItems.slice(0, 80).map((item) => (
                        <div
                          key={`sch-${item.folder_id}-${item.document_id}`}
                          className="grid grid-cols-[84px_minmax(0,1fr)_120px] gap-2 rounded border bg-muted/30 px-2 py-1 text-xs"
                        >
                          <span className="font-mono text-muted-foreground">{item.document_id}</span>
                          <span className="truncate">
                            {folders.find((folder) => folder.folder_id === item.folder_id)?.label || item.folder_id}
                          </span>
                          <span className="text-right text-muted-foreground">
                            {item.scheduled_at ? formatDateTime(item.scheduled_at) : "scheduled"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="col-span-2 row-span-2 min-h-0">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>
                    {effectivePublishWorkspaceView === "immediate" ? "Immediate view" : "Scheduled view"}
                  </CardTitle>
                  <CardDescription>
                    {effectivePublishWorkspaceView === "immediate"
                      ? "One list of included documents with dataroom publish timestamps."
                      : `One list showing already published documents and new documents queued for ${scheduledDefaultTime}.`}
                  </CardDescription>
                </div>
                <select
                  className="h-9 w-[190px] rounded-md border border-input bg-input/20 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                  value={effectivePublishWorkspaceView}
                  onChange={(event) => setPublishWorkspaceView(event.target.value as PublishWorkspaceView)}
                  disabled={isManualSelectedFolder}
                >
                  <option value="immediate">Immediate view</option>
                  <option value="scheduled">Scheduled view</option>
                  <option value="manual">Manual schedule view</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Input
                  value={documentSearch}
                  onChange={(event) => setDocumentSearch(event.target.value)}
                  placeholder="Search by title or ID"
                />
                <Button variant="outline" onClick={() => void loadSourceDocuments()} disabled={documentsLoading}>
                  Refresh
                </Button>
              </div>
              {effectivePublishWorkspaceView === "scheduled" && lastPublishedAtForSelectedFolder ? (
                <p className="text-muted-foreground text-xs">
                  Last published in selected scope: {formatDateTime(lastPublishedAtForSelectedFolder)}
                </p>
              ) : null}
              <div className="max-h-[460px] overflow-auto rounded-md border p-2">
                {documentsLoading ? (
                  <p className="text-muted-foreground text-xs">Loading documents...</p>
                ) : effectivePublishWorkspaceView === "immediate" && immediateWorkspaceRows.length === 0 ? (
                  <p className="text-muted-foreground text-xs">No included documents in scope.</p>
                ) : effectivePublishWorkspaceView === "scheduled" && scheduledWorkspaceRows.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    No published items or newly detected documents since the last release.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {(effectivePublishWorkspaceView === "immediate" ? immediateWorkspaceRows : scheduledWorkspaceRows)
                      .slice(0, 220)
                      .map((row) => (
                        <div
                          key={`workspace-${row.id}`}
                          className="grid grid-cols-[84px_minmax(0,1fr)_150px_164px] items-center gap-2 rounded border px-2 py-1 text-xs"
                        >
                          <span className="font-mono text-muted-foreground">{row.id}</span>
                          <span className="truncate">{row.title}</span>
                          <Badge variant={row.status === "published" ? "outline" : "secondary"} className="h-5 w-fit text-[10px]">
                            {row.status}
                          </Badge>
                          <span className="text-right text-muted-foreground">
                            {"publishedAt" in row
                              ? row.publishedAt
                                ? formatDateTime(row.publishedAt)
                                : row.scheduledAt
                                  ? `Scheduled ${formatDateTime(row.scheduledAt)}`
                                  : "Not yet published"
                              : "referenceTime" in row && row.referenceTime
                                ? formatDateTime(row.referenceTime)
                                : `Scheduled ${scheduledDefaultTime}`}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </CarouselItem>
  )
}
