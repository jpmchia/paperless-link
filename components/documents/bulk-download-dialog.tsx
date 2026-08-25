"use client"

import * as React from "react"
import { Download } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  buildBulkDownloadPayload,
  downloadBulkDocuments,
} from "@/lib/bulk-download"
import type { DocumentSelection } from "@/lib/document-selection"

export function BulkDownloadDialog({
  open,
  onOpenChange,
  selection,
  selectedCount,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selection: DocumentSelection
  selectedCount: number
}) {
  const [includeArchive, setIncludeArchive] = React.useState(true)
  const [includeOriginals, setIncludeOriginals] = React.useState(true)
  const [followFormatting, setFollowFormatting] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      return
    }

    setIncludeArchive(true)
    setIncludeOriginals(true)
    setFollowFormatting(false)
    setPending(false)
    setErrorMessage(null)
  }, [open])

  const selectionLabel = selectedCount === 1
    ? "1 selected document"
    : `${selectedCount.toLocaleString()} selected documents`

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    let payload
    try {
      payload = buildBulkDownloadPayload(selection, {
        archive: includeArchive,
        originals: includeOriginals,
        followFormatting,
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not prepare the download."
      )
      return
    }

    setPending(true)
    try {
      await downloadBulkDocuments(payload)
      toast.success("Download started")
      onOpenChange(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown download error"
      setErrorMessage(message)
      toast.error("Download failed", {
        description: message,
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Download documents</DialogTitle>
          <DialogDescription>
            Download {selectionLabel} as a ZIP file.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Include files</p>
              <div className="space-y-3 rounded-md border bg-muted/20 px-3 py-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="bulk-download-archive"
                    checked={includeArchive}
                    onCheckedChange={(checked) => setIncludeArchive(Boolean(checked))}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="bulk-download-archive">Archive PDF</Label>
                    <p className="text-xs text-muted-foreground">
                      Includes the formatted archive version when Paperless has one.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="bulk-download-originals"
                    checked={includeOriginals}
                    onCheckedChange={(checked) => setIncludeOriginals(Boolean(checked))}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="bulk-download-originals">Original files</Label>
                    <p className="text-xs text-muted-foreground">
                      Includes the original uploaded files alongside any archive copies.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-md border bg-muted/20 px-3 py-3">
              <Checkbox
                id="bulk-download-follow-formatting"
                checked={followFormatting}
                onCheckedChange={(checked) => setFollowFormatting(Boolean(checked))}
              />
              <div className="space-y-1">
                <Label htmlFor="bulk-download-follow-formatting">
                  Use formatted filenames
                </Label>
                <p className="text-xs text-muted-foreground">
                  Applies Paperless filename formatting rules to archive and original
                  filenames inside the ZIP.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              If an archive PDF is unavailable for a document, Paperless falls back to
              the original file when possible.
            </p>

            {selection.type === "all-filtered" ? (
              <p className="text-xs text-muted-foreground">
                This uses your current filtered selection and respects any documents
                you excluded manually.
              </p>
            ) : null}

            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || selectedCount === 0}>
              <Download className="mr-2 h-3.5 w-3.5" />
              Download ZIP
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
