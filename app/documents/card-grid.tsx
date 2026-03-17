"use client"

import * as React from "react"
import { OpenDocumentLink } from "@/components/open-document-link"
import { tagPillStyle } from "@/lib/tag-colors"
import type { LookupMaps } from "./columns"

interface CardGridProps {
  data: any[]
  lookup: LookupMaps
}

export function CardGrid({ data, lookup }: CardGridProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        No documents match the current filters.
      </div>
    )
  }

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {data.map((doc: any) => {
        const correspondent = doc.correspondent
          ? lookup.correspondents[doc.correspondent]?.name
          : null
        const docType = doc.document_type
          ? lookup.documentTypes[doc.document_type]?.name
          : null
        const tags = (doc.tags || [])
          .map((tagId: number) => lookup.tags[tagId])
          .filter(Boolean)

        return (
          <OpenDocumentLink
            key={doc.id}
            documentId={doc.id}
            href={`/documents/${doc.id}`}
            title={doc.title}
            className="group rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden hover:shadow-md hover:border-primary/50 transition-all flex flex-col"
          >
            {/* Thumbnail */}
            <div className="relative aspect-[3/4] w-full bg-muted overflow-hidden">
              <img
                src={`/api/proxy/documents/${doc.id}/thumb/`}
                alt={doc.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
                loading="lazy"
              />
              {doc.archive_serial_number && (
                <span className="absolute top-1.5 right-1.5 bg-background/80 backdrop-blur text-[10px] font-mono px-1.5 py-0.5 rounded">
                  ASN {doc.archive_serial_number}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="p-2.5 flex flex-col gap-1.5 flex-1 min-h-0">
              <p className="text-xs font-medium leading-snug line-clamp-2" title={doc.title}>
                {doc.title}
              </p>

              {/* Meta line */}
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                {correspondent && <span className="truncate">{correspondent}</span>}
                {correspondent && docType && <span>·</span>}
                {docType && <span className="truncate">{docType}</span>}
              </div>

              {/* Date */}
              <p className="text-[10px] text-muted-foreground">
                {doc.created ? new Date(doc.created).toLocaleDateString() : ""}
              </p>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-auto">
                  {tags.slice(0, 3).map((tag: any) => (
                    <span
                      key={tag.id}
                      className="inline-block text-[9px] px-1.5 py-0.5 rounded-full"
                      style={tagPillStyle(tag.color)}
                    >
                      {tag.name}
                    </span>
                  ))}
                  {tags.length > 3 && (
                    <span className="text-[9px] text-muted-foreground px-1">
                      +{tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </OpenDocumentLink>
        )
      })}
    </div>
  )
}
