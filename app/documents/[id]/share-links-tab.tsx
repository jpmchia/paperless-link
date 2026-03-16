"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Copy, Trash2, Plus, Link, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ShareLink {
  id: number
  slug: string
  expiration: string | null
  created: string
  document: number
}

const EXPIRATION_OPTIONS = [
  { label: "1 day", value: "1" },
  { label: "7 days", value: "7" },
  { label: "30 days", value: "30" },
  { label: "Never", value: "never" },
]

function expirationDate(days: string): string | null {
  if (days === "never") return null
  const d = new Date()
  d.setDate(d.getDate() + parseInt(days))
  return d.toISOString()
}

function formatExpiry(expiration: string | null): string {
  if (!expiration) return "Never expires"
  const d = new Date(expiration)
  const now = new Date()
  if (d < now) return "Expired"
  return `Expires ${d.toLocaleDateString()}`
}

interface ShareLinksTabProps {
  documentId: number
  paperlessBaseUrl: string
}

export function ShareLinksTab({ documentId, paperlessBaseUrl }: ShareLinksTabProps) {
  const [links, setLinks] = React.useState<ShareLink[]>([])
  const [loading, setLoading] = React.useState(true)
  const [creating, setCreating] = React.useState(false)
  const [expiration, setExpiration] = React.useState("7")
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  const loadLinks = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/proxy/documents/${documentId}/share_links/`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setLinks(Array.isArray(data) ? data : (data.results ?? []))
    } catch {
      toast.error("Failed to load share links")
    } finally {
      setLoading(false)
    }
  }, [documentId])

  React.useEffect(() => { loadLinks() }, [loadLinks])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const body: Record<string, any> = {}
      const exp = expirationDate(expiration)
      if (exp) body.expiration = exp
      const res = await fetch(`/api/proxy/documents/${documentId}/share_links/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await res.text())
      const created = await res.json()
      setLinks((prev) => [created, ...prev])
      toast.success("Share link created")
    } catch (e: any) {
      toast.error("Failed to create share link", { description: e.message })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (deleteId == null) return
    try {
      const res = await fetch(`/api/proxy/documents/${documentId}/share_links/${deleteId}/`, {
        method: "DELETE",
      })
      if (!res.ok && res.status !== 204) throw new Error()
      setLinks((prev) => prev.filter((l) => l.id !== deleteId))
      toast.success("Share link revoked")
    } catch {
      toast.error("Failed to revoke share link")
    } finally {
      setDeleteId(null)
    }
  }

  const copyLink = (slug: string) => {
    const url = `${paperlessBaseUrl}/share/${slug}`
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copied to clipboard"),
      () => toast.error("Failed to copy")
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
      {/* Create new link */}
      <div className="rounded-lg border p-3 space-y-3">
        <p className="text-sm font-medium">Create share link</p>
        <div className="flex items-center gap-2">
          <Select value={expiration} onValueChange={setExpiration}>
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPIRATION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 text-xs" onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Plus className="mr-1.5 h-3 w-3" />}
            Create link
          </Button>
        </div>
      </div>

      {/* Links list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : links.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
          <Link className="h-8 w-8 opacity-30" />
          <p className="text-sm">No share links yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">{links.length} active link{links.length !== 1 ? "s" : ""}</p>
          {links.map((link) => {
            const url = `${paperlessBaseUrl}/share/${link.slug}`
            const expired = link.expiration && new Date(link.expiration) < new Date()
            return (
              <div key={link.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <code className="text-xs bg-muted rounded px-1.5 py-0.5 font-mono truncate block max-w-[260px]" title={url}>
                      {url}
                    </code>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={expired ? "destructive" : "secondary"}
                        className="text-[10px] h-4 px-1.5"
                      >
                        {formatExpiry(link.expiration)}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        Created {new Date(link.created).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Copy link"
                      onClick={() => copyLink(link.slug)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      title="Revoke link"
                      onClick={() => setDeleteId(link.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke share link?</AlertDialogTitle>
            <AlertDialogDescription>
              This link will stop working immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
