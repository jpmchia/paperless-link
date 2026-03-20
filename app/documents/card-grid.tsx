"use client"

import * as React from "react"
import { OpenDocumentLink } from "@/components/open-document-link"
import { tagPillStyle } from "@/lib/tag-colors"
import {
  CUSTOM_FIELD_PREFIX,
  DISPLAY_FIELD_ADDED,
  DISPLAY_FIELD_ASN,
  DISPLAY_FIELD_CORRESPONDENT,
  DISPLAY_FIELD_CREATED,
  DISPLAY_FIELD_DOCUMENT_TYPE,
  DISPLAY_FIELD_MODIFIED,
  DISPLAY_FIELD_NOTES,
  DISPLAY_FIELD_OWNER,
  DISPLAY_FIELD_PAGE_COUNT,
  DISPLAY_FIELD_SHARED,
  DISPLAY_FIELD_STORAGE_PATH,
  DISPLAY_FIELD_TAGS,
  DISPLAY_FIELD_TITLE,
  getCustomFieldDisplayValue,
  type Document,
  type LookupMaps,
} from "./columns"
import type { DocumentDisplayMode } from "./display-mode"
import {
  CalendarDays,
  ScanEye,
  FileText,
  FolderArchive,
  Hash,
  Lock,
  MessageSquareText,
  Share2,
  Tag,
  User,
} from "lucide-react"

type OverlayItem =
  | {
      key: string
      kind: "title"
      value: string
    }
  | {
      key: string
      kind: "tags"
      tags: Array<{ id: number; name: string; color: string }>
    }
  | {
      key: string
      kind: "meta"
      value: string
      icon: React.ComponentType<{ className?: string }>
    }

interface CardGridProps {
  data: Document[]
  lookup: LookupMaps
  displayMode?: DocumentDisplayMode
  displayFields?: string[]
  cardSize?: number
  onPreviewDocument?: (document: { id: number; title?: string }) => void
}

function formatDocumentDate(value?: string | null) {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  })
}

function getOwnerLabel(
  ownerId: number | null | undefined,
  lookup: LookupMaps
) {
  if (!ownerId) return null

  const user = lookup.users?.[ownerId]
  if (!user) return `#${ownerId}`

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim()
  return fullName || user.username || `#${ownerId}`
}

function getCustomFieldText(document: Document, fieldId: number, lookup: LookupMaps) {
  const customField = lookup.customFields[fieldId]
  const value = document.custom_fields?.find((entry) => entry.field === fieldId)?.value

  if (!customField) return null
  if (value === undefined || value === null || value === "") return `${customField.name}: -`

  const displayValue = getCustomFieldDisplayValue(customField, value)
  return `${customField.name}: ${displayValue ?? "-"}`
}

function buildOverlayFields(
  document: Document,
  lookup: LookupMaps,
  displayFields: string[]
): OverlayItem[] {
  const tags = (document.tags || [])
    .map((tagId: number) => lookup.tags[tagId])
    .filter(Boolean)

  return displayFields.flatMap<OverlayItem>((field): OverlayItem[] => {
    switch (field) {
      case DISPLAY_FIELD_TITLE:
        return document.title
          ? [{ key: field, kind: "title", value: document.title }]
          : []
      case DISPLAY_FIELD_TAGS:
        return tags.length > 0
          ? [{ key: field, kind: "tags", tags }]
          : []
      case DISPLAY_FIELD_CORRESPONDENT: {
        const name = document.correspondent
          ? lookup.correspondents[document.correspondent]?.name
          : null
        return name ? [{ key: field, kind: "meta", value: name, icon: User }] : []
      }
      case DISPLAY_FIELD_DOCUMENT_TYPE: {
        const name = document.document_type
          ? lookup.documentTypes[document.document_type]?.name
          : null
        return name ? [{ key: field, kind: "meta", value: name, icon: FileText }] : []
      }
      case DISPLAY_FIELD_STORAGE_PATH: {
        const name = document.storage_path
          ? lookup.storagePaths[document.storage_path]?.name
          : null
        return name ? [{ key: field, kind: "meta", value: name, icon: FolderArchive }] : []
      }
      case DISPLAY_FIELD_CREATED: {
        const value = formatDocumentDate(document.created)
        return value ? [{ key: field, kind: "meta", value, icon: CalendarDays }] : []
      }
      case DISPLAY_FIELD_ADDED: {
        const value = formatDocumentDate(document.added)
        return value ? [{ key: field, kind: "meta", value, icon: CalendarDays }] : []
      }
      case DISPLAY_FIELD_MODIFIED: {
        const value = formatDocumentDate(document.modified)
        return value ? [{ key: field, kind: "meta", value, icon: CalendarDays }] : []
      }
      case DISPLAY_FIELD_ASN:
        return document.archive_serial_number
          ? [{ key: field, kind: "meta", value: `#${document.archive_serial_number}`, icon: Hash }]
          : []
      case DISPLAY_FIELD_NOTES: {
        const count = typeof document.num_notes === "number"
          ? document.num_notes
          : document.notes?.length ?? 0
        return count > 0
          ? [{ key: field, kind: "meta", value: `${count}`, icon: MessageSquareText }]
          : []
      }
      case DISPLAY_FIELD_OWNER: {
        const owner = getOwnerLabel(document.owner, lookup)
        return owner ? [{ key: field, kind: "meta", value: owner, icon: Lock }] : []
      }
      case DISPLAY_FIELD_SHARED:
        return document.is_shared_by_requester
          ? [{ key: field, kind: "meta", value: "Shared", icon: Share2 }]
          : []
      case DISPLAY_FIELD_PAGE_COUNT:
        return document.page_count
          ? [{
              key: field,
              kind: "meta",
              value: document.page_count === 1 ? "1 page" : `${document.page_count} pages`,
              icon: FileText,
            }]
          : []
      default:
        if (field.startsWith(CUSTOM_FIELD_PREFIX)) {
          const fieldId = Number(field.slice(CUSTOM_FIELD_PREFIX.length))
          const text = getCustomFieldText(document, fieldId, lookup)
          return text ? [{ key: field, kind: "meta", value: text, icon: Tag }] : []
        }
        return []
    }
  })
}

export function CardGrid({
  data,
  lookup,
  displayMode = "smallCards",
  displayFields = [
    DISPLAY_FIELD_TITLE,
    DISPLAY_FIELD_CREATED,
    DISPLAY_FIELD_TAGS,
    DISPLAY_FIELD_CORRESPONDENT,
  ],
  cardSize = 220,
  onPreviewDocument,
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
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))`,
      }}
    >
      {data.map((doc) => {
        const overlayFields = buildOverlayFields(doc, lookup, displayFields)

        return (
          <div
            key={doc.id}
            className={
              "group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:border-primary/50 hover:shadow-md " +
              (isLarge ? "min-h-[22rem]" : "min-h-[18rem]")
            }
          >
            {onPreviewDocument && (
              <button
                type="button"
                className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-black/45 text-white/90 opacity-0 backdrop-blur-sm transition-all hover:bg-black/65 group-hover:opacity-100"
                title="Quick preview"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onPreviewDocument({
                    id: doc.id,
                    title: doc.title,
                  })
                }}
              >
                <ScanEye className="h-4 w-4" />
              </button>
            )}

            <OpenDocumentLink
              documentId={doc.id}
              href={`/documents/${doc.id}`}
              title={doc.title}
              className="block h-full"
            >
              <div
                className={
                  "relative w-full overflow-hidden bg-muted " +
                  (isLarge ? "aspect-[4/3]" : "aspect-[3/4]")
                }
              >
                <img
                  src={`/api/proxy/documents/${doc.id}/thumb/`}
                  alt={doc.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                  loading="lazy"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

                <div className="absolute inset-x-0 bottom-0 p-3">
                  <div className="flex flex-wrap items-start gap-1.5">
                    {overlayFields.map((field) => {
                      if (field.kind === "title") {
                        return (
                          <p
                            key={field.key}
                            className={
                              "basis-full font-medium leading-snug text-white drop-shadow-sm " +
                              (isLarge ? "line-clamp-3 text-base" : "line-clamp-2 text-sm")
                            }
                            title={field.value}
                          >
                            {field.value}
                          </p>
                        )
                      }

                      if (field.kind === "tags") {
                        return (
                          <div key={field.key} className="basis-full flex flex-wrap gap-1">
                            {field.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className={
                                  "inline-flex rounded-full border border-white/25 bg-black/55 px-1.5 py-0.5 text-white/95 backdrop-blur-sm " +
                                  (isLarge ? "text-[10px]" : "text-[9px]")
                                }
                                style={tagPillStyle(tag.color)}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )
                      }

                      const Icon = field.icon
                      return (
                        <div
                          key={field.key}
                          className={
                            "inline-flex max-w-full flex-none self-start items-center gap-1 rounded-md border border-white/15 bg-black/50 px-2 py-1 text-white/90 backdrop-blur-sm " +
                            (isLarge ? "text-xs" : "text-[10px]")
                          }
                        >
                          <Icon className="h-3 w-3 shrink-0" />
                          <span className="truncate">{field.value}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </OpenDocumentLink>
          </div>
        )
      })}
    </div>
  )
}
