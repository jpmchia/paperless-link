"use client"

import * as React from "react"
import { toast } from "sonner"
import { useRealtimeDocumentRefresh } from "@/hooks/use-realtime-document-refresh"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface MetadataDocument {
  added?: string
  id?: number
  modified?: string
}

interface DocumentMetadata {
  archive_checksum?: string
  archive_metadata?: Record<string, unknown> | unknown[] | null
  archive_size?: number
  has_archive_version?: boolean
  media_filename?: string
  media_info?: Record<string, unknown> | unknown[] | null
  original_metadata?: Record<string, unknown> | unknown[] | null
  original_checksum?: string
  original_filename?: string
  original_mime_type?: string
  original_size?: number
  [key: string]: unknown
}

function formatFileSize(bytes?: number) {
  if (bytes === undefined || bytes === null) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatDate(dateString?: string) {
  if (!dateString) return "Unknown"
  const d = new Date(dateString)
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

async function fetchMetadata(documentId: number) {
  const [documentResponse, metadataResponse] = await Promise.all([
    fetch(`/api/proxy/documents/${documentId}/?full_perms=true`),
    fetch(`/api/proxy/documents/${documentId}/metadata/`),
  ])

  if (!documentResponse.ok || !metadataResponse.ok) {
    throw new Error("Failed to load document metadata")
  }

  return {
    document: await documentResponse.json(),
    metadata: await metadataResponse.json(),
  }
}

export function MetadataTab({
  metadata,
  document,
}: {
  metadata: DocumentMetadata | null
  document: MetadataDocument | null
}) {
  const [currentDocument, setCurrentDocument] = React.useState(document)
  const [currentMetadata, setCurrentMetadata] = React.useState(metadata)
  const refreshToken = useRealtimeDocumentRefresh({
    documentId: document?.id ?? 0,
    enabled: typeof document?.id === "number",
  })

  React.useEffect(() => {
    setCurrentDocument(document)
  }, [document])

  React.useEffect(() => {
    setCurrentMetadata(metadata)
  }, [metadata])

  React.useEffect(() => {
    if (!document?.id || refreshToken === 0) return

    void fetchMetadata(document.id)
      .then(({ document: nextDocument, metadata: nextMetadata }) => {
        setCurrentDocument(nextDocument)
        setCurrentMetadata(nextMetadata)
      })
      .catch((error: unknown) => {
        toast.error("Failed to refresh metadata", {
          description: error instanceof Error ? error.message : "Unknown error",
        })
      })
  }, [document?.id, refreshToken])

  if (!currentMetadata) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-muted-foreground">
        No metadata available for this document.
      </div>
    )
  }

  const renderSimpleRow = (label: string, value: unknown) => {
    if (value === null || value === undefined) return null
    return (
      <div className="flex flex-col py-2 text-sm sm:flex-row">
        <div className="w-1/3 pr-4 font-medium text-muted-foreground">{label}</div>
        <div className="w-2/3 break-all text-foreground">{String(value)}</div>
      </div>
    )
  }

  const renderMetadataEntries = (data: unknown) => {
    if (!data) return null
    if (!Array.isArray(data) && Object.keys(data as Record<string, unknown>).length === 0) {
      return null
    }

    if (Array.isArray(data)) {
      return (
        <div className="space-y-1">
          {data.map((item, i) => {
            if (typeof item === "object" && item !== null) {
              const obj = item as Record<string, unknown>
              const keyStr =
                obj.prefix || obj.key
                  ? `${String(obj.prefix ?? "")}${obj.prefix ? ":" : ""}${String(obj.key ?? "")}`
                  : `Item ${i}`
              const valStr =
                obj.value !== undefined ? String(obj.value) : JSON.stringify(obj)
              return (
                <div key={i} className="flex flex-col py-1.5 text-sm sm:flex-row">
                  <div className="w-1/3 break-all pr-4 font-medium text-muted-foreground">
                    {keyStr}
                  </div>
                  <div className="w-2/3 break-all text-foreground">{valStr}</div>
                </div>
              )
            }
            return (
              <div key={i} className="w-full break-all py-1.5 text-sm">
                {String(item)}
              </div>
            )
          })}
        </div>
      )
    }

    return (
      <div className="space-y-1">
        {Object.entries(data as Record<string, unknown>).map(([key, value]) => (
          <div key={key} className="flex flex-col py-1.5 text-sm sm:flex-row">
            <div className="w-1/3 break-all pr-4 font-medium text-muted-foreground">
              {key}
            </div>
            <div className="w-2/3 break-all text-foreground">{String(value)}</div>
          </div>
        ))}
      </div>
    )
  }

  const hasOriginalMetadata = Boolean(
    currentMetadata.original_metadata &&
      (Array.isArray(currentMetadata.original_metadata)
        ? currentMetadata.original_metadata.length > 0
        : Object.keys(currentMetadata.original_metadata).length > 0)
  )

  const hasArchiveMetadata = Boolean(
    currentMetadata.archive_metadata &&
      (Array.isArray(currentMetadata.archive_metadata)
        ? currentMetadata.archive_metadata.length > 0
        : Object.keys(currentMetadata.archive_metadata).length > 0)
  )

  const hasMediaInfo = Boolean(
    currentMetadata.media_info && Object.keys(currentMetadata.media_info).length > 0
  )

  return (
    <ScrollArea className="h-full">
      <div className="max-w-4xl space-y-2 px-6 py-6 pb-20">
        {renderSimpleRow("Date modified", formatDate(currentDocument?.modified))}
        {renderSimpleRow("Date added", formatDate(currentDocument?.added))}
        {renderSimpleRow("Media filename", currentMetadata.media_filename)}

        <div className="py-2" />

        {renderSimpleRow("Original filename", currentMetadata.original_filename)}
        {renderSimpleRow("Original MD5 checksum", currentMetadata.original_checksum)}
        {renderSimpleRow("Original file size", formatFileSize(currentMetadata.original_size))}
        {renderSimpleRow("Original mime type", currentMetadata.original_mime_type)}

        <div className="py-2" />

        {hasOriginalMetadata && (
          <div className="mt-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="original-metadata" className="border-none">
                <AccordionTrigger className="justify-start gap-4 rounded-md bg-muted/20 px-4 py-2 text-sm font-semibold hover:no-underline">
                  Original document metadata
                </AccordionTrigger>
                <AccordionContent className="px-2 pt-4">
                  {renderMetadataEntries(currentMetadata.original_metadata)}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}

        {currentMetadata.has_archive_version && (
          <>
            {renderSimpleRow("Archive MD5 checksum", currentMetadata.archive_checksum)}
            {renderSimpleRow("Archive file size", formatFileSize(currentMetadata.archive_size))}

            {hasArchiveMetadata && (
              <div className="mt-6">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="archived-metadata" className="border-none">
                    <AccordionTrigger className="justify-start gap-4 rounded-md bg-muted/20 px-4 py-2 text-sm font-semibold hover:no-underline">
                      Archived document metadata
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pt-4">
                      {renderMetadataEntries(currentMetadata.archive_metadata)}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}

            {!hasArchiveMetadata && hasMediaInfo && (
                <div className="mt-6">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="media-info" className="border-none">
                      <AccordionTrigger className="justify-start gap-4 rounded-md bg-muted/20 px-4 py-2 text-sm font-semibold hover:no-underline">
                        Document media info
                      </AccordionTrigger>
                      <AccordionContent className="px-2 pt-4">
                        {renderMetadataEntries(currentMetadata.media_info)}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              )}
          </>
        )}
      </div>
    </ScrollArea>
  )
}
