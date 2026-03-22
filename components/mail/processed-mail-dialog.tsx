"use client"

import * as React from "react"
import { AlertTriangle, CheckCircle2, Clock3, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog as DraggableDialog,
  DialogBody as DraggableDialogBody,
  DialogContent as DraggableDialogContent,
  DialogDescription as DraggableDialogDescription,
  DialogFooter as DraggableDialogFooter,
  DialogHeader as DraggableDialogHeader,
  DialogTitle as DraggableDialogTitle,
} from "@/components/draggable-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { OpenDocumentLink } from "@/components/open-document-link"
import { HasObjectPermission } from "@/components/permissions/has-object-permission"
import { getJson, postJson, withQuery } from "@/lib/paperless-client"
import { toErrorMessage } from "@/lib/errors"
import type { PermissionedObject } from "@/lib/permissions"

type MailRuleReference = PermissionedObject & {
  id: number
  name: string
}

export type ProcessedMailEntry = PermissionedObject & {
  id: number
  folder?: string | null
  uid?: number | string | null
  subject?: string | null
  received: string
  processed?: string | null
  status?: number | string | null
  error?: string | null
  rule?: number | null
  rule_name?: string | null
  document?: number | null
}

type ProcessedMailResponse = {
  count?: number
  results?: ProcessedMailEntry[]
}

const STATUS_META: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  "0": { label: "Processed", icon: <CheckCircle2 className="h-3.5 w-3.5" />, variant: "secondary" },
  "1": { label: "Error", icon: <AlertTriangle className="h-3.5 w-3.5" />, variant: "destructive" },
  "2": { label: "No match", icon: <Clock3 className="h-3.5 w-3.5" />, variant: "outline" },
  SUCCESS: { label: "Processed", icon: <CheckCircle2 className="h-3.5 w-3.5" />, variant: "secondary" },
  FAILED: { label: "Error", icon: <AlertTriangle className="h-3.5 w-3.5" />, variant: "destructive" },
}

function formatDateTime(value?: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleString()
}

export function ProcessedMailDialog({
  open,
  onOpenChange,
  rule,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule: MailRuleReference | null
}) {
  const [entries, setEntries] = React.useState<ProcessedMailEntry[]>([])
  const [page, setPage] = React.useState(1)
  const [totalCount, setTotalCount] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [selectedIds, setSelectedIds] = React.useState<number[]>([])
  const pageCount = Math.max(1, Math.ceil(totalCount / 50))

  const loadEntries = React.useCallback(async (nextPage: number) => {
    if (!rule) return
    setLoading(true)
    try {
      const response = await getJson<ProcessedMailResponse>(
        withQuery("/api/proxy/processed_mail/", {
          ordering: "-processed",
          page: nextPage,
          page_size: 50,
          rule: rule.id,
        })
      )
      setEntries(response.results ?? [])
      setTotalCount(response.count ?? response.results?.length ?? 0)
      setSelectedIds([])
    } catch (error) {
      toast.error("Failed to load processed mail", {
        description: toErrorMessage(error),
      })
    } finally {
      setLoading(false)
    }
  }, [rule])

  React.useEffect(() => {
    if (!open || !rule) return
    void loadEntries(page)
  }, [loadEntries, open, page, rule])

  React.useEffect(() => {
    if (!open) {
      setEntries([])
      setSelectedIds([])
      setPage(1)
      setTotalCount(0)
    }
  }, [open])

  const allSelected = entries.length > 0 && entries.every((entry) => selectedIds.includes(entry.id))

  const toggleAll = React.useCallback((checked: boolean) => {
    setSelectedIds(checked ? entries.map((entry) => entry.id) : [])
  }, [entries])

  const toggleSelected = React.useCallback((entryId: number, checked: boolean) => {
    setSelectedIds((current) =>
      checked ? [...current, entryId] : current.filter((id) => id !== entryId)
    )
  }, [])

  const handleDeleteSelected = React.useCallback(async () => {
    if (selectedIds.length === 0) return
    setDeleting(true)
    try {
      await postJson("/api/proxy/processed_mail/bulk_delete/", {
        mail_ids: selectedIds,
      })
      toast.success("Processed mail deleted")
      await loadEntries(page)
    } catch (error) {
      toast.error("Failed to delete processed mail", {
        description: toErrorMessage(error),
      })
    } finally {
      setDeleting(false)
    }
  }, [loadEntries, page, selectedIds])

  return (
    <DraggableDialog open={open} onOpenChange={onOpenChange}>
      <DraggableDialogContent initialWidth={1100} initialHeight={760} maxWidth={1280} maxHeight={960}>
        <DraggableDialogHeader>
          <DraggableDialogTitle>
            Processed Mail{rule ? ` for ${rule.name}` : ""}
          </DraggableDialogTitle>
          <DraggableDialogDescription>
            Inspect processed messages, errors, and linked documents for this mail rule.
          </DraggableDialogDescription>
        </DraggableDialogHeader>
        <DraggableDialogBody>
          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading processed mail…
            </div>
          ) : entries.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              No processed email messages found.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={(checked) => toggleAll(Boolean(checked))}
                          aria-label="Select all processed mail rows"
                        />
                      </TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Processed</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Document</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => {
                      const status = STATUS_META[String(entry.status ?? "0")] ?? {
                        label: String(entry.status ?? "Unknown"),
                        icon: <Clock3 className="h-3.5 w-3.5" />,
                        variant: "outline" as const,
                      }

                      return (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <HasObjectPermission action="delete" object={entry} type="processedMail">
                              <Checkbox
                                checked={selectedIds.includes(entry.id)}
                                onCheckedChange={(checked) => toggleSelected(entry.id, Boolean(checked))}
                                aria-label={`Select processed mail ${entry.id}`}
                              />
                            </HasObjectPermission>
                          </TableCell>
                          <TableCell className="max-w-[260px]">
                            <div className="space-y-1">
                              <p className="truncate text-sm font-medium">{entry.subject || "No subject"}</p>
                              <div className="text-xs text-muted-foreground">
                                <span>{entry.folder || "—"}</span>
                                <span className="mx-1">•</span>
                                <span>UID {entry.uid ?? "—"}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTime(entry.received)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTime(entry.processed)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant} className="gap-1 text-xs">
                              {status.icon}
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[280px]">
                            {entry.error ? (
                              <pre className="max-h-24 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-[11px] leading-relaxed text-destructive">
                                {entry.error}
                              </pre>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {entry.document != null ? (
                              <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                                <OpenDocumentLink
                                  documentId={entry.document}
                                  title={entry.subject || `Document ${entry.document}`}
                                >
                                  View doc
                                </OpenDocumentLink>
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedIds([])} disabled={selectedIds.length === 0}>
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => void handleDeleteSelected()}
                    disabled={selectedIds.length === 0 || deleting}
                  >
                    {deleting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-2 h-3.5 w-3.5" />}
                    Delete selected
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
                    Previous
                  </Button>
                  <span>
                    Page {page} of {pageCount}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount}>
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DraggableDialogBody>
        <DraggableDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DraggableDialogFooter>
      </DraggableDialogContent>
    </DraggableDialog>
  )
}
