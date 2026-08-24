"use client"

import * as React from "react"
import { useAtom } from "jotai"
import { HasObjectPermission } from "@/components/permissions/has-object-permission"
import { useRealtimeDocumentRefresh } from "@/hooks/use-realtime-document-refresh"
import { activeVersionIdAtom } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Eye, Trash2, Pencil, Check, X, Upload, History, FilePlus2 } from "lucide-react"
import { toast } from "sonner"
import type { PermissionedObject } from "@/lib/permissions"
import { MergeAsVersionsDialog } from "@/components/documents/merge-as-versions-dialog"

interface DocumentVersion {
  id: number
  added: string
  version_label?: string | null
  checksum?: string
  is_root: boolean
  original_filename?: string
}

interface VersionsTabProps {
  documentId: number
  initialVersions: DocumentVersion[]
  permissionedDocument?: PermissionedObject | null
}

async function fetchVersions(documentId: number): Promise<DocumentVersion[]> {
  const docRes = await fetch(`/api/proxy/documents/${documentId}/?full_perms=true`)
  if (!docRes.ok) throw new Error("Failed to load versions")
  const doc = (await docRes.json()) as { versions?: DocumentVersion[] }
  return Array.isArray(doc.versions) ? doc.versions : []
}

export function VersionsTab({ documentId, initialVersions, permissionedDocument }: VersionsTabProps) {
  const [versions, setVersions] = React.useState<DocumentVersion[]>(initialVersions)
  const [activeVersionId, setActiveVersionId] = useAtom(activeVersionIdAtom)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)
  const [editId, setEditId] = React.useState<number | null>(null)
  const [editLabel, setEditLabel] = React.useState("")
  const [uploading, setUploading] = React.useState(false)
  const [mergeOpen, setMergeOpen] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const refreshToken = useRealtimeDocumentRefresh({
    documentId,
    pause: uploading || editId !== null || deleteId !== null,
  })

  const loadVersions = React.useCallback(async () => {
    const nextVersions = await fetchVersions(documentId)
    setVersions(nextVersions)
    if (
      activeVersionId != null &&
      !nextVersions.some((version) => version.id === activeVersionId)
    ) {
      setActiveVersionId(null)
    }
  }, [activeVersionId, documentId, setActiveVersionId])

  React.useEffect(() => {
    if (refreshToken === 0) return

    void loadVersions().catch((error: unknown) => {
      toast.error("Failed to refresh versions", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    })
  }, [loadVersions, refreshToken])

  const handleViewVersion = (versionId: number | null) => {
    setActiveVersionId(versionId)
  }

  const handleRenameStart = (v: DocumentVersion) => {
    setEditId(v.id)
    setEditLabel(v.version_label ?? "")
  }

  const handleRenameSave = async (versionId: number) => {
    try {
      const res = await fetch(`/api/proxy/documents/${documentId}/versions/${versionId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version_label: editLabel }),
      })
      if (!res.ok) throw new Error(await res.text())
      setVersions((prev) =>
        prev.map((v) => (v.id === versionId ? { ...v, version_label: editLabel } : v))
      )
      setEditId(null)
      toast.success("Version label updated")
    } catch (error) {
      toast.error("Failed to update label", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  const handleDelete = async () => {
    if (deleteId == null) return
    try {
      const res = await fetch(`/api/proxy/documents/${documentId}/versions/${deleteId}/`, {
        method: "DELETE",
      })
      if (!res.ok && res.status !== 204) throw new Error(await res.text())
      setVersions((prev) => prev.filter((v) => v.id !== deleteId))
      if (activeVersionId === deleteId) setActiveVersionId(null)
      toast.success("Version deleted")
    } catch (error) {
      toast.error("Failed to delete version", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setDeleteId(null)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("document", file)
      const res = await fetch(`/api/proxy/documents/${documentId}/update_version/`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) throw new Error(await res.text())
      await loadVersions()
      toast.success("New version uploaded")
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground py-16">
        <History className="h-10 w-10 opacity-30" />
        <p className="text-sm">No versions available for this document.</p>
        <HasObjectPermission action="change" object={permissionedDocument} type="document">
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload className="mr-2 h-3.5 w-3.5" />
            Upload new version
          </Button>
        </HasObjectPermission>
        <input ref={fileInputRef} type="file" className="hidden" accept="application/pdf,image/*" onChange={handleUpload} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Document Versions ({versions.length})</h4>
        <div className="flex gap-2">
          {activeVersionId != null && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setActiveVersionId(null)}>
              <X className="mr-1 h-3 w-3" />View latest
            </Button>
          )}
          <HasObjectPermission action="change" object={permissionedDocument} type="document">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="mr-1 h-3 w-3" />
              {uploading ? "Uploading…" : "Upload version"}
            </Button>
          </HasObjectPermission>
          <HasObjectPermission action="change" object={permissionedDocument} type="document">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setMergeOpen(true)}
            >
              <FilePlus2 className="mr-1 h-3 w-3" />
              Add existing
            </Button>
          </HasObjectPermission>
        </div>
        <input ref={fileInputRef} type="file" className="hidden" accept="application/pdf,image/*" onChange={handleUpload} />
      </div>

      <div className="space-y-2">
        {versions.map((v) => {
          const isActive = activeVersionId === v.id
          const isEditing = editId === v.id
          return (
            <div
              key={v.id}
              className={`rounded-lg border p-3 space-y-2 transition-colors ${isActive ? "border-primary bg-primary/5" : "hover:bg-muted/30"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <Input
                        className="h-6 text-xs px-2 w-40"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameSave(v.id)
                          if (e.key === "Escape") setEditId(null)
                        }}
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRenameSave(v.id)}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditId(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate">
                        {v.version_label || v.original_filename || `Version ${v.id}`}
                      </span>
                      {v.is_root && <Badge variant="secondary" className="text-[10px] h-4 px-1">Original</Badge>}
                      {isActive && <Badge variant="default" className="text-[10px] h-4 px-1">Previewing</Badge>}
                    </div>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(v.added).toLocaleString()}
                  </span>
                  {v.checksum && (
                    <span className="text-[10px] text-muted-foreground font-mono truncate" title={v.checksum}>
                      {v.checksum.slice(0, 16)}…
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="icon"
                    variant={isActive ? "default" : "ghost"}
                    className="h-6 w-6"
                    title={isActive ? "Currently previewing" : "Preview this version"}
                    onClick={() => handleViewVersion(isActive ? null : v.id)}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <HasObjectPermission action="change" object={permissionedDocument} type="document">
                    {!isEditing && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        title="Rename version label"
                        onClick={() => handleRenameStart(v)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </HasObjectPermission>
                  <HasObjectPermission action="delete" object={permissionedDocument} type="document">
                    {!v.is_root && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        title="Delete this version"
                        onClick={() => setDeleteId(v.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </HasObjectPermission>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <HasObjectPermission action="delete" object={permissionedDocument} type="document">
        <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete version?</AlertDialogTitle>
              <AlertDialogDescription>
                This version will be permanently removed. The document&apos;s other versions remain intact.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </HasObjectPermission>
      <MergeAsVersionsDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        documents={[]}
        fixedRootId={documentId}
        allowSearchSource
        onComplete={() => {
          void loadVersions()
        }}
      />
    </div>
  )
}
