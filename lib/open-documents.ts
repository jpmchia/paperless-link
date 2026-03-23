export const OPEN_DOCUMENTS_STORAGE_KEY = "paperless-open-documents"
const MAX_OPEN_DOCUMENTS = 15

export interface OpenDocumentItem {
  href: string
  id: number
  lastOpenedAt: string
  title: string
}

export function upsertOpenDocument(
  documents: OpenDocumentItem[],
  nextDocument: Omit<OpenDocumentItem, "lastOpenedAt"> & {
    lastOpenedAt?: string
  }
) {
  const item: OpenDocumentItem = {
    ...nextDocument,
    lastOpenedAt: nextDocument.lastOpenedAt ?? new Date().toISOString(),
  }

  return [item, ...documents.filter((document) => document.id !== item.id)].slice(
    0,
    MAX_OPEN_DOCUMENTS
  )
}

export function normalizeOpenDocuments(documents: OpenDocumentItem[]) {
  const deduped = new Map<number, OpenDocumentItem>()

  for (const document of documents) {
    if (!deduped.has(document.id)) {
      deduped.set(document.id, document)
    }
  }

  return Array.from(deduped.values()).slice(0, MAX_OPEN_DOCUMENTS)
}

export function removeOpenDocument(
  documents: OpenDocumentItem[],
  documentId: number
) {
  return documents.filter((document) => document.id !== documentId)
}
