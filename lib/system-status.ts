export type SystemStatusLevel = "OK" | "ERROR" | "WARNING" | "DISABLED"

export interface SystemStatus {
  database: {
    error?: string
    migration_status: {
      latest_migration: string
      unapplied_migrations: string[]
    }
    status: SystemStatusLevel
    type: string
    url: string
  }
  install_type: string
  pngx_version: string
  server_os: string
  storage: {
    available: number
    total: number
  }
  tasks: {
    celery_error?: string
    celery_status: SystemStatusLevel
    celery_url?: string
    classifier_error?: string
    classifier_last_trained?: string
    classifier_status: SystemStatusLevel
    index_error?: string
    index_last_modified?: string
    index_status: SystemStatusLevel
    llmindex_error?: string
    llmindex_last_modified?: string
    llmindex_status?: SystemStatusLevel
    redis_error?: string
    redis_status: SystemStatusLevel
    redis_url?: string
    sanity_check_error?: string
    sanity_check_last_run?: string
    sanity_check_status: SystemStatusLevel
  }
}

export type MaintenanceTaskName =
  | "index_optimize"
  | "train_classifier"
  | "check_sanity"
  | "llmindex_update"

export const maintenanceTaskLabels: Record<MaintenanceTaskName, string> = {
  check_sanity: "Run sanity check",
  index_optimize: "Optimize search index",
  llmindex_update: "Update LLM index",
  train_classifier: "Train classifier",
}

export function hasSystemStatusErrors(status: SystemStatus) {
  return (
    status.database.status === "ERROR" ||
    status.tasks.redis_status === "ERROR" ||
    status.tasks.celery_status === "ERROR" ||
    status.tasks.index_status === "ERROR" ||
    status.tasks.classifier_status === "ERROR" ||
    status.tasks.sanity_check_status === "ERROR" ||
    status.tasks.llmindex_status === "ERROR"
  )
}

export function isStatusStale(value?: string | null, maxAgeDays = 7) {
  if (!value) return false
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return false
  return Date.now() - timestamp > maxAgeDays * 24 * 60 * 60 * 1000
}
