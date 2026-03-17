import type { FilterParams } from "@/lib/api"
import { filterParamsFromSavedView } from "@/lib/api"
import {
  DEFAULT_DOCUMENT_DISPLAY_MODE,
  type DocumentDisplayMode,
  normalizeDocumentDisplayMode,
} from "./display-mode"

type SavedViewRule = {
  rule_type: number
  value: string
}

type ComparableSavedViewState = {
  filterRules: SavedViewRule[]
  sortField: string
  sortReverse: boolean
  displayMode: DocumentDisplayMode
}

type SavedViewLike = {
  filter_rules?: Array<{ rule_type?: number; value?: string | number | boolean | null }>
  sort_field?: string | null
  sort_reverse?: boolean | null
  display_mode?: string | null
}

export const DEFAULT_SAVED_VIEW_ORDERING = "-created"

function sortRules(rules: SavedViewRule[]) {
  return [...rules].sort((left, right) => {
    if (left.rule_type !== right.rule_type) {
      return left.rule_type - right.rule_type
    }

    return left.value.localeCompare(right.value)
  })
}

export function filterParamsToSavedViewRules(filters: FilterParams): SavedViewRule[] {
  const rules: SavedViewRule[] = []

  if (filters.query) rules.push({ rule_type: 20, value: filters.query })
  if (filters.titleContains) rules.push({ rule_type: 0, value: filters.titleContains })
  if (filters.correspondent != null) rules.push({ rule_type: 3, value: String(filters.correspondent) })
  if (filters.documentType != null) rules.push({ rule_type: 4, value: String(filters.documentType) })
  if (filters.storagePath != null) rules.push({ rule_type: 25, value: String(filters.storagePath) })
  ;(filters.tags || []).forEach((id) => rules.push({ rule_type: 6, value: String(id) }))
  ;(filters.tagsAny || []).forEach((id) => rules.push({ rule_type: 22, value: String(id) }))
  ;(filters.tagsExclude || []).forEach((id) => rules.push({ rule_type: 17, value: String(id) }))
  if (filters.createdAfter) rules.push({ rule_type: 9, value: filters.createdAfter })
  if (filters.createdBefore) rules.push({ rule_type: 8, value: filters.createdBefore })
  if (filters.addedAfter) rules.push({ rule_type: 14, value: filters.addedAfter })
  if (filters.addedBefore) rules.push({ rule_type: 13, value: filters.addedBefore })
  if (filters.isInInbox) rules.push({ rule_type: 5, value: "true" })
  ;(filters.correspondentAny || []).forEach((id) => rules.push({ rule_type: 26, value: String(id) }))
  ;(filters.correspondentNone || []).forEach((id) => rules.push({ rule_type: 27, value: String(id) }))
  ;(filters.documentTypeAny || []).forEach((id) => rules.push({ rule_type: 28, value: String(id) }))
  ;(filters.documentTypeNone || []).forEach((id) => rules.push({ rule_type: 29, value: String(id) }))
  if (filters.owner != null) rules.push({ rule_type: 32, value: String(filters.owner) })
  ;(filters.ownerAny || []).forEach((id) => rules.push({ rule_type: 33, value: String(id) }))
  if (filters.ownerIsNull != null) rules.push({ rule_type: 34, value: String(filters.ownerIsNull) })
  ;(filters.ownerExclude || []).forEach((id) => rules.push({ rule_type: 35, value: String(id) }))
  if (filters.sharedByUser != null) rules.push({ rule_type: 37, value: String(filters.sharedByUser) })

  return sortRules(rules)
}

export function orderingToSavedViewSort(ordering?: string | null) {
  const effectiveOrdering = ordering || DEFAULT_SAVED_VIEW_ORDERING

  if (effectiveOrdering.startsWith("-")) {
    return {
      sortField: effectiveOrdering.slice(1),
      sortReverse: true,
    }
  }

  return {
    sortField: effectiveOrdering,
    sortReverse: false,
  }
}

export function getComparableSavedViewStateFromFilters(
  filters: FilterParams,
  displayMode?: unknown
): ComparableSavedViewState {
  const sort = orderingToSavedViewSort(filters.ordering)

  return {
    filterRules: filterParamsToSavedViewRules(filters),
    sortField: sort.sortField,
    sortReverse: sort.sortReverse,
    displayMode:
      normalizeDocumentDisplayMode(displayMode) ?? DEFAULT_DOCUMENT_DISPLAY_MODE,
  }
}

export function getComparableSavedViewStateFromView(
  view: SavedViewLike | null | undefined
): ComparableSavedViewState | null {
  if (!view) return null

  const comparableFilters = filterParamsFromSavedView(view)
  return getComparableSavedViewStateFromFilters(
    comparableFilters,
    view.display_mode
  )
}

export function savedViewStatesEqual(
  left: ComparableSavedViewState | null | undefined,
  right: ComparableSavedViewState | null | undefined
) {
  if (!left || !right) return left === right

  return (
    left.sortField === right.sortField &&
    left.sortReverse === right.sortReverse &&
    left.displayMode === right.displayMode &&
    JSON.stringify(left.filterRules) === JSON.stringify(right.filterRules)
  )
}

export function isSavedViewDirty(
  filters: FilterParams,
  baseline: ComparableSavedViewState | null | undefined,
  displayMode?: unknown
) {
  if (!baseline) return false
  return !savedViewStatesEqual(
    getComparableSavedViewStateFromFilters(filters, displayMode),
    baseline
  )
}
