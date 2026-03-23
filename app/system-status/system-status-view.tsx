"use client"

import * as React from "react"
import { useAtomValue } from "jotai"
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  ClipboardCheck,
  Loader2,
  Play,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getJson, postJson } from "@/lib/paperless-client"
import {
  activeRealtimeTasksAtom,
  latestRealtimeEventAtom,
  realtimeConnectionAtom,
} from "@/lib/stores/realtime"
import {
  hasSystemStatusErrors,
  isStatusStale,
  maintenanceTaskLabels,
  type MaintenanceTaskName,
  type SystemStatus,
  type SystemStatusLevel,
} from "@/lib/system-status"

function formatDateTime(value?: string | null) {
  if (!value) return "Never"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown"
  return date.toLocaleString()
}

function formatBytes(value?: number) {
  if (typeof value !== "number" || value < 0) return "Unknown"
  if (value === 0) return "0 B"

  const units = ["B", "KB", "MB", "GB", "TB"]
  let size = value
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function formatPercent(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0%"
  return `${Math.round(value)}%`
}

function StatusBadge({ status }: { status?: SystemStatusLevel | string }) {
  if (!status) {
    return <Badge variant="outline">Unknown</Badge>
  }

  if (status === "OK") {
    return (
      <Badge variant="outline" className="gap-1 text-emerald-700">
        <CheckCircle2 className="size-3.5" />
        {status}
      </Badge>
    )
  }

  return (
    <Badge
      variant={status === "DISABLED" ? "secondary" : "destructive"}
      className="gap-1"
    >
      <AlertTriangle className="size-3.5" />
      {status}
    </Badge>
  )
}

function Metric({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm">{children}</div>
    </div>
  )
}

function ErrorText({ children }: { children?: React.ReactNode }) {
  if (!children) return null

  return (
    <p className="text-xs leading-relaxed text-destructive/90">
      {children}
    </p>
  )
}

function SectionCard({
  action,
  children,
  title,
}: {
  action?: React.ReactNode
  children: React.ReactNode
  title: string
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function SystemStatusView({
  canRunTasks,
  frontendVersion,
  initialStatus,
}: {
  canRunTasks: boolean
  frontendVersion: string
  initialStatus: SystemStatus | null
}) {
  const realtimeConnection = useAtomValue(realtimeConnectionAtom)
  const latestRealtimeEvent = useAtomValue(latestRealtimeEventAtom)
  const activeRealtimeTasks = useAtomValue(activeRealtimeTasksAtom)
  const [runningTask, setRunningTask] =
    React.useState<MaintenanceTaskName | null>(null)
  const [refreshing, setRefreshing] = React.useState(false)
  const [status, setStatus] = React.useState<SystemStatus | null>(initialStatus)
  const [copied, setCopied] = React.useState(false)
  const [lastRefreshedAt, setLastRefreshedAt] = React.useState<string | null>(
    initialStatus ? new Date().toISOString() : null
  )
  const lastAutoRefreshAtRef = React.useRef(0)
  const previousConnectionRef =
    React.useRef<typeof realtimeConnection>(realtimeConnection)

  const refreshStatus = React.useCallback(async () => {
    setRefreshing(true)
    try {
      const nextStatus = await getJson<SystemStatus>("/api/system-status")
      setStatus(nextStatus)
      setLastRefreshedAt(new Date().toISOString())
    } catch (error) {
      toast.error("Failed to refresh system status", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setRefreshing(false)
    }
  }, [])

  const runTask = React.useCallback(
    async (taskName: MaintenanceTaskName) => {
      setRunningTask(taskName)
      try {
        await postJson("/api/tasks/run", {
          task_name: taskName,
        })
        toast.success(`${maintenanceTaskLabels[taskName]} started`)
        await refreshStatus()
      } catch (error) {
        toast.error(`Failed to start ${maintenanceTaskLabels[taskName]}`, {
          description: error instanceof Error ? error.message : "Unknown error",
        })
      } finally {
        setRunningTask(null)
      }
    },
    [refreshStatus]
  )

  const activeTaskList = React.useMemo(
    () =>
      Object.values(activeRealtimeTasks).sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      ),
    [activeRealtimeTasks]
  )

  const copyStatus = React.useCallback(async () => {
    if (!status) return

    try {
      await navigator.clipboard.writeText(JSON.stringify(status, null, 2))
      setCopied(true)
      toast.success("System status copied")
      window.setTimeout(() => setCopied(false), 3000)
    } catch (error) {
      toast.error("Failed to copy system status", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }, [status])

  React.useEffect(() => {
    const previousConnection = previousConnectionRef.current
    previousConnectionRef.current = realtimeConnection

    if (
      realtimeConnection === "connected" &&
      previousConnection !== "connected" &&
      !refreshing
    ) {
      lastAutoRefreshAtRef.current = Date.now()
      void refreshStatus()
    }
  }, [realtimeConnection, refreshStatus, refreshing])

  React.useEffect(() => {
    if (!latestRealtimeEvent || refreshing) return

    switch (latestRealtimeEvent.kind) {
      case "task-progress":
      case "document-detected":
      case "document-consumed":
      case "document-failed":
        break
      default:
        return
    }

    const now = Date.now()
    if (now - lastAutoRefreshAtRef.current < 1500) return

    lastAutoRefreshAtRef.current = now
    void refreshStatus()
  }, [latestRealtimeEvent, refreshStatus, refreshing])

  if (!status) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <p className="text-sm">System status is unavailable.</p>
          <p className="mt-1 text-xs">
            The backend may not expose the status endpoint on this Paperless
            version.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void refreshStatus()}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const versionMismatch =
    frontendVersion !== "unknown" && frontendVersion !== status.pngx_version
  const usedStorage = Math.max(
    0,
    (status.storage.total ?? 0) - (status.storage.available ?? 0)
  )
  const storagePercent =
    status.storage.total > 0 ? (usedStorage / status.storage.total) * 100 : 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={hasSystemStatusErrors(status) ? "destructive" : "outline"}>
            {hasSystemStatusErrors(status) ? "Issues detected" : "Healthy"}
          </Badge>
          {versionMismatch && <Badge variant="secondary">Version mismatch</Badge>}
          {lastRefreshedAt && (
            <Badge variant="outline">
              Refreshed {formatDateTime(lastRefreshedAt)}
            </Badge>
          )}
          <Badge
            variant={realtimeConnection === "connected" ? "outline" : "secondary"}
            className="gap-1"
          >
            {realtimeConnection === "connected" ? (
              <Wifi className="size-3.5" />
            ) : (
              <WifiOff className="size-3.5" />
            )}
            Realtime {realtimeConnection}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void copyStatus()}>
            {copied ? (
              <ClipboardCheck className="mr-2 size-4" />
            ) : (
              <Clipboard className="mr-2 size-4" />
            )}
            {copied ? "Copied" : "Copy JSON"}
          </Button>
          <Button
            variant="outline"
            onClick={() => void refreshStatus()}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Environment">
          <div className="grid gap-4 sm:grid-cols-2">
            <Metric label="Frontend version">{frontendVersion}</Metric>
            <Metric label="Backend version">
              <div className="flex items-center gap-2">
                <span>{status.pngx_version}</span>
                {versionMismatch && (
                  <Badge variant="secondary" className="text-[10px]">
                    check deployment
                  </Badge>
                )}
              </div>
            </Metric>
            <Metric label="Install type">{status.install_type}</Metric>
            <Metric label="Server OS">{status.server_os}</Metric>
            <div className="space-y-2 sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Media storage
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${Math.max(0, Math.min(storagePercent, 100))}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{formatBytes(status.storage.available)} available</span>
                <span className="text-muted-foreground">
                  {formatBytes(status.storage.total)} total · {formatPercent(storagePercent)} used
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Realtime Activity">
          <div className="mb-4 flex items-center gap-2 text-sm">
            <Server className="size-4 text-muted-foreground" />
            <span>{activeTaskList.length} active realtime task(s)</span>
          </div>
          {activeTaskList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active realtime tasks are being tracked right now.
            </p>
          ) : (
            <div className="space-y-3">
              {activeTaskList.slice(0, 5).map((task) => {
                const percent =
                  task.currentProgress != null &&
                  task.maxProgress != null &&
                  task.maxProgress > 0
                    ? Math.min(
                        100,
                        Math.round((task.currentProgress / task.maxProgress) * 100)
                      )
                    : null

                return (
                  <Card key={task.taskId} size="sm" className="bg-muted/30 shadow-none">
                    <CardContent>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">
                          {task.filename || task.taskId}
                        </span>
                        <Badge variant="secondary">{task.status || "WORKING"}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {task.message || "Processing document"}
                      </p>
                      {percent != null && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Progress: {percent}%
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Database">
          <div className="grid gap-4 sm:grid-cols-2">
            <Metric label="Type">{status.database.type}</Metric>
            <Metric label="Status">
              <StatusBadge status={status.database.status} />
            </Metric>
            <Metric label="Connection">{status.database.url}</Metric>
            <Metric label="Latest migration">
              {status.database.migration_status.latest_migration}
            </Metric>
            <Metric label="Pending migrations">
              {status.database.migration_status.unapplied_migrations.length}
            </Metric>
            {status.database.error && (
              <Metric label="Database error">{status.database.error}</Metric>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Queue and Health"
          action={
            canRunTasks ? <Badge variant="outline">Maintenance actions enabled</Badge> : null
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Metric label="Redis">
              <div className="space-y-2">
                <StatusBadge status={status.tasks.redis_status} />
                {status.tasks.redis_url && (
                  <p className="text-xs text-muted-foreground">
                    {status.tasks.redis_url}
                  </p>
                )}
                <ErrorText>{status.tasks.redis_error}</ErrorText>
              </div>
            </Metric>
            <Metric label="Celery">
              <div className="space-y-2">
                <StatusBadge status={status.tasks.celery_status} />
                {status.tasks.celery_url && (
                  <p className="text-xs text-muted-foreground">
                    {status.tasks.celery_url}
                  </p>
                )}
                <ErrorText>{status.tasks.celery_error}</ErrorText>
              </div>
            </Metric>
            <Metric label="WebSocket connection">
              <div className="space-y-2">
                <StatusBadge
                  status={realtimeConnection === "connected" ? "OK" : "ERROR"}
                />
                <p className="text-xs text-muted-foreground">
                  {realtimeConnection === "connected"
                    ? "Realtime channel connected"
                    : "Realtime channel unavailable"}
                </p>
              </div>
            </Metric>
            <Metric label="Index">
              <div className="space-y-2">
                <StatusBadge status={status.tasks.index_status} />
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(status.tasks.index_last_modified)}
                  {isStatusStale(status.tasks.index_last_modified) && " · stale"}
                </p>
                <ErrorText>{status.tasks.index_error}</ErrorText>
                {canRunTasks && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void runTask("index_optimize")}
                    disabled={runningTask !== null}
                  >
                    {runningTask === "index_optimize" ? (
                      <Loader2 className="mr-2 size-3.5 animate-spin" />
                    ) : (
                      <Play className="mr-2 size-3.5" />
                    )}
                    {maintenanceTaskLabels.index_optimize}
                  </Button>
                )}
              </div>
            </Metric>
            <Metric label="Classifier">
              <div className="space-y-2">
                <StatusBadge status={status.tasks.classifier_status} />
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(status.tasks.classifier_last_trained)}
                  {isStatusStale(status.tasks.classifier_last_trained) && " · stale"}
                </p>
                <ErrorText>{status.tasks.classifier_error}</ErrorText>
                {canRunTasks && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void runTask("train_classifier")}
                    disabled={runningTask !== null}
                  >
                    {runningTask === "train_classifier" ? (
                      <Loader2 className="mr-2 size-3.5 animate-spin" />
                    ) : (
                      <Play className="mr-2 size-3.5" />
                    )}
                    {maintenanceTaskLabels.train_classifier}
                  </Button>
                )}
              </div>
            </Metric>
            <Metric label="Sanity check">
              <div className="space-y-2">
                <StatusBadge status={status.tasks.sanity_check_status} />
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(status.tasks.sanity_check_last_run)}
                  {isStatusStale(status.tasks.sanity_check_last_run) && " · stale"}
                </p>
                <ErrorText>{status.tasks.sanity_check_error}</ErrorText>
                {canRunTasks && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void runTask("check_sanity")}
                    disabled={runningTask !== null}
                  >
                    {runningTask === "check_sanity" ? (
                      <Loader2 className="mr-2 size-3.5 animate-spin" />
                    ) : (
                      <Play className="mr-2 size-3.5" />
                    )}
                    {maintenanceTaskLabels.check_sanity}
                  </Button>
                )}
              </div>
            </Metric>
            {status.tasks.llmindex_status && (
              <Metric label="LLM index">
                <div className="space-y-2">
                  <StatusBadge status={status.tasks.llmindex_status} />
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(status.tasks.llmindex_last_modified)}
                    {isStatusStale(status.tasks.llmindex_last_modified) &&
                      " · stale"}
                  </p>
                  <ErrorText>{status.tasks.llmindex_error}</ErrorText>
                  {canRunTasks && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void runTask("llmindex_update")}
                      disabled={runningTask !== null}
                    >
                      {runningTask === "llmindex_update" ? (
                        <Loader2 className="mr-2 size-3.5 animate-spin" />
                      ) : (
                        <Play className="mr-2 size-3.5" />
                      )}
                      {maintenanceTaskLabels.llmindex_update}
                    </Button>
                  )}
                </div>
              </Metric>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
