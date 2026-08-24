import {
  serializeDocumentFilters,
  type FilterParams,
  type NormalizedDocumentFilters,
} from "@/lib/api"

export type DocumentSelection =
  | {
      type: "explicit"
      documentIds: number[]
    }
  | {
      type: "all-filtered"
      filters: NormalizedDocumentFilters
      excludedDocumentIds: number[]
    }

export type SerializedDocumentSelection =
  | { documents: number[] }
  | { all: true; filters: NormalizedDocumentFilters }

function uniqueIds(ids: number[]) {
  return [...new Set(ids.filter((id) => Number.isInteger(id)))]
}

export function createExplicitDocumentSelection(documentIds: number[] = []): DocumentSelection {
  return {
    type: "explicit",
    documentIds: uniqueIds(documentIds),
  }
}

export function createAllFilteredDocumentSelection(
  filters: FilterParams | NormalizedDocumentFilters,
  excludedDocumentIds: number[] = []
): DocumentSelection {
  return {
    type: "all-filtered",
    filters: "query" in filters || "ordering" in filters || "tagsAny" in filters
      ? serializeDocumentFilters(filters as FilterParams)
      : { ...(filters as NormalizedDocumentFilters) },
    excludedDocumentIds: uniqueIds(excludedDocumentIds),
  }
}

export function serializeDocumentSelection(
  selection: DocumentSelection
): SerializedDocumentSelection {
  if (selection.type === "all-filtered") {
    return {
      all: true,
      filters: selection.filters,
    }
  }

  return {
    documents: uniqueIds(selection.documentIds),
  }
}

export function getDocumentSelectionExcludedIds(selection: DocumentSelection): number[] {
  return selection.type === "all-filtered" ? selection.excludedDocumentIds : []
}

export function getDocumentSelectionCount(
  selection: DocumentSelection,
  totalResultsCount: number
) {
  if (selection.type === "all-filtered") {
    return Math.max(totalResultsCount - selection.excludedDocumentIds.length, 0)
  }

  return selection.documentIds.length
}

export function isDocumentSelected(selection: DocumentSelection, documentId: number) {
  if (selection.type === "all-filtered") {
    return !selection.excludedDocumentIds.includes(documentId)
  }

  return selection.documentIds.includes(documentId)
}

export function toggleDocumentSelection(
  selection: DocumentSelection,
  documentId: number
): DocumentSelection {
  if (selection.type === "all-filtered") {
    return selection.excludedDocumentIds.includes(documentId)
      ? {
          ...selection,
          excludedDocumentIds: selection.excludedDocumentIds.filter((id) => id !== documentId),
        }
      : {
          ...selection,
          excludedDocumentIds: [...selection.excludedDocumentIds, documentId],
        }
  }

  return selection.documentIds.includes(documentId)
    ? createExplicitDocumentSelection(selection.documentIds.filter((id) => id !== documentId))
    : createExplicitDocumentSelection([...selection.documentIds, documentId])
}

export function setExplicitSelectionIds(
  selection: DocumentSelection,
  nextDocumentIds: number[]
): DocumentSelection {
  if (selection.type === "all-filtered") {
    return selection
  }

  return createExplicitDocumentSelection(nextDocumentIds)
}

export function areAllPageDocumentsSelected(
  selection: DocumentSelection,
  pageDocumentIds: number[]
) {
  return pageDocumentIds.length > 0 && pageDocumentIds.every((documentId) => isDocumentSelected(selection, documentId))
}

export function areSomePageDocumentsSelected(
  selection: DocumentSelection,
  pageDocumentIds: number[]
) {
  return pageDocumentIds.some((documentId) => isDocumentSelected(selection, documentId))
}
