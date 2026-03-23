import { describe, expect, it, vi, afterEach } from "vitest"
import {
  hasSystemStatusErrors,
  isStatusStale,
  maintenanceTaskLabels,
  type SystemStatus,
} from "@/lib/system-status"

function makeStatus(
  overrides: Partial<{
    database: SystemStatus["database"]["status"]
    redis: SystemStatus["tasks"]["redis_status"]
    celery: SystemStatus["tasks"]["celery_status"]
    index: SystemStatus["tasks"]["index_status"]
    classifier: SystemStatus["tasks"]["classifier_status"]
    sanityCheck: SystemStatus["tasks"]["sanity_check_status"]
    llmindex: SystemStatus["tasks"]["llmindex_status"]
  }> = {}
): SystemStatus {
  return {
    database: {
      status: overrides.database ?? "OK",
      type: "postgresql",
      url: "localhost",
      migration_status: { latest_migration: "0001", unapplied_migrations: [] },
    },
    install_type: "docker",
    pngx_version: "2.0.0",
    server_os: "Linux",
    storage: { available: 1000, total: 2000 },
    tasks: {
      celery_status: overrides.celery ?? "OK",
      classifier_status: overrides.classifier ?? "OK",
      index_status: overrides.index ?? "OK",
      llmindex_status: overrides.llmindex ?? "OK",
      redis_status: overrides.redis ?? "OK",
      sanity_check_status: overrides.sanityCheck ?? "OK",
    },
  }
}

describe("hasSystemStatusErrors", () => {
  it("returns false when all statuses are OK", () => {
    expect(hasSystemStatusErrors(makeStatus())).toBe(false)
  })

  it("detects database error", () => {
    expect(hasSystemStatusErrors(makeStatus({ database: "ERROR" }))).toBe(true)
  })

  it("detects redis error", () => {
    expect(hasSystemStatusErrors(makeStatus({ redis: "ERROR" }))).toBe(true)
  })

  it("detects celery error", () => {
    expect(hasSystemStatusErrors(makeStatus({ celery: "ERROR" }))).toBe(true)
  })

  it("detects index error", () => {
    expect(hasSystemStatusErrors(makeStatus({ index: "ERROR" }))).toBe(true)
  })

  it("detects classifier error", () => {
    expect(hasSystemStatusErrors(makeStatus({ classifier: "ERROR" }))).toBe(
      true
    )
  })

  it("detects sanity check error", () => {
    expect(hasSystemStatusErrors(makeStatus({ sanityCheck: "ERROR" }))).toBe(
      true
    )
  })

  it("detects llm index error", () => {
    expect(hasSystemStatusErrors(makeStatus({ llmindex: "ERROR" }))).toBe(true)
  })

  it("ignores WARNING and DISABLED statuses", () => {
    expect(
      hasSystemStatusErrors(
        makeStatus({ database: "WARNING", redis: "DISABLED" })
      )
    ).toBe(false)
  })
})

describe("isStatusStale", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns false for null or undefined", () => {
    expect(isStatusStale(null)).toBe(false)
    expect(isStatusStale(undefined)).toBe(false)
  })

  it("returns false for an invalid date string", () => {
    expect(isStatusStale("not-a-date")).toBe(false)
  })

  it("returns false for a recent timestamp", () => {
    const now = new Date().toISOString()
    expect(isStatusStale(now)).toBe(false)
  })

  it("returns true when the timestamp exceeds the default 7-day threshold", () => {
    vi.useFakeTimers()
    const eightDaysAgo = new Date(
      Date.now() - 8 * 24 * 60 * 60 * 1000
    ).toISOString()
    expect(isStatusStale(eightDaysAgo)).toBe(true)
  })

  it("respects a custom maxAgeDays", () => {
    vi.useFakeTimers()
    const twoDaysAgo = new Date(
      Date.now() - 2 * 24 * 60 * 60 * 1000
    ).toISOString()
    expect(isStatusStale(twoDaysAgo, 1)).toBe(true)
    expect(isStatusStale(twoDaysAgo, 3)).toBe(false)
  })
})

describe("maintenanceTaskLabels", () => {
  it("provides human-readable labels for all maintenance tasks", () => {
    expect(Object.keys(maintenanceTaskLabels)).toEqual(
      expect.arrayContaining([
        "check_sanity",
        "index_optimize",
        "llmindex_update",
        "train_classifier",
      ])
    )
  })
})
