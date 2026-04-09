"use client"

import * as React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import {
  activeVersionIdAtom,
  pdfViewerPageCountAtom,
  pdfViewerPasswordAtom,
  pdfViewerRequiresPasswordAtom,
  pdfViewerRegistryAtom,
} from "@/lib/store"

interface PdfViewerProps {
  documentId: string | number
  totalPages?: number
}

export function PdfViewer({ documentId, totalPages = 1 }: PdfViewerProps) {
  const activeVersionId = useAtomValue(activeVersionIdAtom)
  const setActiveVersionId = useSetAtom(activeVersionIdAtom)
  const setPdfPageCount = useSetAtom(pdfViewerPageCountAtom)
  const setPdfPassword = useSetAtom(pdfViewerPasswordAtom)
  const setPdfRequiresPassword = useSetAtom(pdfViewerRequiresPasswordAtom)
  const setPdfViewerRegistry = useSetAtom(pdfViewerRegistryAtom)

  const sourceUrl = React.useMemo(() => {
    const params = new URLSearchParams()
    if (activeVersionId != null) {
      params.set("version", String(activeVersionId))
    }
    const query = params.toString()
    return `/api/proxy/documents/${documentId}/preview${query ? `?${query}` : ""}`
  }, [activeVersionId, documentId])

  React.useEffect(() => {
    setActiveVersionId(null)
  }, [documentId, setActiveVersionId])

  React.useEffect(() => {
    setPdfPageCount(totalPages)
    setPdfPassword("")
    setPdfRequiresPassword(false)
    setPdfViewerRegistry(null)

    return () => {
      setPdfPassword("")
      setPdfRequiresPassword(false)
      setPdfViewerRegistry(null)
    }
  }, [
    setPdfPageCount,
    setPdfPassword,
    setPdfRequiresPassword,
    setPdfViewerRegistry,
    totalPages,
  ])

  return (
    <div className="h-full w-full overflow-hidden bg-background">
      <iframe
        src={sourceUrl}
        title={`Document preview ${documentId}`}
        className="h-full w-full border-0"
      />
    </div>
  )
}
