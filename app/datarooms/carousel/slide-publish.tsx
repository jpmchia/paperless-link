"use client"

import * as React from "react"
import type { DataroomFolder } from "@/lib/link-iq-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CarouselItem } from "@/components/ui/carousel"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type DataroomsCarouselPublishSlideProps = {
  folders: DataroomFolder[]
  publishTargetFolderID: string
  setPublishTargetFolderID: (value: string) => void
  selectedDocumentCount: number
  publishMode: "immediate" | "scheduled"
  setPublishMode: (value: "immediate" | "scheduled") => void
  scheduledPublishAt: string
  setScheduledPublishAt: (value: string) => void
  publishSelectedDocuments: () => void | Promise<void>
  publishingDocuments: boolean
  selectedId: string
  placementCountsByFolder: Map<string, number>
}

export function DataroomsCarouselPublishSlide({
  folders,
  publishTargetFolderID,
  setPublishTargetFolderID,
  selectedDocumentCount,
  publishMode,
  setPublishMode,
  scheduledPublishAt,
  setScheduledPublishAt,
  publishSelectedDocuments,
  publishingDocuments,
  selectedId,
  placementCountsByFolder,
}: DataroomsCarouselPublishSlideProps) {
  return (
    <CarouselItem className="h-full basis-full pl-0">
      <div className="grid h-full min-h-0 grid-cols-2 gap-4">
        <Card className="min-h-0">
          <CardHeader>
            <CardTitle>Publish selection</CardTitle>
            <CardDescription>Choose target folder and publish selected documents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Label className="min-w-[96px]">Target folder</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-input/20 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                value={publishTargetFolderID || "__auto__"}
                onChange={(event) =>
                  setPublishTargetFolderID(event.target.value === "__auto__" ? "" : event.target.value)
                }
              >
                <option value="__auto__">Auto (selected parent / first folder)</option>
                {folders.map((folder) => (
                  <option key={folder.folder_id} value={folder.folder_id}>
                    {folder.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-muted-foreground text-xs">Selected documents: {selectedDocumentCount}</p>
            <div className="flex items-center gap-2">
              <Label className="min-w-[96px]">Method</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-input/20 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                value={publishMode}
                onChange={(event) => setPublishMode(event.target.value as "immediate" | "scheduled")}
              >
                <option value="immediate">Immediate</option>
                <option value="scheduled">Scheduled date/time</option>
              </select>
            </div>
            {publishMode === "scheduled" ? (
              <div className="flex items-center gap-2">
                <Label className="min-w-[96px]">Scheduled at</Label>
                <Input
                  type="datetime-local"
                  value={scheduledPublishAt}
                  onChange={(event) => setScheduledPublishAt(event.target.value)}
                />
              </div>
            ) : null}
            <Button
              onClick={() => void publishSelectedDocuments()}
              disabled={!selectedId || selectedDocumentCount === 0 || publishingDocuments}
            >
              {publishingDocuments
                ? publishMode === "scheduled"
                  ? "Scheduling..."
                  : "Publishing..."
                : publishMode === "scheduled"
                  ? "Schedule selected"
                  : "Publish selected"}
            </Button>
          </CardContent>
        </Card>
        <Card className="min-h-0">
          <CardHeader>
            <CardTitle>Publishing summary</CardTitle>
            <CardDescription>Folder-level publishing totals.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-44 overflow-auto text-sm">
            {folders.length === 0 ? (
              <p className="text-muted-foreground text-xs">No folders configured.</p>
            ) : (
              <div className="space-y-1">
                {folders.map((folder) => (
                  <div
                    key={folder.folder_id}
                    className="grid grid-cols-[minmax(0,1fr)_50px] items-center rounded border px-2 py-1 text-xs"
                  >
                    <span className="truncate">{folder.label}</span>
                    <span className="text-right text-muted-foreground">
                      {placementCountsByFolder.get(folder.folder_id) ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CarouselItem>
  )
}
