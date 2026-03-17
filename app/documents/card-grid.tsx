"use client"

import * as React from "react"
import { OpenDocumentLink } from "@/components/open-document-link"
import { tagPillStyle } from "@/lib/tag-colors"
import type { LookupMaps } from "./columns"
import type { DocumentDisplayMode } from "./display-mode"

interface CardGridProps {
  data: any[]
  lookup: LookupMaps
  displayMode?: DocumentDisplayMode
}

export function CardGrid({
  data,
  lookup,
  displayMode = "smallCards",
}: CardGridProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        No documents match the current filters.
      </div>
    )
  }

  const isLarge = displayMode === "largeCards"

  return (
    <div
      className={
        isLarge
          ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          : "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      }
    >
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
            className={
              "group flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:border-primary/50 hover:shadow-md " +
              (isLarge ? "min-h-[22rem]" : "")
            }
          >
            {/* Thumbnail */}
            <div
              className={
                "relative w-full overflow-hidden bg-muted " +
                (isLarge ? "aspect-[16/10]" : "aspect-[3/4]")
              }
            >
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
            <div
              className={
                "flex min-h-0 flex-1 flex-col " +
                (isLarge ? "gap-2 p-3" : "gap-1.5 p-2.5")
              }
            >
              <p
                className={
                  "font-medium leading-snug " +
                  (isLarge ? "line-clamp-3 text-sm" : "line-clamp-2 text-xs")
                }
                title={doc.title}
              >
                {doc.title}
              </p>

              {/* Meta line */}
              <div
                className={
                  "flex items-center gap-1.5 text-muted-foreground " +
                  (isLarge ? "text-xs" : "text-[10px]")
                }
              >
                {correspondent && <span className="truncate">{correspondent}</span>}
                {correspondent && docType && <span>·</span>}
                {docType && <span className="truncate">{docType}</span>}
              </div>

              {/* Date */}
              <p className={isLarge ? "text-xs text-muted-foreground" : "text-[10px] text-muted-foreground"}>
                {doc.created ? new Date(doc.created).toLocaleDateString() : ""}
              </p>

              {/* Tags */}
              {tags.length > 0 && (
                <div className={isLarge ? "mt-auto flex flex-wrap gap-1" : "mt-auto flex flex-wrap gap-0.5"}>
                  {tags.slice(0, isLarge ? 4 : 3).map((tag: any) => (
                    <span
                      key={tag.id}
                      className={
                        "inline-block rounded-full px-1.5 py-0.5 " +
                        (isLarge ? "text-[10px]" : "text-[9px]")
                      }
                      style={tagPillStyle(tag.color)}
                    >
                      {tag.name}
                    </span>
                  ))}
                  {tags.length > (isLarge ? 4 : 3) && (
                    <span className={isLarge ? "px-1 text-[10px] text-muted-foreground" : "px-1 text-[9px] text-muted-foreground"}>
                      +{tags.length - (isLarge ? 4 : 3)}
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
