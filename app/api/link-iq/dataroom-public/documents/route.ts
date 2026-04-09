import { NextResponse } from "next/server"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { DataroomDocumentPlacement, DataroomFolder, DataroomReleaseItem } from "@/lib/link-iq-types"
import { getPaperlessBaseUrl, resolvePaperlessToken, validateDataroomSession } from "./_shared"

type DocumentsInput = {
  token?: string
  slug?: string
  folder_id?: string
}

type PaperlessDocument = {
  id: number
  title?: string
  created?: string
  added?: string
  modified?: string
  correspondent?: number | null
  document_type?: number | null
  storage_path?: number | null
  tags?: number[]
  page_count?: number | null
}

type PaperlessPaginated<T> = {
  count?: number
  next?: string | null
  previous?: string | null
  results?: T[]
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DocumentsInput
    if (!body.token?.trim() || !body.slug?.trim()) {
      return NextResponse.json({ error: "token and slug are required" }, { status: 400 })
    }
    const requestedFolderID = body.folder_id?.trim()
    const validatedRequest = new Request(request.url, {
      method: "GET",
      headers: request.headers,
    })
    const validatedURL = new URL(validatedRequest.url)
    validatedURL.searchParams.set("token", body.token.trim())
    validatedURL.searchParams.set("slug", body.slug.trim())
    const session = await validateDataroomSession(new Request(validatedURL.toString(), { method: "GET" }))
    const { dataroomID } = session

    const releaseItems = await invokeLinkIQAction<{ items?: DataroomReleaseItem[] }>({
      capability: "dataroom.release.items",
      resource_id: dataroomID,
      input: { dataroom_id: dataroomID, status: "published" },
    })

    const filteredReleaseItems = (releaseItems.items ?? []).filter((item) => {
      if (!requestedFolderID) return true
      return (item.folder_id ?? "").trim() === requestedFolderID
    })

    const releaseDocumentIDs = filteredReleaseItems
      .map((item) => Number(item.document_id))
      .filter(Number.isFinite)

    // Fallback: include explicit placements when release items are absent or incomplete.
    // This keeps folder views usable while release workflows are still being configured.
    const placementResult = await invokeLinkIQAction<{ placements?: DataroomDocumentPlacement[] }>({
      capability: "dataroom.document.list",
      resource_id: dataroomID,
      input: { dataroom_id: dataroomID },
    })
    const placementDocumentIDs = (placementResult.placements ?? [])
      .filter((placement) => {
        if (!requestedFolderID) return true
        return (placement.folder_id ?? "").trim() === requestedFolderID
      })
      .map((placement) => Number(placement.document_id))
      .filter(Number.isFinite)

    const paperlessToken = resolvePaperlessToken(session)
    if (!paperlessToken) {
      return NextResponse.json(
        { error: "No Paperless token configured for this dataroom" },
        { status: 500 },
      )
    }

    const baseUrl = getPaperlessBaseUrl()
    const documentIDs = Array.from(new Set([...releaseDocumentIDs, ...placementDocumentIDs]))

    // Rule-based fallback for notional folders:
    // derive paperless query from folder definition when release/placement IDs are empty.
    if (documentIDs.length === 0 && requestedFolderID) {
      const foldersResult = await invokeLinkIQAction<{ folders?: DataroomFolder[] }>({
        capability: "dataroom.folder.list",
        resource_id: dataroomID,
        input: { dataroom_id: dataroomID },
      })
      const targetFolder = (foldersResult.folders ?? []).find(
        (folder) => folder.folder_id?.trim() === requestedFolderID,
      )

      if (targetFolder?.linked_item_type && targetFolder.linked_item_id) {
        const linkedID = String(targetFolder.linked_item_id).trim()
        const linkedIDNumber = Number(linkedID)
        const isLinkedNumeric = Number.isFinite(linkedIDNumber)
        const linkedLabel = (targetFolder.linked_item_label || "").trim().toLowerCase()
        const ruleQuerySupported =
          targetFolder.linked_item_type === "correspondent" ||
          targetFolder.linked_item_type === "document_type"

        if (ruleQuerySupported && isLinkedNumeric) {
          // Deterministic folder-rule query:
          // load pages and filter by document metadata field value so rule behavior
          // matches folder JSON definitions regardless of backend query param drift.
          const maxPages = 40
          const allDocuments: PaperlessDocument[] = []
          let page = 1
          let totalCount = Number.POSITIVE_INFINITY

          while (page <= maxPages && allDocuments.length < totalCount) {
            const response = await fetch(`${baseUrl}api/documents/?page_size=500&page=${page}`, {
              headers: {
                Authorization: `Token ${paperlessToken}`,
                Accept: "application/json; version=2",
              },
              cache: "no-store",
            })
            if (!response.ok) break

            const payload = (await response.json()) as PaperlessPaginated<PaperlessDocument>
            const pageResults = Array.isArray(payload.results) ? payload.results : []
            if (pageResults.length === 0) break
            allDocuments.push(...pageResults)

            totalCount =
              typeof payload.count === "number" && Number.isFinite(payload.count)
                ? payload.count
                : allDocuments.length
            if (!payload.next || allDocuments.length >= totalCount) break
            page += 1
          }

          const candidateIDs = new Set<number>([linkedIDNumber])

          // Resolve runtime IDs by linked label (guards against stale linked_item_id values).
          if (linkedLabel) {
            const lookupPath =
              targetFolder.linked_item_type === "correspondent"
                ? "correspondents"
                : "document_types"
            const lookupResponse = await fetch(`${baseUrl}api/${lookupPath}/?page_size=100000`, {
              headers: {
                Authorization: `Token ${paperlessToken}`,
                Accept: "application/json; version=2",
              },
              cache: "no-store",
            })
            if (lookupResponse.ok) {
              const lookupPayload = (await lookupResponse.json()) as PaperlessPaginated<{
                id?: number
                name?: string
              }>
              const lookupRows = Array.isArray(lookupPayload.results) ? lookupPayload.results : []
              lookupRows.forEach((row) => {
                if (typeof row.id !== "number") return
                if ((row.name || "").trim().toLowerCase() === linkedLabel) {
                  candidateIDs.add(row.id)
                }
              })
            }
          }

          const queriedDocuments = allDocuments.filter((document) => {
            if (targetFolder.linked_item_type === "correspondent") {
              return candidateIDs.has(Number(document.correspondent ?? NaN))
            }
            if (targetFolder.linked_item_type === "document_type") {
              return candidateIDs.has(Number(document.document_type ?? NaN))
            }
            return false
          })

          return NextResponse.json({
            documents: queriedDocuments.sort((left, right) =>
              (left.title || "").localeCompare(right.title || ""),
            ),
            folder_id: requestedFolderID,
            source: "folder-rule-query",
          })
        }
      }
    }

    if (documentIDs.length === 0) {
      return NextResponse.json({ documents: [], folder_id: requestedFolderID || null, source: "none" })
    }

    const documents = (
      await Promise.all(
        documentIDs.map(async (id) => {
          const response = await fetch(`${baseUrl}api/documents/${id}/`, {
            headers: {
              Authorization: `Token ${paperlessToken}`,
              Accept: "application/json; version=2",
            },
            cache: "no-store",
          })
          if (!response.ok) return null
          return (await response.json()) as PaperlessDocument
        }),
      )
    ).filter((item): item is PaperlessDocument => Boolean(item))

    return NextResponse.json({
      documents: documents.sort((left, right) => (left.title || "").localeCompare(right.title || "")),
      folder_id: requestedFolderID || null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dataroom documents" },
      { status: 500 },
    )
  }
}

