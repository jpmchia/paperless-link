"use client"

import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import {
  OPEN_DOCUMENTS_STORAGE_KEY,
  removeOpenDocument,
  type OpenDocumentItem,
  upsertOpenDocument,
} from "@/lib/open-documents"

export const openDocumentsAtom = atomWithStorage<OpenDocumentItem[]>(
  OPEN_DOCUMENTS_STORAGE_KEY,
  []
)

export const openDocumentAtom = atom(
  null,
  (get, set, nextDocument: Omit<OpenDocumentItem, "lastOpenedAt">) => {
    set(openDocumentsAtom, upsertOpenDocument(get(openDocumentsAtom), nextDocument))
  }
)

export const closeOpenDocumentAtom = atom(
  null,
  (get, set, documentId: number) => {
    set(openDocumentsAtom, removeOpenDocument(get(openDocumentsAtom), documentId))
  }
)

export const closeAllOpenDocumentsAtom = atom(null, (_get, set) => {
  set(openDocumentsAtom, [])
})
