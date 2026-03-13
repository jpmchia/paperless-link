"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Undo2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface TrashDoc {
  id: number
  title: string
  created?: string
  deleted_at?: string
}

async function bulkTrashAction(ids: number[], method: string) {
  const res = await fetch("/api/bulk-edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      documents: ids,
      method,
      parameters: {},
    }),
  })
  if (!res.ok) throw new Error("Action failed")
}

export function TrashTable({ documents }: { documents: TrashDoc[] }) {
  const router = useRouter()
  const [selected, setSelected] = React.useState<Set<number>>(new Set())
  const [action, setAction] = React.useState<"restore" | "delete" | null>(null)
  const [busy, setBusy] = React.useState(false)

  const toggleAll = () => {
    if (selected.size === documents.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(documents.map((d) => d.id)))
    }
  }

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAction = async () => {
    if (!action || selected.size === 0) return
    setBusy(true)
    try {
      const method = action === "restore" ? "untrash" : "delete"
      await bulkTrashAction(Array.from(selected), method)
      toast.success(
        action === "restore"
          ? `${selected.size} document(s) restored`
          : `${selected.size} document(s) permanently deleted`
      )
      setSelected(new Set())
      router.refresh()
    } catch (e: any) {
      toast.error("Action failed", { description: e.message })
    } finally {
      setBusy(false)
      setAction(null)
    }
  }

  return (
    <>
      {/* Action bar */}
      <div className="flex items-center justify-between gap-2 flex-shrink-0">
        <p className="text-sm text-muted-foreground">
          {documents.length === 0
            ? "Trash is empty"
            : `${documents.length} document(s) in trash`}
        </p>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAction("restore")}
              disabled={busy}
            >
              <Undo2 className="mr-1 h-3.5 w-3.5" />Restore
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setAction("delete")}
              disabled={busy}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />Delete Permanently
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {documents.length > 0 && (
        <div className="rounded-md border overflow-auto flex-1">
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selected.size === documents.length && documents.length > 0}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Deleted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(doc.id)}
                      onCheckedChange={() => toggle(doc.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{doc.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {doc.created ? new Date(doc.created).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {doc.deleted_at ? new Date(doc.deleted_at).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Confirm dialog */}
      <AlertDialog open={action !== null} onOpenChange={(o: boolean) => !o && setAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === "restore" ? "Restore documents?" : "Permanently delete documents?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action === "restore"
                ? `${selected.size} document(s) will be restored to the main library.`
                : `${selected.size} document(s) will be permanently deleted. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={action === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              onClick={handleAction}
            >
              {action === "restore" ? "Restore" : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
