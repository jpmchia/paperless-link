"use client"

import * as React from "react"
import { useSetAtom } from "jotai"
import { useRouter } from "next/navigation"
import { openDocumentAtom } from "@/lib/stores/open-documents"

export function useOpenDocumentNavigation() {
  const router = useRouter()
  const openDocument = useSetAtom(openDocumentAtom)

  return React.useCallback(
    ({
      documentId,
      href,
      title,
    }: {
      documentId: number
      href?: string
      title: string
    }) => {
      const targetHref = href ?? `/documents/${documentId}`
      openDocument({
        href: targetHref,
        id: documentId,
        title: title || `Document ${documentId}`,
      })
      router.push(targetHref)
    },
    [openDocument, router]
  )
}
