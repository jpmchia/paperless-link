"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { OpenDocumentLink } from "@/components/open-document-link"
import { ChevronLeft, ChevronRight, ExternalLink, Loader2 } from "lucide-react"

type PreviewDocument = {
  id: number
  title?: string
}

interface DocumentPreviewDialogProps {
  documentId: number | null
  documentTitle?: string
  documents?: PreviewDocument[]
  onClose: () => void
  onDocumentChange?: (document: PreviewDocument) => void
}

export function DocumentPreviewDialog({
  documentId,
  documentTitle,
  documents = [],
  onClose,
  onDocumentChange,
}: DocumentPreviewDialogProps) {
  const [loaded, setLoaded] = React.useState(false)

  const activeIndex = React.useMemo(
    () => documents.findIndex((document) => document.id === documentId),
    [documentId, documents]
  )
  const previousDocument = activeIndex > 0 ? documents[activeIndex - 1] : null
  const nextDocument =
    activeIndex >= 0 && activeIndex < documents.length - 1
      ? documents[activeIndex + 1]
      : null

  // Reset loaded state whenever a new document is previewed
  React.useEffect(() => {
    setLoaded(false)
  }, [documentId])

  return (
      <Dialog open={documentId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <DialogDescription className="sr-only">
            Preview the current document and move through documents in the active list.
          </DialogDescription>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-sm font-medium truncate">
                {documentTitle || `Document #${documentId}`}
              </DialogTitle>
              {documents.length > 1 && activeIndex >= 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {activeIndex + 1} of {documents.length}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onDocumentChange && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={!previousDocument}
                    onClick={() => previousDocument && onDocumentChange(previousDocument)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={!nextDocument}
                    onClick={() => nextDocument && onDocumentChange(nextDocument)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
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
              src={`/api/proxy/documents/${documentId}/preview?toolbar=0`}
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
