"use client"

import * as React from "react"
import type { DataroomRelease } from "@/lib/link-iq-types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CarouselItem } from "@/components/ui/carousel"
import { cn } from "@/lib/utils"
import type { PaperlessDocument } from "../datarooms-types"

export type DataroomsCarouselReleaseHistorySlideProps = {
  filteredSourceDocuments: PaperlessDocument[]
  selectedReleaseDocumentID: string
  setSelectedReleaseDocumentID: (id: string) => void
  releaseItemStatusByDocumentID: Map<string, string>
  upstreamChangedDocumentIDs: Set<string>
  releases: DataroomRelease[]
  formatDateTime: (value?: string | null) => string
}

export function DataroomsCarouselReleaseHistorySlide({
  filteredSourceDocuments,
  selectedReleaseDocumentID,
  setSelectedReleaseDocumentID,
  releaseItemStatusByDocumentID,
  upstreamChangedDocumentIDs,
  releases,
  formatDateTime,
}: DataroomsCarouselReleaseHistorySlideProps) {
  return (
    <CarouselItem className="h-full basis-full pl-0">
      <div className="grid h-full min-h-0 grid-cols-3 gap-4">
        <Card className="col-span-2 min-h-0">
          <CardHeader>
            <CardTitle>Document list view</CardTitle>
            <CardDescription>Select a document to view release and audit history.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[70vh] space-y-1 overflow-auto">
            {filteredSourceDocuments.slice(0, 200).map((doc) => {
              const docID = String(doc.id)
              const isSelected = selectedReleaseDocumentID === docID
              const status = releaseItemStatusByDocumentID.get(docID)
              const hasChanges = upstreamChangedDocumentIDs.has(docID)
              return (
                <button
                  type="button"
                  key={`history-doc-${docID}`}
                  className={cn(
                    "flex w-full items-center gap-2 rounded border px-2 py-1 text-left text-xs",
                    isSelected && "border-primary bg-muted/40",
                  )}
                  onClick={() => setSelectedReleaseDocumentID(docID)}
                >
                  <span className="font-mono text-muted-foreground">{docID}</span>
                  <span className="truncate">{doc.title || `Document ${docID}`}</span>
                  {status ? (
                    <Badge variant="outline" className="ml-auto h-5 text-[10px]">
                      {status}
                    </Badge>
                  ) : null}
                  {hasChanges ? (
                    <Badge variant="secondary" className="h-5 text-[10px]">
                      upstream changed
                    </Badge>
                  ) : null}
                </button>
              )
            })}
          </CardContent>
        </Card>
        <Card className="min-h-0">
          <CardHeader>
            <CardTitle>Release / Audit history</CardTitle>
            <CardDescription>
              Immutable snapshots and publish actions for the selected document.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[70vh] space-y-2 overflow-auto text-xs">
            {releases.length === 0 ? (
              <p className="text-muted-foreground">No releases yet.</p>
            ) : (
              releases.map((release) => {
                const relevantItems = (release.manifest ?? []).filter(
                  (item) =>
                    !selectedReleaseDocumentID || String(item.document_id) === String(selectedReleaseDocumentID),
                )
                if (selectedReleaseDocumentID && relevantItems.length === 0) return null
                return (
                  <div key={release.release_id} className="space-y-1 rounded border p-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">v{release.version}</Badge>
                      <Badge variant="secondary">{release.status}</Badge>
                    </div>
                    <p className="text-muted-foreground">Actor: {release.published_by_subject_id || "system"}</p>
                    <p className="text-muted-foreground">Created: {formatDateTime(release.created_at)}</p>
                    <p className="text-muted-foreground">Published: {formatDateTime(release.published_at)}</p>
                    <p className="text-muted-foreground">
                      Snapshot immutable; upstream updates require explicit republish.
                    </p>
                    {relevantItems.length > 0 ? (
                      <p className="text-muted-foreground">Items in scope: {relevantItems.length}</p>
                    ) : null}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </CarouselItem>
  )
}
