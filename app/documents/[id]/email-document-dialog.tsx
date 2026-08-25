"use client"

import { EmailDocumentsDialog } from "@/components/documents/email-documents-dialog"

interface EmailDocumentDialogProps {
  documentId: number
  documentTitle: string
  hasArchiveVersion: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  versionLabel?: string | null
}

export function EmailDocumentDialog({
  documentId,
  documentTitle,
  hasArchiveVersion,
  open,
  onOpenChange,
  versionLabel,
}: EmailDocumentDialogProps) {
  return (
    <EmailDocumentsDialog
      open={open}
      onOpenChange={onOpenChange}
      documentIds={[documentId]}
      documentLabel={documentTitle}
      hasArchiveVersion={hasArchiveVersion}
      versionLabel={versionLabel}
    />
  )
}
