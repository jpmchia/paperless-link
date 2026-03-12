"use client"

import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export const documentListState = atom<number[]>([])

// Atom to track which custom fields are visible globally in the UI
export const visibleCustomFieldsAtom = atomWithStorage<number[]>('paperless-visible-custom-fields', [])

// Alternatively, we could just store the list of IDs and their current query context
// For simple Next/Prev, just the array of IDs in the current view is enough
