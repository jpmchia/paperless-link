export type SelectionDataItem = {
  id: number
  document_count: number
}

export type SelectionData = {
  selected_tags: SelectionDataItem[]
  selected_custom_fields: SelectionDataItem[]
  selected_correspondents: SelectionDataItem[]
  selected_document_types: SelectionDataItem[]
  selected_storage_paths: SelectionDataItem[]
}

export type TriState = "selected" | "partial" | "unselected"

export type SingleValueFieldState = {
  state: TriState
  value: number | null
}

const EMPTY_SELECTION_DATA: SelectionData = {
  selected_correspondents: [],
  selected_custom_fields: [],
  selected_document_types: [],
  selected_storage_paths: [],
  selected_tags: [],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function normalizeSelectionDataItems(value: unknown): SelectionDataItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return []
    }

    const id = item.id
    const documentCount = item.document_count
    if (
      typeof id !== "number" ||
      !Number.isInteger(id) ||
      typeof documentCount !== "number"
    ) {
      return []
    }

    return [{ id, document_count: documentCount }]
  })
}

function uniqueIds(ids: number[]) {
  return [...new Set(ids.filter((id) => Number.isInteger(id)))]
}

export function normalizeSelectionData(value: unknown): SelectionData {
  if (!isRecord(value)) {
    return EMPTY_SELECTION_DATA
  }

  return {
    selected_correspondents: normalizeSelectionDataItems(value.selected_correspondents),
    selected_custom_fields: normalizeSelectionDataItems(value.selected_custom_fields),
    selected_document_types: normalizeSelectionDataItems(value.selected_document_types),
    selected_storage_paths: normalizeSelectionDataItems(value.selected_storage_paths),
    selected_tags: normalizeSelectionDataItems(value.selected_tags),
  }
}

export function itemState(
  item: SelectionDataItem | null | undefined,
  selectedCount: number
): TriState {
  if (!item || item.document_count <= 0 || selectedCount <= 0) {
    return "unselected"
  }

  if (item.document_count >= selectedCount) {
    return "selected"
  }

  return "partial"
}

export function buildToggleMap(
  items: SelectionDataItem[],
  selectedCount: number
): Record<number, TriState> {
  const stateById: Record<number, TriState> = {}

  for (const item of items) {
    stateById[item.id] = itemState(item, selectedCount)
  }

  return stateById
}

export function computeItemsDelta(
  initialSelectedIds: number[],
  nextSelectedIds: number[]
): {
  itemsToAdd: number[]
  itemsToRemove: number[]
} {
  const initialIds = uniqueIds(initialSelectedIds)
  const nextIds = uniqueIds(nextSelectedIds)
  const initialSet = new Set(initialIds)
  const nextSet = new Set(nextIds)

  return {
    itemsToAdd: nextIds.filter((id) => !initialSet.has(id)),
    itemsToRemove: initialIds.filter((id) => !nextSet.has(id)),
  }
}

export function getUnanimousSingleValueId(
  items: SelectionDataItem[],
  selectedCount: number
): number | null {
  if (selectedCount <= 0) {
    return null
  }

  const unanimousItems = items.filter(
    (item) => itemState(item, selectedCount) === "selected"
  )

  return unanimousItems.length === 1 ? unanimousItems[0]?.id ?? null : null
}

export function getSingleValueFieldState(
  items: SelectionDataItem[],
  selectedCount: number
): SingleValueFieldState {
  const unanimousId = getUnanimousSingleValueId(items, selectedCount)
  if (unanimousId != null) {
    return {
      state: "selected",
      value: unanimousId,
    }
  }

  const hasPartialValue = items.some(
    (item) => itemState(item, selectedCount) !== "unselected"
  )
  if (hasPartialValue) {
    return {
      state: "partial",
      value: null,
    }
  }

  return {
    state: "unselected",
    value: null,
  }
}
