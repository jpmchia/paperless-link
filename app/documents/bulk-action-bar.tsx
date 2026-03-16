"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Trash2, Download, Tags, User, FileType, FolderOpen, X, RotateCcw, Check,
  ShieldCheck, FormInput, Merge, RotateCw,
} from "lucide-react"
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
  customFields?: { id: number; name: string; data_type: string }[]
  usersList?: { id: number; username: string }[]
  groupsList?: { id: number; name: string }[]
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

async function proxyPost(path: string, body: Record<string, any>) {
  const res = await fetch(`/api/proxy/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(err)
  }
  return res.json().catch(() => null)
}

// Multi-select combobox for users/groups
function MultiSelectCombobox({
  items,
  selected,
  onChange,
  placeholder,
  labelKey = "username",
}: {
  items: any[]
  selected: number[]
  onChange: (ids: number[]) => void
  placeholder: string
  labelKey?: string
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8">
          {selected.length > 0 ? `${selected.length} selected` : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandList className="max-h-48">
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => {
                const isSelected = selected.includes(item.id)
                return (
                  <CommandItem
                    key={item.id}
                    value={item[labelKey] || item.name}
                    onSelect={() =>
                      onChange(
                        isSelected
                          ? selected.filter((id) => id !== item.id)
                          : [...selected, item.id]
                      )
                    }
                  >
                    <Check className={cn("mr-2 h-3 w-3", isSelected ? "opacity-100" : "opacity-0")} />
                    {item[labelKey] || item.name}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function BulkActionBar({
  selectedIds,
  onClearSelection,
  onComplete,
  tags,
  correspondents,
  documentTypes,
  storagePaths,
  customFields = [],
  usersList = [],
  groupsList = [],
}: BulkActionBarProps) {
  const [showDelete, setShowDelete] = React.useState(false)
  const [showMerge, setShowMerge] = React.useState(false)
  const [showPermissions, setShowPermissions] = React.useState(false)
  const [showCustomFields, setShowCustomFields] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  // Tag picker state
  const [tagPickerOpen, setTagPickerOpen] = React.useState(false)
  const [selectedTags, setSelectedTags] = React.useState<number[]>([])

  // Permissions dialog state
  const [permOwner, setPermOwner] = React.useState<number | null>(null)
  const [permViewUsers, setPermViewUsers] = React.useState<number[]>([])
  const [permViewGroups, setPermViewGroups] = React.useState<number[]>([])
  const [permChangeUsers, setPermChangeUsers] = React.useState<number[]>([])
  const [permChangeGroups, setPermChangeGroups] = React.useState<number[]>([])
  const [permMerge, setPermMerge] = React.useState(false)

  // Custom field dialog state
  const [cfFieldId, setCfFieldId] = React.useState<string>("")
  const [cfValue, setCfValue] = React.useState<string>("")

  // Merge dialog state
  const [mergeDeleteOriginals, setMergeDeleteOriginals] = React.useState(false)

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

  const handleRotate = async (degrees: number) => {
    setBusy(true)
    try {
      await proxyPost("documents/rotate/", { documents: selectedIds, degrees })
      toast.success(`Rotated ${count} document(s) by ${degrees}°`)
      onComplete()
    } catch (e: any) {
      toast.error("Rotate failed", { description: e.message })
    } finally {
      setBusy(false)
    }
  }

  const handleMerge = async () => {
    setBusy(true)
    try {
      await proxyPost("documents/merge/", {
        documents: selectedIds,
        delete_originals: mergeDeleteOriginals,
      })
      toast.success(`Merging ${count} documents…`)
      setShowMerge(false)
      onComplete()
    } catch (e: any) {
      toast.error("Merge failed", { description: e.message })
    } finally {
      setBusy(false)
    }
  }

  const handleSavePermissions = async () => {
    setBusy(true)
    try {
      await bulkEdit(selectedIds, "set_permissions", {
        owner: permOwner,
        set_permissions: {
          view: { users: permViewUsers, groups: permViewGroups },
          change: { users: permChangeUsers, groups: permChangeGroups },
        },
        merge: permMerge,
      })
      toast.success(`Permissions updated on ${count} documents`)
      setShowPermissions(false)
      onComplete()
    } catch (e: any) {
      toast.error("Permissions update failed", { description: e.message })
    } finally {
      setBusy(false)
    }
  }

  const handleSaveCustomField = async () => {
    if (!cfFieldId) return
    setBusy(true)
    try {
      await bulkEdit(selectedIds, "modify_custom_fields", {
        custom_fields: [{ field: Number(cfFieldId), value: cfValue || null }],
      })
      toast.success(`Custom field updated on ${count} documents`)
      setShowCustomFields(false)
      setCfFieldId("")
      setCfValue("")
      onComplete()
    } catch (e: any) {
      toast.error("Custom field update failed", { description: e.message })
    } finally {
      setBusy(false)
    }
  }

  const selectedField = customFields.find((cf) => String(cf.id) === cfFieldId)

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

            {customFields.length > 0 && (
              <DropdownMenuItem onClick={() => setShowCustomFields(true)} disabled={busy}>
                <FormInput className="mr-2 h-3.5 w-3.5" />Custom Field…
              </DropdownMenuItem>
            )}

            {usersList.length > 0 && (
              <DropdownMenuItem onClick={() => setShowPermissions(true)} disabled={busy}>
                <ShieldCheck className="mr-2 h-3.5 w-3.5" />Permissions…
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <RotateCw className="mr-2 h-3.5 w-3.5" />Rotate
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => handleRotate(90)}>90° clockwise</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRotate(180)}>180°</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRotate(270)}>90° counter-clockwise</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {count >= 2 && (
              <DropdownMenuItem onClick={() => setShowMerge(true)} disabled={busy}>
                <Merge className="mr-2 h-3.5 w-3.5" />Merge…
              </DropdownMenuItem>
            )}

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

      {/* Merge confirmation */}
      <AlertDialog open={showMerge} onOpenChange={setShowMerge}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge {count} documents?</AlertDialogTitle>
            <AlertDialogDescription>
              This will combine the selected documents into one. A new document will be created with all pages merged in selection order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 px-1 py-2">
            <Switch
              id="delete-originals"
              checked={mergeDeleteOriginals}
              onCheckedChange={setMergeDeleteOriginals}
            />
            <Label htmlFor="delete-originals" className="text-sm">Delete original documents after merging</Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMerge} disabled={busy}>
              Merge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permissions dialog */}
      <Dialog open={showPermissions} onOpenChange={setShowPermissions}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set permissions on {count} document(s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Owner</Label>
              <Select
                value={permOwner != null ? String(permOwner) : "none"}
                onValueChange={(v) => setPermOwner(v === "none" ? null : Number(v))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="No owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none"><em className="text-muted-foreground">No owner</em></SelectItem>
                  {usersList.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b pb-1">View Access</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Users</Label>
                  <MultiSelectCombobox items={usersList} selected={permViewUsers} onChange={setPermViewUsers} placeholder="Select users…" labelKey="username" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Groups</Label>
                  <MultiSelectCombobox items={groupsList} selected={permViewGroups} onChange={setPermViewGroups} placeholder="Select groups…" labelKey="name" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b pb-1">Edit Access</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Users</Label>
                  <MultiSelectCombobox items={usersList} selected={permChangeUsers} onChange={setPermChangeUsers} placeholder="Select users…" labelKey="username" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Groups</Label>
                  <MultiSelectCombobox items={groupsList} selected={permChangeGroups} onChange={setPermChangeGroups} placeholder="Select groups…" labelKey="name" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch id="perm-merge" checked={permMerge} onCheckedChange={setPermMerge} />
              <Label htmlFor="perm-merge" className="text-xs">Merge with existing permissions (instead of replacing)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissions(false)}>Cancel</Button>
            <Button onClick={handleSavePermissions} disabled={busy}>
              Apply Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom field dialog */}
      <Dialog open={showCustomFields} onOpenChange={setShowCustomFields}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set custom field on {count} document(s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Field</Label>
              <Select value={cfFieldId} onValueChange={(v) => { setCfFieldId(v); setCfValue("") }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select a field…" />
                </SelectTrigger>
                <SelectContent>
                  {customFields.map((cf) => (
                    <SelectItem key={cf.id} value={String(cf.id)}>{cf.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedField && (
              <div className="space-y-1.5">
                <Label className="text-xs">Value</Label>
                {selectedField.data_type === "boolean" ? (
                  <Select value={cfValue} onValueChange={setCfValue}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">True</SelectItem>
                      <SelectItem value="false">False</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    className="h-8 text-xs"
                    type={selectedField.data_type === "integer" || selectedField.data_type === "float" || selectedField.data_type === "monetary" ? "number" : selectedField.data_type === "date" ? "date" : "text"}
                    placeholder={`Enter ${selectedField.data_type} value…`}
                    value={cfValue}
                    onChange={(e) => setCfValue(e.target.value)}
                  />
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomFields(false)}>Cancel</Button>
            <Button onClick={handleSaveCustomField} disabled={busy || !cfFieldId}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
