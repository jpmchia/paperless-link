"use client"

import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import {
  normalizeOpenDocuments,
  OPEN_DOCUMENTS_STORAGE_KEY,
  removeOpenDocument,
  type OpenDocumentItem,
  upsertOpenDocument,
} from "@/lib/open-documents"

const rawOpenDocumentsAtom = atomWithStorage<OpenDocumentItem[]>(
  OPEN_DOCUMENTS_STORAGE_KEY,
  []
)

export const openDocumentsAtom = atom(
  (get) => normalizeOpenDocuments(get(rawOpenDocumentsAtom)),
  (_get, set, nextDocuments: OpenDocumentItem[]) => {
    set(rawOpenDocumentsAtom, normalizeOpenDocuments(nextDocuments))
  }
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
