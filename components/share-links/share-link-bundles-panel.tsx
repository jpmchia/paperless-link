"use client"

import * as React from "react"
import { Copy, Loader2, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { CanDelete } from "@/components/permissions/can-delete"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  SHARE_LINK_BUNDLE_FILE_VERSION_LABELS,
  SHARE_LINK_BUNDLE_STATUS_LABELS,
  ShareLinkBundleStatus,
  type ShareLinkBundleSummary,
} from "@/data/share-link-bundle"
import { FileVersion, SHARE_LINK_EXPIRATION_OPTIONS } from "@/data/share-link"
import {
  createShareLinkBundle,
  deleteShareLinkBundle,
  getShareLinkBundlePublicUrl,
  isShareLinkBundleBusy,
  listShareLinkBundles,
  rebuildShareLinkBundle,
} from "@/lib/share-link-bundles"
import { toErrorMessage } from "@/lib/errors"

function formatBytes(bytes?: number) {
  if (bytes == null) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ShareLinkBundleCreateDialog({
  open,
  onOpenChange,
  documentIds,
  paperlessBaseUrl,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentIds: number[]
  paperlessBaseUrl: string
  onCreated?: (bundle: ShareLinkBundleSummary) => void
}) {
  const [fileVersion, setFileVersion] = React.useState<FileVersion>(
    FileVersion.Archive
  )
  const [expirationDays, setExpirationDays] = React.useState<string>("7")
  const [busy, setBusy] = React.useState(false)
  const [created, setCreated] = React.useState<ShareLinkBundleSummary | null>(
    null
  )

  React.useEffect(() => {
    if (!open) {
      setCreated(null)
      setBusy(false)
      setExpirationDays("7")
      setFileVersion(FileVersion.Archive)
    }
  }, [open])

  const handleCreate = async () => {
    setBusy(true)
    try {
      const bundle = await createShareLinkBundle({
        document_ids: documentIds,
        file_version: fileVersion,
        expiration_days:
          expirationDays === "never" ? null : Number(expirationDays),
      })
      setCreated(bundle)
      onCreated?.(bundle)
      toast.success("Share link bundle created")
    } catch (error) {
      toast.error("Failed to create bundle", {
        description: toErrorMessage(error),
      })
    } finally {
      setBusy(false)
    }
  }

  const shareUrl = created
    ? getShareLinkBundlePublicUrl(created.slug, paperlessBaseUrl)
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {created ? "Bundle ready" : `Create share link bundle`}
          </DialogTitle>
        </DialogHeader>
        {created && shareUrl ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {created.document_count} documents ·{" "}
              {SHARE_LINK_BUNDLE_STATUS_LABELS[created.status]}
            </p>
            <code className="block break-all rounded border bg-muted/40 px-2 py-2 text-xs">
              {shareUrl}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(shareUrl)
                toast.success("Copied share link")
              }}
            >
              <Copy className="mr-2 h-3.5 w-3.5" />
              Copy link
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Create a zip share link for {documentIds.length} selected
              document(s).
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">File version</Label>
              <Select
                value={fileVersion}
                onValueChange={(value) => setFileVersion(value as FileVersion)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(FileVersion).map((version) => (
                    <SelectItem key={version} value={version}>
                      {SHARE_LINK_BUNDLE_FILE_VERSION_LABELS[version]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Expiration</Label>
              <Select value={expirationDays} onValueChange={setExpirationDays}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHARE_LINK_EXPIRATION_OPTIONS.map((option) => (
                    <SelectItem
                      key={String(option.value)}
                      value={option.value == null ? "never" : String(option.value)}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {created ? "Close" : "Cancel"}
          </Button>
          {!created ? (
            <Button onClick={() => void handleCreate()} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create link
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ShareLinkBundlesPanel({
  documentId,
  paperlessBaseUrl,
}: {
  documentId?: number
  paperlessBaseUrl: string
}) {
  const [bundles, setBundles] = React.useState<ShareLinkBundleSummary[]>([])
  const [loading, setLoading] = React.useState(true)
  const [busyId, setBusyId] = React.useState<number | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      setBundles(await listShareLinkBundles({ documentId }))
    } catch (error) {
      toast.error("Failed to load share link bundles", {
        description: toErrorMessage(error),
      })
    } finally {
      setLoading(false)
    }
  }, [documentId])

  React.useEffect(() => {
    void load()
  }, [load])

  React.useEffect(() => {
    const hasBusy = bundles.some((bundle) => isShareLinkBundleBusy(bundle.status))
    if (!hasBusy) return
    const timer = window.setInterval(() => {
      void load()
    }, 4000)
    return () => window.clearInterval(timer)
  }, [bundles, load])

  if (loading && bundles.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading bundles…
      </div>
    )
  }

  if (bundles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No share link bundles yet.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {bundles.map((bundle) => {
        const url = getShareLinkBundlePublicUrl(bundle.slug, paperlessBaseUrl)
        return (
          <div
            key={bundle.id}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {SHARE_LINK_BUNDLE_STATUS_LABELS[bundle.status]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {bundle.document_count} docs · {formatBytes(bundle.size_bytes)}
                  </span>
                </div>
                <code className="mt-1 block truncate text-xs text-muted-foreground">
                  {url}
                </code>
                {bundle.status === ShareLinkBundleStatus.Failed &&
                bundle.last_error?.message ? (
                  <p className="mt-1 text-xs text-destructive">
                    {bundle.last_error.message}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={async () => {
                    await navigator.clipboard.writeText(url)
                    toast.success("Copied share link")
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={busyId === bundle.id}
                  onClick={async () => {
                    setBusyId(bundle.id)
                    try {
                      await rebuildShareLinkBundle(bundle.id)
                      toast.success("Rebuild started")
                      await load()
                    } catch (error) {
                      toast.error("Rebuild failed", {
                        description: toErrorMessage(error),
                      })
                    } finally {
                      setBusyId(null)
                    }
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
                <CanDelete type="shareLink">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    disabled={busyId === bundle.id}
                    onClick={async () => {
                      setBusyId(bundle.id)
                      try {
                        await deleteShareLinkBundle(bundle.id)
                        toast.success("Bundle deleted")
                        await load()
                      } catch (error) {
                        toast.error("Delete failed", {
                          description: toErrorMessage(error),
                        })
                      } finally {
                        setBusyId(null)
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CanDelete>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
