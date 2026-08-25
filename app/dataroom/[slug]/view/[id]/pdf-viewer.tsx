"use client"

import { PdfViewer as SharedPdfViewer } from "@/app/documents/[id]/pdf-viewer"

interface PdfViewerProps {
  documentId: string | number
  totalPages?: number
}

export function PdfViewer({ documentId, totalPages = 1 }: PdfViewerProps) {
  return <SharedPdfViewer documentId={documentId} totalPages={totalPages} />
}
