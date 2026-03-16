"use client"

import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { FilterParams } from './api'

export const documentListState = atom<number[]>([])

// Version ID currently being previewed in the PDF viewer (null = latest)
export const activeVersionIdAtom = atom<number | null>(null)

// Which custom fields are globally visible in the details form
export const visibleCustomFieldsAtom = atomWithStorage<number[]>('paperless-visible-custom-fields', [])

// Active document list filters — persisted in localStorage
export const filterParamsAtom = atomWithStorage<FilterParams>('paperless-filter-params', {})

// Derived atom: count of active filters (for badge display)
export const activeFilterCountAtom = atom((get) => {
  const f = get(filterParamsAtom)
  let count = 0
  if (f.query) count++
  if (f.correspondent) count++
  if (f.documentType) count++
  if (f.storagePath) count++
  if (f.tags && f.tags.length > 0) count += f.tags.length
  if (f.tagsExclude && f.tagsExclude.length > 0) count += f.tagsExclude.length
  if (f.tagsAny && f.tagsAny.length > 0) count += f.tagsAny.length
  if (f.createdAfter) count++
  if (f.createdBefore) count++
  if (f.addedAfter) count++
  if (f.addedBefore) count++
  if (f.hasTag != null) count++
  return count
})
