"use client"

import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toErrorMessage } from "@/lib/errors"
import { getJson } from "@/lib/paperless-client"
import {
  buildMergeAsVersionsPayload,
  mergeDocumentsAsVersions,
} from "@/lib/merge-as-versions"

type DocumentOption = { id: number; title?: string | null }

export function MergeAsVersionsDialog({
  open,
  onOpenChange,
  documents,
  fixedRootId,
  allowSearchSource = false,
  onComplete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  documents: DocumentOption[]
  fixedRootId?: number
  allowSearchSource?: boolean
  onComplete?: () => void
}) {
  const [rootId, setRootId] = React.useState<number | null>(
    fixedRootId ?? documents[0]?.id ?? null
  )
  const [versionLabel, setVersionLabel] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<DocumentOption[]>([])
  const [selectedSourceId, setSelectedSourceId] = React.useState<number | null>(
    null
  )

  React.useEffect(() => {
    if (!open) return
    setRootId(fixedRootId ?? documents[0]?.id ?? null)
    setVersionLabel("")
    setSearch("")
    setSearchResults([])
    setSelectedSourceId(null)
  }, [open, fixedRootId, documents])

  React.useEffect(() => {
    if (!allowSearchSource || !open || search.trim().length < 2) {
      setSearchResults([])
      return
    }
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const data = await getJson<{
            results?: DocumentOption[]
          }>(
            `/api/proxy/documents/?query=${encodeURIComponent(search.trim())}&page_size=10`
          )
          setSearchResults(
            (data.results ?? []).filter((doc) => doc.id !== fixedRootId)
          )
        } catch {
          setSearchResults([])
        }
      })()
    }, 250)
    return () => window.clearTimeout(handle)
  }, [allowSearchSource, fixedRootId, open, search])

  const effectiveDocuments = allowSearchSource
    ? [
        { id: fixedRootId!, title: `Document ${fixedRootId}` },
        ...(selectedSourceId != null
          ? [
              searchResults.find((doc) => doc.id === selectedSourceId) ?? {
                id: selectedSourceId,
                title: `Document ${selectedSourceId}`,
              },
            ]
          : []),
      ]
    : documents

  const sourceCount = Math.max(effectiveDocuments.length - 1, 0)
  const canLabel = sourceCount === 1

  const handleSubmit = async () => {
    if (rootId == null) return
    setBusy(true)
    try {
      const payload = buildMergeAsVersionsPayload({
        rootDocumentId: rootId,
        sourceDocumentIds: effectiveDocuments.map((doc) => doc.id),
        versionLabel: canLabel ? versionLabel : undefined,
      })
      await mergeDocumentsAsVersions(payload)
      toast.success("Merge as versions started")
      onOpenChange(false)
      onComplete?.()
    } catch (error) {
      toast.error("Merge as versions failed", {
        description: toErrorMessage(error),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Merge as versions</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Source documents become versions of the root document and stop
            appearing as standalone documents.
          </p>
          {!allowSearchSource ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Root document</Label>
              <Select
                value={rootId != null ? String(rootId) : undefined}
                onValueChange={(value) => setRootId(Number(value))}
                disabled={fixedRootId != null}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select root" />
                </SelectTrigger>
                <SelectContent>
                  {documents.map((doc) => (
                    <SelectItem key={doc.id} value={String(doc.id)}>
                      {doc.title?.trim() || `Document ${doc.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="source-search">
                Source document
              </Label>
              <Input
                id="source-search"
                className="h-8 text-xs"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search documents…"
              />
              {searchResults.length > 0 ? (
                <div className="max-h-40 overflow-y-auto rounded border">
                  {searchResults.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      className={`block w-full px-2 py-1.5 text-left text-xs hover:bg-muted ${
                        selectedSourceId === doc.id ? "bg-muted" : ""
                      }`}
                      onClick={() => setSelectedSourceId(doc.id)}
                    >
                      {doc.title?.trim() || `Document ${doc.id}`}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
          {canLabel ? (
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="version-label">
                Version label (optional)
              </Label>
              <Input
                id="version-label"
                className="h-8 text-xs"
                value={versionLabel}
                onChange={(event) => setVersionLabel(event.target.value)}
                placeholder="Imported"
              />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={
              busy ||
              effectiveDocuments.length < 2 ||
              rootId == null ||
              (allowSearchSource && selectedSourceId == null)
            }
          >
            Merge as versions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
