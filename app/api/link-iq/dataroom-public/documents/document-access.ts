import { invokeLinkIQAction } from "@/lib/link-iq"
import type { DataroomDocumentPlacement, DataroomFolder, DataroomReleaseItem } from "@/lib/link-iq-types"
import {
  getPaperlessBaseUrl,
  resolvePaperlessToken,
  type ValidatedSession,
} from "./_shared"

type PaperlessDocument = {
  id: number
  correspondent?: number | null
  document_type?: number | null
}

type PaperlessPaginated<T> = {
  count?: number
  next?: string | null
  results?: T[]
}

/**
 * Must match the allowlist used by POST …/dataroom-public/documents so preview/download/print
 * do not 403 on documents that are visible in the list (placements, release, or folder rules).
 */
export async function isDocumentAccessibleInDataroomViewer(params: {
  dataroomID: string
  documentID: number
  folderId?: string | null
  session: ValidatedSession
}): Promise<boolean> {
  const { dataroomID, documentID, folderId, session } = params
  const requestedFolderID = folderId?.trim() ?? ""

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

  const documentIDs = new Set([...releaseDocumentIDs, ...placementDocumentIDs])
  if (documentIDs.has(documentID)) return true

  const paperlessToken = resolvePaperlessToken(session)
  if (!paperlessToken) return false

  if (documentIDs.size === 0 && requestedFolderID) {
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
        const baseUrl = getPaperlessBaseUrl()
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

        if (linkedLabel) {
          const lookupPath =
            targetFolder.linked_item_type === "correspondent" ? "correspondents" : "document_types"
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

        const match = allDocuments.some((document) => {
          if (document.id !== documentID) return false
          if (targetFolder.linked_item_type === "correspondent") {
            return candidateIDs.has(Number(document.correspondent ?? NaN))
          }
          if (targetFolder.linked_item_type === "document_type") {
            return candidateIDs.has(Number(document.document_type ?? NaN))
          }
          return false
        })
        return match
      }
    }
  }

  return false
}
