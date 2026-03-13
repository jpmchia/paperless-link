"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Trash2, Plus, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Workflow {
  id: number
  name: string
  order: number
  enabled: boolean
  triggers?: any[]
  actions?: any[]
}

async function apiAction(method: string, path: string, body?: any) {
  const res = await fetch(`/api/proxy/${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`API call failed: ${res.statusText}`)
  if (method === "DELETE") return
  return res.json()
}

export function WorkflowsTable({ initialItems }: { initialItems: Workflow[] }) {
  const router = useRouter()
  const [items, setItems] = React.useState<Workflow[]>(initialItems)
  const [search, setSearch] = React.useState("")
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  const filtered = items.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  )

  const toggleEnabled = async (wf: Workflow) => {
    try {
      await apiAction("PATCH", `workflows/${wf.id}/`, { enabled: !wf.enabled })
      setItems((prev) =>
        prev.map((w) => (w.id === wf.id ? { ...w, enabled: !w.enabled } : w))
      )
      toast.success(`Workflow "${wf.name}" ${wf.enabled ? "disabled" : "enabled"}`)
    } catch (e: any) {
      toast.error("Failed to update workflow", { description: e.message })
    }
  }

  const handleDelete = async () => {
    if (deleteId == null) return
    try {
      await apiAction("DELETE", `workflows/${deleteId}/`)
      setItems((prev) => prev.filter((w) => w.id !== deleteId))
      toast.success("Workflow deleted")
    } catch (e: any) {
      toast.error("Failed to delete", { description: e.message })
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search workflows…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {items.length} workflows
        </p>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-20 text-center">Order</TableHead>
              <TableHead className="w-20 text-center">Enabled</TableHead>
              <TableHead className="w-28">Triggers</TableHead>
              <TableHead className="w-28">Actions</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                  {search ? "No workflows match your search." : "No workflows configured."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((wf) => (
                <TableRow key={wf.id}>
                  <TableCell className="font-medium">{wf.name}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{wf.order}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={wf.enabled}
                      onCheckedChange={() => toggleEnabled(wf)}
                      className="mx-auto"
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {wf.triggers?.length ?? 0} trigger{(wf.triggers?.length ?? 0) !== 1 ? "s" : ""}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {wf.actions?.length ?? 0} action{(wf.actions?.length ?? 0) !== 1 ? "s" : ""}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(wf.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(o: boolean) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
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
