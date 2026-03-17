"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { OpenDocumentLink } from "@/components/open-document-link"
import { ExternalLink, Loader2 } from "lucide-react"

interface DocumentPreviewDialogProps {
  documentId: number | null
  documentTitle?: string
  onClose: () => void
}

export function DocumentPreviewDialog({
  documentId,
  documentTitle,
  onClose,
}: DocumentPreviewDialogProps) {
  const [loaded, setLoaded] = React.useState(false)

  // Reset loaded state whenever a new document is previewed
  React.useEffect(() => {
    setLoaded(false)
  }, [documentId])

  return (
    <Dialog open={documentId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-sm font-medium truncate">
              {documentTitle || `Document #${documentId}`}
            </DialogTitle>
            {documentId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 flex-shrink-0 text-xs"
                asChild
              >
                <OpenDocumentLink
                  documentId={documentId}
                  title={documentTitle || `Document #${documentId}`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </OpenDocumentLink>
              </Button>
            )}
          </div>
        </DialogHeader>

        {documentId && (
          <div className="relative flex-1">
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <iframe
              key={documentId}
              src={`/api/proxy/documents/${documentId}/preview/?toolbar=0`}
              className="w-full h-full"
              title="Document preview"
              onLoad={() => setLoaded(true)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
