"use client"

import * as React from "react"
import { useSetAtom } from "jotai"
import { openDocumentAtom } from "@/lib/stores/open-documents"

export function OpenDocumentTracker({
  documentId,
  href,
  title,
}: {
  documentId: number
  href: string
  title: string
}) {
  const openDocument = useSetAtom(openDocumentAtom)

  React.useEffect(() => {
    openDocument({
      href,
      id: documentId,
      title: title || `Document ${documentId}`,
    })
  }, [documentId, href, openDocument, title])

  return null
}
