"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { postJson } from "@/lib/paperless-client"
import { DocumentsWorkspace } from "@/app/dataroom/[slug]/view/workspace/documents-workspace"
import type { Document, LookupMaps } from "@/app/dataroom/[slug]/view/workspace/columns"
import type { FilterParams } from "@/lib/api"

type Props = {
  slug: string
}

export function DataroomViewerSurface({ slug }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = React.useState("Loading dataroom...")
  const [documents, setDocuments] = React.useState<Document[]>([])

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
      correspondents: {},
      documentTypes: {},
      storagePaths: {},
      tags: {},
      users: {},
      customFields: {},
    }),
    []
  )

  React.useEffect(() => {
    const run = async () => {
      const token = window.sessionStorage.getItem("dataroom_session")
      if (!token) {
        router.replace(`/dataroom/${slug}`)
        return
      }
      try {
        await postJson("/api/link-iq/dataroom-public/validate-session", { token, slug })
        const documentsResult = await postJson<{ documents?: Document[] }>(
          // Dataroom-public list includes only released documents.
          "/api/link-iq/dataroom-public/documents",
          { token, slug },
        )
        setDocuments((documentsResult.documents ?? []) as Document[])
        setStatus("")
      } catch {
        window.sessionStorage.removeItem("dataroom_session")
        router.replace(`/dataroom/${slug}`)
      }
    }
    void run()
  }, [router, slug])

  return (
    <section className="flex min-w-0 flex-1">
      {status ? (
        <div className="p-4 text-sm text-muted-foreground">{status}</div>
      ) : (
        <DocumentsWorkspace
          correspondents={[]}
          currentFilters={currentFilters}
          currentPage={Math.min(currentPage, pageCount)}
          currentPageSize={currentPageSize}
          customFields={[]}
          data={pageData}
          documentTypes={[]}
          groupsList={[]}
          lookup={lookup}
          pageCount={pageCount}
          savedViews={[]}
          storagePaths={[]}
          tags={[]}
          totalCount={totalCount}
          users={[]}
          currentUserId={null}
          initialDisplayMode={null}
          initialTableLayouts={null}
          basePath={`/dataroom/${slug}/view`}
        />
      )}
    </section>
  )
}
