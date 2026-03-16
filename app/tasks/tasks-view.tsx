"use client"

import * as React from "react"
import { CanChange } from "@/components/permissions/can-change"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { RefreshCw, AlertTriangle, CheckCircle, Clock, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useAsyncAction } from "@/hooks/use-async-action"
import { getJson, postJson } from "@/lib/paperless-client"
import { toErrorMessage } from "@/lib/errors"

interface PaperlessTask {
  id: number
  task_id: string
  task_file_name: string
  date_created: string
  date_done?: string
  type: string
  status: string
  result?: string
  acknowledged: boolean
  related_document?: string | null
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  SUCCESS: { label: "Success", variant: "default", icon: CheckCircle },
  FAILURE: { label: "Failed", variant: "destructive", icon: AlertTriangle },
  PENDING: { label: "Pending", variant: "secondary", icon: Clock },
  STARTED: { label: "Running", variant: "outline", icon: Loader2 },
  REVOKED: { label: "Revoked", variant: "secondary", icon: AlertTriangle },
}

export function TasksView() {
  const [tasks, setTasks] = React.useState<PaperlessTask[]>([])
  const [loading, setLoading] = React.useState(true)

  const fetchTasks = React.useCallback(async () => {
    try {
      const data = await getJson<PaperlessTask[] | { results?: PaperlessTask[] }>(
        "/api/tasks"
      )
      setTasks(Array.isArray(data) ? data : data.results || [])
    } catch (error) {
      toast.error("Failed to load tasks", {
        description: toErrorMessage(error),
      })
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchTasks()
    const interval = setInterval(fetchTasks, 5000)
    return () => clearInterval(interval)
  }, [fetchTasks])

  const { pending: dismissing, run: dismissAll } = useAsyncAction({
    action: async () => postJson<{ ok: boolean }>("/api/tasks/acknowledge"),
    errorMessage: "Failed to dismiss",
    onSuccess: () => {
      setTasks((prev) => prev.map((task) => ({ ...task, acknowledged: true })))
    },
    successMessage: "All tasks acknowledged",
  })

  const unacknowledged = tasks.filter((t) => !t.acknowledged)
  const sortedTasks = [...tasks].sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime())

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-shrink-0">
        <p className="text-sm text-muted-foreground">
          {tasks.length} task(s){unacknowledged.length > 0 && ` · ${unacknowledged.length} unacknowledged`}
        </p>
        <div className="flex gap-2">
          <CanChange type="paperlessTask">
            {unacknowledged.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void dismissAll()}
                disabled={dismissing}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />Dismiss All
              </Button>
            )}
          </CanChange>
          <Button variant="outline" size="sm" onClick={fetchTasks}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" />Refresh
          </Button>
        </div>
      </div>

      {sortedTasks.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          No background tasks
        </div>
      ) : (
        <div className="rounded-md border overflow-auto flex-1">
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Status</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTasks.map((task) => {
                const config = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.PENDING
                const StatusIcon = config.icon
                return (
                  <TableRow key={task.id} className={task.acknowledged ? "opacity-50" : ""}>
                    <TableCell>
                      <Badge variant={config.variant} className="text-xs gap-1">
                        <StatusIcon className={`h-3 w-3 ${task.status === "STARTED" ? "animate-spin" : ""}`} />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {task.task_file_name || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[120px] truncate">
                      {task.type || task.task_id?.split("-")[0] || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(task.date_created).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {task.date_done ? new Date(task.date_done).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[250px] truncate" title={task.result || ""}>
                      {task.result || "—"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )
}
