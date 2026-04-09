"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getJson, postJson } from "@/lib/paperless-client"
import { DocumentsWorkspace } from "@/app/dataroom/[slug]/view/workspace/documents-workspace"
import type { Document, LookupMaps } from "@/app/dataroom/[slug]/view/workspace/columns"
import type { FilterParams } from "@/lib/api"

type Props = {
  slug: string
}

type LookupItem = { id: number; name: string }
type WorkspaceTagOption = React.ComponentProps<typeof DocumentsWorkspace>["tags"][number]
type RawTagOption = { id: number; name: string; color?: string | number }
type UserOption = { id: number; username?: string; first_name?: string; last_name?: string }
type CustomFieldOption = {
  id: number
  name: string
  data_type: string
  extra_data?: { select_options?: Array<string | { id?: string | number; label?: string }> }
}

type Paginated<T> = { results?: T[] } | T[]

function normalizePaginatedArray<T>(payload: Paginated<T>): T[] {
  if (Array.isArray(payload)) return payload
  return Array.isArray(payload.results) ? payload.results : []
}

function idx<T extends { id: number }>(arr: T[]): Record<number, T> {
  return Object.fromEntries(arr.map((x) => [x.id, x])) as Record<number, T>
}

export function DataroomViewerSurface({ slug }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = React.useState("Loading dataroom...")
  const [documents, setDocuments] = React.useState<Document[]>([])
  const [correspondents, setCorrespondents] = React.useState<LookupItem[]>([])
  const [documentTypes, setDocumentTypes] = React.useState<LookupItem[]>([])
  const [storagePaths, setStoragePaths] = React.useState<LookupItem[]>([])
  const [tags, setTags] = React.useState<WorkspaceTagOption[]>([])
  const [users, setUsers] = React.useState<UserOption[]>([])
  const [customFields, setCustomFields] = React.useState<CustomFieldOption[]>([])

  const currentFilters = React.useMemo<FilterParams>(() => {
    const next: FilterParams = {}
    const query = searchParams?.get("query")
    const correspondent = searchParams?.get("correspondent")
    const documentType = searchParams?.get("document_type")
    const storagePath = searchParams?.get("storage_path")
    const tags = searchParams?.get("tags")
    const tagsExclude = searchParams?.get("tags_exclude")

    if (query) next.query = query
    if (correspondent) next.correspondent = Number(correspondent)
    if (documentType) next.documentType = Number(documentType)
    if (storagePath) next.storagePath = Number(storagePath)
    if (tags) next.tags = tags.split(",").map(Number).filter(Number.isFinite)
    if (tagsExclude) {
      next.tagsExclude = tagsExclude.split(",").map(Number).filter(Number.isFinite)
    }

    return next
  }, [searchParams])
  const selectedFolderID = searchParams?.get("folder_id")?.trim() || ""

  const filteredDocuments = React.useMemo(() => {
    const query = currentFilters.query?.trim().toLowerCase()

    return documents.filter((document) => {
      if (
        currentFilters.correspondent != null &&
        (document.correspondent ?? null) !== currentFilters.correspondent
      ) {
        return false
      }
      if (
        currentFilters.documentType != null &&
        (document.document_type ?? null) !== currentFilters.documentType
      ) {
        return false
      }
      if (
        currentFilters.storagePath != null &&
        (document.storage_path ?? null) !== currentFilters.storagePath
      ) {
        return false
      }
      if (currentFilters.tags?.length) {
        const docTags = document.tags ?? []
        const hasAllTags = currentFilters.tags.every((tagID) => docTags.includes(tagID))
        if (!hasAllTags) return false
      }
      if (currentFilters.tagsExclude?.length) {
        const docTags = document.tags ?? []
        const hasExcludedTag = currentFilters.tagsExclude.some((tagID) => docTags.includes(tagID))
        if (hasExcludedTag) return false
      }
      if (query) {
        const inTitle = document.title?.toLowerCase().includes(query)
        const inAsn =
          typeof document.archive_serial_number === "number" &&
          String(document.archive_serial_number).includes(query)
        if (!inTitle && !inAsn) return false
      }

      return true
    })
  }, [currentFilters, documents])

  const currentPage = Math.max(1, Number(searchParams?.get("page") || "1"))
  const currentPageSize = Math.max(1, Number(searchParams?.get("page_size") || "25"))
  const totalCount = filteredDocuments.length
  const pageCount = Math.max(1, Math.ceil(totalCount / currentPageSize))
  const pageStart = (currentPage - 1) * currentPageSize
  const pageData = filteredDocuments.slice(pageStart, pageStart + currentPageSize)

  const lookup = React.useMemo<LookupMaps>(
    () => ({
      correspondents: idx(correspondents),
      documentTypes: idx(documentTypes),
      storagePaths: idx(storagePaths),
      tags: idx(tags.map((tag) => ({ ...tag, color: String(tag.color) }))),
      users: idx(users),
      customFields: idx(customFields),
    }),
    [correspondents, customFields, documentTypes, storagePaths, tags, users],
  )

  React.useEffect(() => {
    const run = async () => {
      let token = ""
      try {
        token = window.sessionStorage.getItem("dataroom_session") || ""
      } catch {
        router.replace(`/dataroom/${slug}`)
        return
      }
      if (!token) {
        router.replace(`/dataroom/${slug}`)
        return
      }
      try {
        await postJson("/api/link-iq/dataroom-public/validate-session", { token, slug })
        const [
          documentsResult,
          correspondentsResult,
          documentTypesResult,
          tagsResult,
          storagePathsResult,
          usersResult,
          customFieldsResult,
        ] = await Promise.all([
          postJson<{ documents?: Document[] }>(
            // Dataroom-public list includes only released/rule-matched documents.
            "/api/link-iq/dataroom-public/documents",
            { token, slug, folder_id: selectedFolderID || undefined },
          ),
          getJson<Paginated<LookupItem>>("/api/management/lookups?kind=correspondents"),
          getJson<Paginated<LookupItem>>("/api/management/lookups?kind=document-types"),
          getJson<Paginated<RawTagOption>>("/api/management/lookups?kind=tags"),
          getJson<Paginated<LookupItem>>("/api/proxy/storage_paths/?page_size=100000"),
          getJson<Paginated<UserOption>>("/api/proxy/users/?page_size=100000"),
          getJson<Paginated<CustomFieldOption>>("/api/management/lookups?kind=custom-fields"),
        ])

        setDocuments((documentsResult.documents ?? []) as Document[])
        setCorrespondents(normalizePaginatedArray(correspondentsResult))
        setDocumentTypes(normalizePaginatedArray(documentTypesResult))
        setTags(
          normalizePaginatedArray(tagsResult).map((tag) => ({
            ...tag,
            color: tag.color ?? "gray",
          })),
        )
        setStoragePaths(normalizePaginatedArray(storagePathsResult))
        setUsers(normalizePaginatedArray(usersResult))
        setCustomFields(normalizePaginatedArray(customFieldsResult))
        setStatus("")
      } catch {
        try {
          window.sessionStorage.removeItem("dataroom_session")
        } catch {
          // Ignore storage errors in restricted contexts.
        }
        router.replace(`/dataroom/${slug}`)
      }
    }
    void run()
  }, [router, selectedFolderID, slug])

  return (
    <section className="flex min-w-0 flex-1">
      {status ? (
        <div className="p-4 text-sm text-muted-foreground">{status}</div>
      ) : (
        <DocumentsWorkspace
          correspondents={correspondents}
          currentFilters={currentFilters}
          currentPage={Math.min(currentPage, pageCount)}
          currentPageSize={currentPageSize}
          customFields={customFields}
          data={pageData}
          documentTypes={documentTypes}
          groupsList={[]}
          lookup={lookup}
          pageCount={pageCount}
          savedViews={[]}
          storagePaths={storagePaths}
          tags={tags}
          totalCount={totalCount}
          users={users}
          currentUserId={null}
          initialDisplayMode={null}
          initialTableLayouts={null}
          basePath={`/dataroom/${slug}/view`}
        />
      )}
    </section>
  )
}
