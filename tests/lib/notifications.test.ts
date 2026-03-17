import { describe, expect, it } from "vitest"
import {
  defaultNotificationPreferences,
  getRealtimeNotificationDispatch,
  mapNotificationPreferences,
} from "@/lib/notifications"

describe("notifications", () => {
  it("maps NGX-compatible and legacy notification preference keys", () => {
    expect(
      mapNotificationPreferences({
        notifications_consumer_failed: false,
        notifications_consumer_new_document: false,
        notifications_consumer_suppress_on_dashboard: false,
        notifications_document_added: false,
        notifications_document_updated: true,
      })
    ).toEqual({
      consumerFailed: false,
      consumerNewDocument: false,
      consumerSuccess: false,
      documentUpdated: true,
      suppressOnDashboard: false,
    })
  })

  it("builds actionable success notifications for consumed documents", () => {
    const dispatch = getRealtimeNotificationDispatch(
      {
        documentId: 42,
        filename: "invoice.pdf",
        kind: "document-consumed",
      },
      defaultNotificationPreferences
    )

    expect(dispatch).toMatchObject({
      notification: {
        actionLabel: "Open document",
        documentId: 42,
        href: "/documents/42",
        kind: "document-consumed",
        level: "success",
      },
      toastLevel: "success",
    })
  })

  it("suppresses disabled notification types", () => {
    const dispatch = getRealtimeNotificationDispatch(
      {
        documentId: 99,
        kind: "document-updated",
      },
      {
        ...defaultNotificationPreferences,
        documentUpdated: false,
      }
    )

    expect(dispatch).toBeNull()
  })
})
