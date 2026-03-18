"use client"

import * as React from "react"
import { activeVersionIdAtom } from "@/lib/store"
import { useAtomValue } from "jotai"
import { FilePlus2, Pencil, RotateCcw, RotateCw, Scissors } from "lucide-react"
import { postJson } from "@/lib/paperless-client"
import { useAsyncAction } from "@/hooks/use-async-action"
import {
  Dialog as DraggableDialog,
  DialogBody as DraggableDialogBody,
  DialogContent as DraggableDialogContent,
  DialogDescription as DraggableDialogDescription,
  DialogFooter as DraggableDialogFooter,
  DialogHeader as DraggableDialogHeader,
  DialogTitle as DraggableDialogTitle,
} from "@/components/draggable-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

type PdfEditMode = "update" | "create"

interface PdfToolsDialogProps {
  documentId: number
  documentTitle: string
  totalPages: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

function normalizeRotation(rotation: number) {
  return (rotation + 360) % 360
}

export function PdfToolsDialog({
  documentId,
  documentTitle,
  totalPages,
  open,
  onOpenChange,
}: PdfToolsDialogProps) {
  const activeVersionId = useAtomValue(activeVersionIdAtom)
  const [rotation, setRotation] = React.useState(90)
  const [mode, setMode] = React.useState<PdfEditMode>("update")
  const [includeMetadata, setIncludeMetadata] = React.useState(true)
  const [deleteOriginal, setDeleteOriginal] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setRotation(90)
      setMode("update")
      setIncludeMetadata(true)
      setDeleteOriginal(false)
    }
  }, [open])

  const { pending, run } = useAsyncAction({
    action: async () => {
      const sourceDocumentId = activeVersionId ?? documentId
      return postJson<unknown>("/api/proxy/documents/edit_pdf/", {
        documents: [sourceDocumentId],
        operations: Array.from({ length: totalPages }, (_, index) => ({
          page: index + 1,
          rotate: normalizeRotation(rotation),
          doc: 0,
        })),
        update_document: mode === "update",
        include_metadata: mode === "create" ? includeMetadata : true,
        delete_original: mode === "create" ? deleteOriginal : false,
        source_mode: "explicit_selection",
      })
    },
    errorMessage: "Failed to start PDF operation",
    onSuccess: () => {
      onOpenChange(false)
    },
    successMessage: `PDF operation for "${documentTitle}" will begin in the background.`,
  })

  return (
    <DraggableDialog open={open} onOpenChange={onOpenChange}>
      <DraggableDialogContent initialWidth={760} initialHeight={520} maxWidth={980}>
        <DraggableDialogHeader>
          <DraggableDialogTitle className="flex items-center gap-2">
            <Scissors className="h-4 w-4" />
            PDF Tools
          </DraggableDialogTitle>
          <DraggableDialogDescription>
            Rotate all pages for <span className="font-medium text-foreground">{documentTitle}</span>.
          </DraggableDialogDescription>
        </DraggableDialogHeader>

        <DraggableDialogBody className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Rotate pages</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={rotation === -90 ? "default" : "outline"}
                onClick={() => setRotation(-90)}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                90° counter-clockwise
              </Button>
              <Button
                type="button"
                variant={rotation === 90 ? "default" : "outline"}
                onClick={() => setRotation(90)}
              >
                <RotateCw className="mr-2 h-4 w-4" />
                90° clockwise
              </Button>
              <Button
                type="button"
                variant={rotation === 180 ? "default" : "outline"}
                onClick={() => setRotation(180)}
              >
                180°
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This applies the same rotation to all {totalPages} page{totalPages === 1 ? "" : "s"}.
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Output</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={mode === "update" ? "default" : "outline"}
                onClick={() => setMode("update")}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Replace current document
              </Button>
              <Button
                type="button"
                variant={mode === "create" ? "default" : "outline"}
                onClick={() => setMode("create")}
              >
                <FilePlus2 className="mr-2 h-4 w-4" />
                Create new document
              </Button>
            </div>
          </div>

          {mode === "create" && (
            <div className="space-y-3 rounded-md border bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="pdf-copy-metadata"
                  checked={includeMetadata}
                  onCheckedChange={(checked) => setIncludeMetadata(checked === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor="pdf-copy-metadata" className="text-sm font-medium">
                    Copy metadata
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Copy document metadata to the new rotated document.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="pdf-delete-original"
                  checked={deleteOriginal}
                  onCheckedChange={(checked) => setDeleteOriginal(checked === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor="pdf-delete-original" className="text-sm font-medium">
                    Delete original
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Delete the original document after the new rotated document is created.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeVersionId != null && (
            <p className="text-xs text-muted-foreground">
              The operation will use the currently previewed version.
            </p>
          )}
        </DraggableDialogBody>

        <DraggableDialogFooter className="items-center justify-between gap-2 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            This operation runs in the background on the Paperless backend.
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={pending || totalPages < 1} onClick={() => void run()}>
              {pending ? "Starting..." : "Start"}
            </Button>
          </div>
        </DraggableDialogFooter>
      </DraggableDialogContent>
    </DraggableDialog>
  )
}
