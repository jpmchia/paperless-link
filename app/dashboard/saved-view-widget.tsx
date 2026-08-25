"use client"

import * as React from "react"
import Link from "next/link"
import { AlertCircle, GripVertical } from "lucide-react"
import { OpenDocumentLink } from "@/components/open-document-link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getSavedViewIcon } from "@/data/saved-view-icons"
import type {
  DashboardSavedViewWidget as DashboardSavedViewWidgetData,
} from "@/lib/dashboard-saved-views"
import { formatUserPreferenceDate } from "@/lib/user-preferences"
import { useUserPreferences } from "@/components/user-preferences-provider"

function renderMetadata(
  correspondent: string | undefined,
  documentType: string | undefined,
  created: string
) {
  const parts = [correspondent, documentType, created].filter(Boolean)
  return parts.join(" · ")
}

export function SavedViewWidget({
  correspondents,
  documentTypes,
  dragHandleProps,
  loading = false,
  widget,
}: {
  correspondents: Record<number, string>
  documentTypes: Record<number, string>
  dragHandleProps?: React.ButtonHTMLAttributes<HTMLButtonElement>
  loading?: boolean
  widget: DashboardSavedViewWidgetData
}) {
  const preferences = useUserPreferences()
  const ViewIcon = getSavedViewIcon(widget.view.icon)
  const error = widget.error
  const documents = widget.documents

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              aria-label={`Reorder ${widget.view.name}`}
              className="mt-0.5 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground"
              {...dragHandleProps}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ViewIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <CardTitle className="truncate text-base">
                  {widget.view.name}
                </CardTitle>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {widget.count.toLocaleString()} total
              </p>
            </div>
          </div>
          <Link
            href={`/view/${widget.view.id}`}
            aria-label={`View all ${widget.view.name} documents`}
            className="shrink-0 text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2 rounded-lg border p-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Error loading documents</p>
              <p className="text-xs text-destructive/80">{error}</p>
            </div>
          </div>
        ) : documents.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No documents
          </p>
        ) : (
          <div className="space-y-2">
            {documents.map((document) => (
              <OpenDocumentLink
                key={document.id}
                documentId={document.id}
                href={`/documents/${document.id}`}
                title={document.title}
                className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <p className="truncate text-sm font-medium leading-none">
                  {document.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {renderMetadata(
                    document.correspondent
                      ? correspondents[document.correspondent]
                      : undefined,
                    document.document_type
                      ? documentTypes[document.document_type]
                      : undefined,
                    formatUserPreferenceDate(document.created, preferences, {
                      timeZone: "UTC",
                    })
                  )}
                </p>
              </OpenDocumentLink>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
