"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import { Trash2, Download, Tags, User, FileType, FolderOpen, X, RotateCcw, Check } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { tagPillStyle } from "@/lib/tag-colors"

interface BulkActionBarProps {
  selectedIds: number[]
  onClearSelection: () => void
  onComplete: () => void
  tags: { id: number; name: string; color: string | number }[]
  correspondents: { id: number; name: string }[]
  documentTypes: { id: number; name: string }[]
  storagePaths: { id: number; name: string }[]
}

async function bulkEdit(documentIds: number[], method: string, parameters: Record<string, any>) {
  const res = await fetch("/api/bulk-edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documents: documentIds, method, parameters }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Bulk edit failed: ${err}`)
  }
  return res.json()
}

async function bulkDownload(documentIds: number[]) {
  const res = await fetch("/api/bulk-download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documents: documentIds, content: "both" }),
  })
  if (!res.ok) throw new Error("Download failed")
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `documents-${Date.now()}.zip`
  a.click()
  URL.revokeObjectURL(url)
}

export function BulkActionBar({
  selectedIds,
  onClearSelection,
  onComplete,
  tags,
  correspondents,
  documentTypes,
  storagePaths,
}: BulkActionBarProps) {
  const [showDelete, setShowDelete] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  // Tag picker state
  const [tagPickerOpen, setTagPickerOpen] = React.useState(false)
  const [selectedTags, setSelectedTags] = React.useState<number[]>([])

  const count = selectedIds.length
  if (count === 0) return null

  const run = async (method: string, parameters: Record<string, any>, message: string) => {
    setBusy(true)
    try {
      await bulkEdit(selectedIds, method, parameters)
      toast.success(message)
      onComplete()
    } catch (e: any) {
      toast.error("Bulk operation failed", { description: e.message })
    } finally {
      setBusy(false)
    }
  }

  const handleSetCorrespondent = async (id: number | null) => {
    await run("set_correspondent", { correspondent: id }, `Correspondent ${id ? "set" : "cleared"} on ${count} documents`)
  }

  const handleSetDocumentType = async (id: number | null) => {
    await run("set_document_type", { document_type: id }, `Document type ${id ? "set" : "cleared"} on ${count} documents`)
  }

  const handleSetStoragePath = async (id: number | null) => {
    await run("set_storage_path", { storage_path: id }, `Storage path ${id ? "set" : "cleared"} on ${count} documents`)
  }

  const handleSetTags = async () => {
    await run("set_tags", { tags: selectedTags }, `Tags set on ${count} documents`)
    setTagPickerOpen(false)
    setSelectedTags([])
  }

  const handleDelete = async () => {
    setBusy(true)
    try {
      await bulkEdit(selectedIds, "delete", {})
      toast.success(`${count} document(s) moved to trash`)
      onComplete()
    } catch (e: any) {
      toast.error("Delete failed", { description: e.message })
    } finally {
      setBusy(false)
      setShowDelete(false)
    }
  }

  const handleDownload = async () => {
    setBusy(true)
    try {
      await bulkDownload(selectedIds)
      toast.success("Download started")
    } catch (e: any) {
      toast.error("Download failed", { description: e.message })
    } finally {
      setBusy(false)
    }
  }

  const handleRedoOcr = async () => {
    await run("redo_ocr", {}, `OCR reprocessing started on ${count} documents`)
  }

  return (
    <>
      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-lg">
        <Badge variant="secondary" className="font-mono text-xs">
          {count} selected
        </Badge>

        {/* Set Tags */}
        <Popover open={tagPickerOpen} onOpenChange={setTagPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={busy}>
              <Tags className="mr-1 h-3 w-3" />Tags
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search tags…" />
              <CommandList>
                <CommandEmpty>No tags found.</CommandEmpty>
                <CommandGroup className="max-h-40 overflow-y-auto">
                  {tags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      onSelect={() => {
                        setSelectedTags((prev) =>
                          prev.includes(tag.id)
                            ? prev.filter((t) => t !== tag.id)
                            : [...prev, tag.id]
                        )
                      }}
                    >
                      <Check className={cn("mr-2 h-3 w-3", selectedTags.includes(tag.id) ? "opacity-100" : "opacity-0")} />
                      <span className="inline-flex items-center gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={tagPillStyle(tag.color)} />
                        {tag.name}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
              <div className="border-t p-2">
                <Button size="sm" className="w-full h-7 text-xs" disabled={selectedTags.length === 0 || busy} onClick={handleSetTags}>
                  Apply tags ({selectedTags.length})
                </Button>
              </div>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Set Correspondent */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={busy}>
              <User className="mr-1 h-3 w-3" />Correspondent
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-60 overflow-y-auto">
            <DropdownMenuItem onClick={() => handleSetCorrespondent(null)}>
              <em className="text-muted-foreground">Clear</em>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {correspondents.map((c) => (
              <DropdownMenuItem key={c.id} onClick={() => handleSetCorrespondent(c.id)}>
                {c.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Set Document Type */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={busy}>
              <FileType className="mr-1 h-3 w-3" />Type
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-60 overflow-y-auto">
            <DropdownMenuItem onClick={() => handleSetDocumentType(null)}>
              <em className="text-muted-foreground">Clear</em>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {documentTypes.map((dt) => (
              <DropdownMenuItem key={dt.id} onClick={() => handleSetDocumentType(dt.id)}>
                {dt.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* More actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={busy}>
              More…
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderOpen className="mr-2 h-3.5 w-3.5" />Storage Path
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-60 overflow-y-auto">
                <DropdownMenuItem onClick={() => handleSetStoragePath(null)}>
                  <em className="text-muted-foreground">Clear</em>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {storagePaths.map((sp) => (
                  <DropdownMenuItem key={sp.id} onClick={() => handleSetStoragePath(sp.id)}>
                    {sp.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDownload} disabled={busy}>
              <Download className="mr-2 h-3.5 w-3.5" />Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleRedoOcr} disabled={busy}>
              <RotateCcw className="mr-2 h-3.5 w-3.5" />Redo OCR
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowDelete(true)} disabled={busy} className="text-destructive">
              <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={onClearSelection}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {count} document(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the selected documents to trash. You can recover them from the Trash page.
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
    </>
  )
}
