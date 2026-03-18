"use client"

import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { FilterParams } from './api'
import type { DocumentSection } from '@/app/documents/[id]/document-sections'

export const documentListState = atom<number[]>([])

export const documentDetailsDirtyAtom = atom(false)

export const documentSectionAtom = atom<DocumentSection | null>(null)

export const documentDetailFieldLayoutAtom = atom<string[]>([])
export const documentDetailAvailableFieldsAtom = atom<Array<{ id: string; label: string }>>([])
export const documentDetailFieldLayoutRevisionAtom = atom(0)

// Version ID currently being previewed in the PDF viewer (null = latest)
export const activeVersionIdAtom = atom<number | null>(null)
export const pdfViewerPasswordAtom = atom("")
export const pdfViewerRequiresPasswordAtom = atom(false)
export const pdfViewerPageCountAtom = atom(1)

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
  if (f.owner != null) count++
  if (f.ownerAny && f.ownerAny.length > 0) count += f.ownerAny.length
  if (f.ownerExclude && f.ownerExclude.length > 0) count += f.ownerExclude.length
  if (f.ownerIsNull != null) count++
  if (f.sharedByUser != null) count++
  return count
})
