"use client"

import * as React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { CanChange } from "@/components/permissions/can-change"
import { CanView } from "@/components/permissions/can-view"
import { OpenDocumentLink } from "@/components/open-document-link"
import { TaskProgress } from "@/components/tasks/task-progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { useAsyncAction } from "@/hooks/use-async-action"
import { toErrorMessage } from "@/lib/errors"
import { getJson, postJson, withQuery } from "@/lib/paperless-client"
import {
  normalizeTaskProgress,
  tabStatusForTaskTab,
  type NormalizedPaperlessTask,
  type NormalizedTaskPage,
  type TaskStatusCounts,
  type TaskSummaryItem,
} from "@/lib/paperless-tasks"
import {
  activeRealtimeTasksAtom,
  latestRealtimeEventAtom,
} from "@/lib/stores/realtime"
import { setPendingTaskCountAtom } from "@/lib/stores/tasks"

type TaskTab = "queued" | "started" | "completed" | "failed"
type FilterTarget = "name" | "result"

const PAGE_SIZE = 25

const STATUS_CONFIG: Record<
  string,
  {
    icon: React.ElementType
    label: string
    variant: "default" | "secondary" | "destructive" | "outline"
  }
> = {
  FAILURE: { label: "Failed", variant: "destructive", icon: AlertTriangle },
  PENDING: { label: "Pending", variant: "secondary", icon: Clock },
  REVOKED: { label: "Revoked", variant: "secondary", icon: AlertTriangle },
  STARTED: { label: "Running", variant: "outline", icon: Loader2 },
  SUCCESS: { label: "Success", variant: "default", icon: CheckCircle },
}

function getTabLabel(tab: TaskTab) {
  switch (tab) {
    case "queued":
      return "Queued"
    case "started":
      return "Started"
    case "completed":
      return "Completed"
    case "failed":
      return "Failed"
    default: {
      const _exhaustive: never = tab
      return _exhaustive
    }
  }
}

function getDismissLabel(task: NormalizedPaperlessTask) {
  return task.status === "SUCCESS" ? "Clear from history" : "Dismiss"
}

function matchesTaskFilter(
  task: NormalizedPaperlessTask,
  filterText: string,
  filterTarget: FilterTarget
) {
  if (!filterText.trim()) return true

  const normalized = filterText.trim().toLowerCase()
  if (filterTarget === "result") {
    return (task.result ?? "").toLowerCase().includes(normalized)
  }

  return (task.task_file_name ?? "").toLowerCase().includes(normalized)
}

function emptyCounts(): TaskStatusCounts {
  return {
    pending: 0,
    started: 0,
    success: 0,
    failure: 0,
    revoked: 0,
    total: 0,
  }
}

export function TasksView() {
  const latestRealtimeEvent = useAtomValue(latestRealtimeEventAtom)
  const activeRealtimeTasks = useAtomValue(activeRealtimeTasksAtom)
  const setPendingTaskCount = useSetAtom(setPendingTaskCountAtom)
  const [activeTab, setActiveTab] = React.useState<TaskTab>("failed")
  const [autoRefreshEnabled, setAutoRefreshEnabled] = React.useState(true)
  const [filterTarget, setFilterTarget] = React.useState<FilterTarget>("name")
  const [filterText, setFilterText] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [page, setPage] = React.useState(1)
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<number[]>([])
  const [tasks, setTasks] = React.useState<NormalizedPaperlessTask[]>([])
  const [totalCount, setTotalCount] = React.useState(0)
  const [statusCounts, setStatusCounts] = React.useState<TaskStatusCounts>(emptyCounts)
  const [summary, setSummary] = React.useState<TaskSummaryItem[]>([])

  const fetchTasks = React.useCallback(async () => {
    try {
      const status = tabStatusForTaskTab(activeTab)
      const path = withQuery("/api/tasks", {
        acknowledged: "false",
        page,
        page_size: PAGE_SIZE,
        status: status.toLowerCase(),
        ordering: "-date_created",
      })
      const [pageData, counts, summaryData] = await Promise.all([
        getJson<NormalizedTaskPage>(path),
        getJson<TaskStatusCounts>("/api/tasks/status-counts"),
        getJson<TaskSummaryItem[]>("/api/tasks/summary?days=30").catch(
          () => [] as TaskSummaryItem[]
        ),
      ])

      const nextTasks = Array.isArray(pageData)
        ? (pageData as unknown as NormalizedPaperlessTask[])
        : pageData.results ?? []
      const nextCount = Array.isArray(pageData)
        ? nextTasks.length
        : pageData.count ?? nextTasks.length

      setTasks(nextTasks)
      setTotalCount(nextCount)
      setStatusCounts(counts ?? emptyCounts())
      setSummary(Array.isArray(summaryData) ? summaryData : [])
      setPendingTaskCount(
        (counts?.pending ?? 0) + (counts?.started ?? 0)
      )
    } catch (error) {
      toast.error("Failed to load tasks", {
        description: toErrorMessage(error),
      })
    } finally {
      setLoading(false)
    }
  }, [activeTab, page, setPendingTaskCount])

  React.useEffect(() => {
    void fetchTasks()
  }, [fetchTasks])

  React.useEffect(() => {
    if (!autoRefreshEnabled) return

    const interval = setInterval(() => {
      void fetchTasks()
    }, 5000)

    return () => clearInterval(interval)
  }, [autoRefreshEnabled, fetchTasks])

  React.useEffect(() => {
    if (!latestRealtimeEvent) return

    switch (latestRealtimeEvent.kind) {
      case "document-detected":
      case "document-consumed":
      case "document-failed":
      case "documents-deleted":
        void fetchTasks()
        break
      case "task-progress":
        // Progress merges from the realtime atom; avoid refetching every tick.
        break
      default:
        break
    }
  }, [fetchTasks, latestRealtimeEvent])

  const { pending: dismissing, run: dismissTasks } = useAsyncAction({
    action: async (taskIds: number[]) => {
      await postJson<{ result?: number }>("/api/tasks/acknowledge", {
        tasks: taskIds,
      })
      return { taskIds }
    },
    errorMessage: "Failed to dismiss tasks",
    onSuccess: ({ taskIds }) => {
      setTasks((prev) => prev.filter((task) => !taskIds.includes(task.id)))
      setSelectedTaskIds([])
      void fetchTasks()
    },
    successMessage: "Tasks acknowledged",
  })

  const counts = React.useMemo(
    () => ({
      completed: statusCounts.success,
      failed: statusCounts.failure + statusCounts.revoked,
      queued: statusCounts.pending,
      started: statusCounts.started,
    }),
    [statusCounts]
  )

  React.useEffect(() => {
    setSelectedTaskIds([])
    setPage(1)

    if (activeTab === "queued" || activeTab === "started") {
      setFilterTarget("name")
    }
  }, [activeTab])

  React.useEffect(() => {
    setPage(1)
  }, [filterTarget, filterText])

  const displayTasks = React.useMemo(() => {
    return tasks
      .map((task) => {
        const live = activeRealtimeTasks[task.task_id]
        if (!live) return task
        const progress =
          normalizeTaskProgress({
            current: live.currentProgress,
            max: live.maxProgress,
          }) ?? task.progress
        return {
          ...task,
          progress,
          status: live.status
            ? live.status.toUpperCase() === "FAILED"
              ? "FAILURE"
              : live.status.toUpperCase() === "WORKING"
                ? "STARTED"
                : live.status.toUpperCase()
            : task.status,
        }
      })
      .filter((task) => matchesTaskFilter(task, filterText, filterTarget))
  }, [activeRealtimeTasks, filterTarget, filterText, tasks])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const allVisibleSelected =
    displayTasks.length > 0 &&
    displayTasks.every((task) => selectedTaskIds.includes(task.id))

  const dismissButtonText =
    selectedTaskIds.length > 0 ? "Dismiss Selected" : "Dismiss All"

  const toggleSelected = React.useCallback((taskId: number, checked: boolean) => {
    setSelectedTaskIds((prev) => {
      if (checked) {
        return prev.includes(taskId) ? prev : [...prev, taskId]
      }

      return prev.filter((id) => id !== taskId)
    })
  }, [])

  const toggleAllVisible = React.useCallback(
    (checked: boolean) => {
      setSelectedTaskIds((prev) => {
        const visibleIds = displayTasks.map((task) => task.id)

        if (checked) {
          return Array.from(new Set([...prev, ...visibleIds]))
        }

        return prev.filter((id) => !visibleIds.includes(id))
      })
    },
    [displayTasks]
  )

  const handleDismiss = React.useCallback(async () => {
    const taskIds =
      selectedTaskIds.length > 0
        ? selectedTaskIds
        : displayTasks.map((task) => task.id)

    if (taskIds.length === 0) return
    await dismissTasks(taskIds)
  }, [dismissTasks, displayTasks, selectedTaskIds])

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4 flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {statusCounts.total} task(s)
            {(statusCounts.pending + statusCounts.started + statusCounts.failure) >
              0 &&
              ` · ${statusCounts.pending + statusCounts.started + statusCounts.failure} active or failed`}
            {statusCounts.success > 0 &&
              ` · ${statusCounts.success} completed history item${statusCounts.success === 1 ? "" : "s"}`}
            {selectedTaskIds.length > 0 &&
              ` · ${selectedTaskIds.length} selected`}
            {summary.length > 0 &&
              ` · ${summary.length} type${summary.length === 1 ? "" : "s"} in 30d`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={autoRefreshEnabled}
                onCheckedChange={(checked) =>
                  setAutoRefreshEnabled(Boolean(checked))
                }
                aria-label="Toggle task auto refresh"
              />
              Auto refresh
            </label>
            {selectedTaskIds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTaskIds([])}
              >
                Clear selection
              </Button>
            )}
            <CanChange type="paperlessTask">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleDismiss()}
                disabled={dismissing || displayTasks.length === 0}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                {dismissButtonText}
              </Button>
            </CanChange>
            <Button variant="outline" size="sm" onClick={() => void fetchTasks()}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filterText}
              onChange={(event) => setFilterText(event.target.value)}
              placeholder={`Filter by ${filterTarget === "name" ? "name" : "result"}...`}
              className="pl-7"
            />
          </div>
          {(activeTab === "failed" || activeTab === "completed") && (
            <Select
              value={filterTarget}
              onValueChange={(value) => setFilterTarget(value as FilterTarget)}
            >
              <SelectTrigger size="sm" className="min-w-32">
                <SelectValue placeholder="Filter target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="result">Result</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TaskTab)}
          className="gap-4"
        >
          <div className="overflow-x-auto">
            <TabsList variant="line" className="min-w-max justify-start border-b p-0">
              {(["failed", "completed", "started", "queued"] as TaskTab[]).map(
                (tab) => (
                  <TabsTrigger key={tab} value={tab} className="gap-1.5 px-3">
                    {getTabLabel(tab)}
                    {counts[tab] > 0 && (
                      <Badge
                        variant={tab === "failed" ? "destructive" : "secondary"}
                      >
                        {counts[tab]}
                      </Badge>
                    )}
                  </TabsTrigger>
                )
              )}
            </TabsList>
          </div>
          <TabsContent value={activeTab} className="m-0" />
        </Tabs>
      </div>

      {displayTasks.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          No {getTabLabel(activeTab).toLowerCase()} tasks
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-auto rounded-md border">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={(checked) =>
                        toggleAllVisible(Boolean(checked))
                      }
                      aria-label="Select all visible tasks"
                    />
                  </TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  {(activeTab === "failed" || activeTab === "completed") && (
                    <TableHead className="hidden xl:table-cell">Result</TableHead>
                  )}
                  <TableHead className="hidden lg:table-cell">Completed</TableHead>
                  <TableHead className="w-40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayTasks.map((task) => {
                  const config = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.PENDING
                  const StatusIcon = config.icon
                  const isSelected = selectedTaskIds.includes(task.id)

                  return (
                    <TableRow
                      key={task.id}
                      data-state={isSelected ? "selected" : undefined}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            toggleSelected(task.id, Boolean(checked))
                          }
                          aria-label={`Select ${task.task_file_name || task.task_id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className="gap-1 text-xs">
                          <StatusIcon
                            className={`h-3 w-3 ${task.status === "STARTED" ? "animate-spin" : ""}`}
                          />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[220px]">
                        <div className="font-medium">{task.task_file_name || "—"}</div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {task.type || task.task_name || task.task_id}
                        </div>
                        {(task.status === "STARTED" || task.status === "PENDING") && (
                          <div className="mt-1.5 max-w-xs">
                            <TaskProgress
                              current={task.progress?.current}
                              max={task.progress?.max}
                              percent={task.progress?.percent}
                              status={task.status}
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                        {new Date(task.date_created).toLocaleString()}
                      </TableCell>
                      {(activeTab === "failed" || activeTab === "completed") && (
                        <TableCell
                          className="hidden max-w-[320px] truncate text-muted-foreground xl:table-cell"
                          title={task.result || ""}
                        >
                          {task.result || "—"}
                        </TableCell>
                      )}
                      <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                        {task.date_done
                          ? new Date(task.date_done).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <CanChange type="paperlessTask">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void dismissTasks([task.id])}
                              disabled={dismissing}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              {getDismissLabel(task)}
                            </Button>
                          </CanChange>
                          <CanView type="document">
                            {task.related_document ? (
                              <Button variant="outline" size="sm" asChild>
                                <OpenDocumentLink
                                  documentId={task.related_document}
                                  title={task.task_file_name || `Document ${task.related_document}`}
                                >
                                  <ExternalLink className="mr-1 h-3.5 w-3.5" />
                                  Open
                                </OpenDocumentLink>
                              </Button>
                            ) : null}
                          </CanView>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="text-sm text-muted-foreground">
              {totalCount} {getTabLabel(activeTab).toLowerCase()} task(s)
            </p>
            {totalPages > 1 && (
              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault()
                        setPage((current) => Math.max(1, current - 1))
                      }}
                      aria-disabled={page === 1}
                      className={page === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, index) => {
                    const pageNumber =
                      totalPages <= 7
                        ? index + 1
                        : Math.min(
                            Math.max(page - 3, 1) + index,
                            totalPages
                          )
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          href="#"
                          isActive={pageNumber === page}
                          onClick={(event) => {
                            event.preventDefault()
                            setPage(pageNumber)
                          }}
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  })}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(event) => {
                        event.preventDefault()
                        setPage((current) => Math.min(totalPages, current + 1))
                      }}
                      aria-disabled={page === totalPages}
                      className={
                        page === totalPages ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </>
      )}
    </>
  )
}
