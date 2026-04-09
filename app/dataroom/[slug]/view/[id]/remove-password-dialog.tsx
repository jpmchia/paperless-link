"use client"

import * as React from "react"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/draggable-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface RemovePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (options: {
    updateDocument: boolean
    deleteOriginal: boolean
    includeMetadata: boolean
  }) => void | Promise<void>
  busy?: boolean
}

export function RemovePasswordDialog({
  open,
  onOpenChange,
  onConfirm,
  busy = false,
}: RemovePasswordDialogProps) {
  const [updateDocument, setUpdateDocument] = React.useState(true)
  const [deleteOriginal, setDeleteOriginal] = React.useState(false)
  const [includeMetadata, setIncludeMetadata] = React.useState(true)

  React.useEffect(() => {
    if (!open) return
    setUpdateDocument(true)
    setDeleteOriginal(false)
    setIncludeMetadata(true)
  }, [open])

  React.useEffect(() => {
    if (updateDocument) {
      setDeleteOriginal(false)
    }
  }, [updateDocument])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent initialWidth={540} initialHeight={420}>
        <DialogHeader>
          <DialogTitle>Remove password protection</DialogTitle>
          <DialogDescription>
            Replace the existing file or create an unprotected copy.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Destination</Label>
            <div className="grid gap-2">
              <button
                type="button"
                className={`rounded-md border px-3 py-3 text-left text-sm transition ${
                  updateDocument
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:bg-accent/40"
                }`}
                onClick={() => setUpdateDocument(true)}
              >
                <div className="font-medium">Replace current document</div>
                <div className="text-xs text-muted-foreground">
                  The unprotected PDF becomes the current document file.
                </div>
              </button>
              <button
                type="button"
                className={`rounded-md border px-3 py-3 text-left text-sm transition ${
                  !updateDocument
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:bg-accent/40"
                }`}
                onClick={() => setUpdateDocument(false)}
              >
                <div className="font-medium">Create unprotected copy</div>
                <div className="text-xs text-muted-foreground">
                  Keep the current document and create a new unprotected PDF in the background.
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-md border p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="include-metadata"
                checked={includeMetadata}
                onCheckedChange={(checked) => setIncludeMetadata(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="include-metadata" className="text-sm font-medium">
                  Include metadata
                </Label>
                <p className="text-xs text-muted-foreground">
                  Copy metadata to the created document when making an unprotected copy.
                </p>
              </div>
            </div>

            {!updateDocument && (
              <div className="flex items-start gap-3">
                <Checkbox
                  id="delete-original"
                  checked={deleteOriginal}
                  onCheckedChange={(checked) => setDeleteOriginal(checked === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor="delete-original" className="text-sm font-medium">
                    Delete original after copy
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Remove the password-protected source after the unprotected copy is created.
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              void onConfirm({
                updateDocument,
                deleteOriginal,
                includeMetadata,
              })
            }
            disabled={busy}
          >
            {busy ? "Starting…" : "Start"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
