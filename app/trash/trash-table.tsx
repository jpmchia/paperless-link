"use client"

import * as React from "react"
import { usePermission } from "@/hooks/use-permissions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { RefreshCw, Undo2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { getJson, withQuery } from "@/lib/paperless-client"

interface TrashDoc {
  id: number
  title: string
  created?: string
  deleted_at?: string
}

interface TrashResponse {
  count?: number
  results?: TrashDoc[]
}

const PAGE_SIZE = 25

async function bulkTrashAction(ids: number[] | null, method: string) {
  const action = method === "untrash" ? "restore" : "empty"
  const res = await fetch("/api/proxy/trash/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      ...(ids ? { documents: ids } : {}),
    }),
  })
  if (!res.ok) throw new Error("Action failed")
}

export function TrashTable({
  initialDocuments,
  totalDocuments: initialTotalDocuments,
}: {
  initialDocuments: TrashDoc[]
  totalDocuments: number
}) {
  const router = useRouter()
  const [documents, setDocuments] = React.useState<TrashDoc[]>(initialDocuments)
  const [totalDocuments, setTotalDocuments] = React.useState(initialTotalDocuments)
  const [page, setPage] = React.useState(1)
  const [loadingPage, setLoadingPage] = React.useState(false)
  const [selected, setSelected] = React.useState<Set<number>>(new Set())
  const [action, setAction] = React.useState<"restore" | "delete" | null>(null)
  const [emptyingAll, setEmptyingAll] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const canRestore = usePermission("change", "document")
  const canDelete = usePermission("delete", "document")
  const canSelect = canRestore || canDelete
  const totalPages = Math.max(1, Math.ceil(totalDocuments / PAGE_SIZE))

  const fetchPage = React.useCallback(async (nextPage: number) => {
    setLoadingPage(true)
    try {
      const data = await getJson<TrashResponse>(
        withQuery("/api/proxy/trash/", {
          page: nextPage,
          page_size: PAGE_SIZE,
        })
      )
      setDocuments(data.results ?? [])
      setTotalDocuments(data.count ?? 0)
      setPage(nextPage)
      setSelected(new Set())
    } catch (error) {
      toast.error("Failed to load trash", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoadingPage(false)
    }
  }, [])

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
      await fetchPage(Math.min(page, Math.max(1, Math.ceil((totalDocuments - selected.size) / PAGE_SIZE))))
      router.refresh()
    } catch (error) {
      toast.error("Action failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setBusy(false)
      setAction(null)
    }
  }

  const handleEmptyTrash = async () => {
    setEmptyingAll(true)
    try {
      await bulkTrashAction(null, "delete")
      toast.success("Trash emptied")
      setSelected(new Set())
      await fetchPage(1)
      router.refresh()
    } catch (error) {
      toast.error("Failed to empty trash", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setEmptyingAll(false)
    }
  }

  return (
    <>
      {/* Action bar */}
      <div className="flex items-center justify-between gap-2 flex-shrink-0">
        <p className="text-sm text-muted-foreground">
          {documents.length === 0
            ? "Trash is empty"
            : `${totalDocuments} document(s) in trash`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {selected.size > 0 && canSelect && (
            <>
              <span className="text-sm font-medium">{selected.size} selected</span>
              {canRestore && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAction("restore")}
                  disabled={busy || loadingPage}
                >
                  <Undo2 className="mr-1 h-3.5 w-3.5" />Restore Selected
                </Button>
              )}
              {canDelete && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setAction("delete")}
                  disabled={busy || loadingPage}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />Delete Selected
                </Button>
              )}
            </>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleEmptyTrash()}
              disabled={emptyingAll || loadingPage || totalDocuments === 0}
            >
              {emptyingAll ? (
                <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-3.5 w-3.5" />
              )}
              Empty Trash
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {documents.length > 0 && (
        <div className="rounded-md border overflow-auto flex-1">
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                {canSelect && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selected.size === documents.length && documents.length > 0}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                <TableHead>Title</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Deleted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingPage ? (
                <TableRow>
                  <TableCell colSpan={canSelect ? 4 : 3} className="h-24 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto mb-2 h-4 w-4 animate-spin" />
                    Loading trash…
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    {canSelect && (
                      <TableCell>
                        <Checkbox
                          checked={selected.has(doc.id)}
                          onCheckedChange={() => toggle(doc.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {doc.created ? new Date(doc.created).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {doc.deleted_at ? new Date(doc.deleted_at).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {totalDocuments > PAGE_SIZE && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault()
                  if (page > 1 && !loadingPage) void fetchPage(page - 1)
                }}
                aria-disabled={page <= 1 || loadingPage}
                className={page <= 1 || loadingPage ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, index) => index + 1)
              .filter((candidate) =>
                candidate === 1 ||
                candidate === totalPages ||
                Math.abs(candidate - page) <= 1
              )
              .map((candidate, index, candidates) => (
                <React.Fragment key={candidate}>
                  {index > 0 && candidate - candidates[index - 1] > 1 ? (
                    <PaginationItem>
                      <span className="px-2 text-sm text-muted-foreground">…</span>
                    </PaginationItem>
                  ) : null}
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      isActive={candidate === page}
                      onClick={(event) => {
                        event.preventDefault()
                        if (candidate !== page && !loadingPage) void fetchPage(candidate)
                      }}
                    >
                      {candidate}
                    </PaginationLink>
                  </PaginationItem>
                </React.Fragment>
              ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault()
                  if (page < totalPages && !loadingPage) void fetchPage(page + 1)
                }}
                aria-disabled={page >= totalPages || loadingPage}
                className={page >= totalPages || loadingPage ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
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
            {((action === "restore" && canRestore) || (action === "delete" && canDelete)) && (
              <AlertDialogAction
                className={action === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                onClick={handleAction}
              >
                {action === "restore" ? "Restore" : "Delete Permanently"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
