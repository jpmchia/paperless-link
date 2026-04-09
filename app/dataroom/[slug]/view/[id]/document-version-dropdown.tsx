"use client"

import * as React from "react"
import { useAtom } from "jotai"
import {
  Check,
  Eye,
  History,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { activeVersionIdAtom } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type DocumentVersion = {
  id: number
  added: string
  version_label?: string | null
  checksum?: string
  is_root: boolean
  original_filename?: string
}

interface DocumentVersionDropdownProps {
  documentId: number
  initialVersions: DocumentVersion[]
  disabled?: boolean
}

async function fetchVersions(documentId: number): Promise<DocumentVersion[]> {
  const response = await fetch(`/api/proxy/documents/${documentId}/?full_perms=true`)
  if (!response.ok) {
    throw new Error(await response.text())
  }

  const document = (await response.json()) as { versions?: DocumentVersion[] }
  return Array.isArray(document.versions) ? document.versions : []
}

export function DocumentVersionDropdown({
  documentId,
  initialVersions,
  disabled = false,
}: DocumentVersionDropdownProps) {
  const [activeVersionId, setActiveVersionId] = useAtom(activeVersionIdAtom)
  const [open, setOpen] = React.useState(false)
  const [versions, setVersions] = React.useState<DocumentVersion[]>(initialVersions)
  const [uploading, setUploading] = React.useState(false)
  const [savingLabelId, setSavingLabelId] = React.useState<number | null>(null)
  const [deletingId, setDeletingId] = React.useState<number | null>(null)
  const [editingId, setEditingId] = React.useState<number | null>(null)
  const [labelDraft, setLabelDraft] = React.useState("")
  const [newVersionLabel, setNewVersionLabel] = React.useState("")
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const loadVersions = React.useCallback(async () => {
    const nextVersions = await fetchVersions(documentId)
    setVersions(nextVersions)
    if (activeVersionId != null && !nextVersions.some((version) => version.id === activeVersionId)) {
      setActiveVersionId(null)
    }
  }, [activeVersionId, documentId, setActiveVersionId])

  React.useEffect(() => {
    setVersions(initialVersions)
  }, [initialVersions])

  const handleUpload = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("document", file, file.name)
      const trimmedLabel = newVersionLabel.trim()
      if (trimmedLabel) {
        formData.append("version_label", trimmedLabel)
      }

      const response = await fetch(`/api/proxy/documents/${documentId}/update_version/`, {
        method: "POST",
        body: formData,
      })
      if (!response.ok) {
        throw new Error(await response.text())
      }

      await loadVersions()
      setNewVersionLabel("")
      toast.success("New version uploaded")
    } catch (error) {
      toast.error("Failed to upload version", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }, [documentId, loadVersions, newVersionLabel])

  const handleSaveLabel = React.useCallback(async (versionId: number) => {
    setSavingLabelId(versionId)
    try {
      const response = await fetch(`/api/proxy/documents/${documentId}/versions/${versionId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version_label: labelDraft.trim() || null }),
      })
      if (!response.ok) {
        throw new Error(await response.text())
      }

      const updated = (await response.json()) as DocumentVersion
      setVersions((previous) =>
        previous.map((version) =>
          version.id === versionId
            ? { ...version, version_label: updated.version_label }
            : version
        )
      )
      setEditingId(null)
      setLabelDraft("")
      toast.success("Version label updated")
    } catch (error) {
      toast.error("Failed to update version label", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSavingLabelId(null)
    }
  }, [documentId, labelDraft])

  const handleDelete = React.useCallback(async (versionId: number) => {
    setDeletingId(versionId)
    try {
      const response = await fetch(`/api/proxy/documents/${documentId}/versions/${versionId}/`, {
        method: "DELETE",
      })
      if (!response.ok && response.status !== 204) {
        throw new Error(await response.text())
      }

      await loadVersions()
      toast.success("Version deleted")
    } catch (error) {
      toast.error("Failed to delete version", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setDeletingId(null)
    }
  }, [documentId, loadVersions])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" className="h-8 hover:bg-accent" disabled={disabled}>
          <History className="mr-2 h-4 w-4" />
          Versions
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-3">
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Upload new version</p>
            <Input
              value={newVersionLabel}
              onChange={(event) => setNewVersionLabel(event.target.value)}
              placeholder="Optional version label"
              className="h-8 text-xs"
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />}
                Upload version
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="application/pdf,image/*"
                onChange={handleUpload}
              />
            </div>
          </div>

          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            <Button
              size="sm"
              variant={activeVersionId == null ? "default" : "ghost"}
              className="h-8 w-full justify-start text-xs"
              onClick={() => setActiveVersionId(null)}
            >
              <Eye className="mr-2 h-3.5 w-3.5" />
              View latest
            </Button>

            {versions.map((version) => {
              const isActive = activeVersionId === version.id
              const isEditing = editingId === version.id

              return (
                <div key={version.id} className="rounded-md border p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={labelDraft}
                            onChange={(event) => setLabelDraft(event.target.value)}
                            className="h-7 text-xs"
                            autoFocus
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault()
                                void handleSaveLabel(version.id)
                              }
                              if (event.key === "Escape") {
                                setEditingId(null)
                                setLabelDraft("")
                              }
                            }}
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => void handleSaveLabel(version.id)} disabled={savingLabelId === version.id}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                            setEditingId(null)
                            setLabelDraft("")
                          }}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="truncate text-xs font-medium">
                            {version.version_label || version.original_filename || `Version ${version.id}`}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(version.added).toLocaleString()}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant={isActive ? "default" : "ghost"}
                        className="h-7 w-7"
                        onClick={() => setActiveVersionId(isActive ? null : version.id)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {!isEditing ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingId(version.id)
                            setLabelDraft(version.version_label ?? "")
                          }}
                          disabled={savingLabelId === version.id}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      {!version.is_root ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => void handleDelete(version.id)}
                          disabled={deletingId === version.id}
                        >
                          {deletingId === version.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
