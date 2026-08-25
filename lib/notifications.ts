import type { RealtimeEvent } from "@/lib/realtime/events"
import type { UiNotification } from "@/lib/stores/notifications"
import {
  defaultNotificationPreferences,
  readUserPreferences,
  type UserNotificationPreferences,
} from "@/lib/user-preferences"

export type NotificationLevel = "info" | "success" | "error"

export type NotificationPreferences = UserNotificationPreferences
export { defaultNotificationPreferences }

export function mapNotificationPreferences(
  settings?: Record<string, unknown> | null
): NotificationPreferences {
  return readUserPreferences(settings).notifications
}

export interface RealtimeNotificationDispatch {
  notification: Omit<UiNotification, "createdAt" | "id" | "read">
  toastLevel: NotificationLevel
}

export function getRealtimeNotificationDispatch(
  event: RealtimeEvent,
  preferences: NotificationPreferences
): RealtimeNotificationDispatch | null {
  switch (event.kind) {
    case "document-detected":
      if (!preferences.consumerNewDocument) {
        return null
      }

      return {
        notification: {
          kind: "document-detected",
          level: "info",
          message: event.filename
            ? `${event.filename} is being processed.`
            : "A new document is being processed.",
          source: "realtime",
          title: "Document detected",
        },
        toastLevel: "info",
      }

    case "document-consumed":
      if (!preferences.consumerSuccess) {
        return null
      }

      return {
        notification: {
          actionLabel: event.documentId ? "Open document" : undefined,
          dedupeKey: event.documentId
            ? `document-consumed:${event.documentId}`
            : `document-consumed:${event.filename ?? "unknown"}`,
          documentId: event.documentId,
          href: event.documentId ? `/documents/${event.documentId}` : undefined,
          kind: "document-consumed",
          level: "success",
          message: event.filename
            ? `${event.filename} was added to Paperless Link.`
            : "A document was added to Paperless Link.",
          source: "realtime",
          title: "Document consumed",
        },
        toastLevel: "success",
      }

    case "document-failed":
      if (!preferences.consumerFailed) {
        return null
      }

      return {
        notification: {
          dedupeKey: `document-failed:${event.filename ?? event.message ?? "unknown"}`,
          kind: "document-failed",
          level: "error",
          message:
            event.filename && event.message
              ? `Could not add ${event.filename}: ${event.message}`
              : event.message ??
                event.filename ??
                "A document failed to process.",
          source: "realtime",
          title: "Document failed",
        },
        toastLevel: "error",
      }

    case "document-updated":
      if (!preferences.documentUpdated) {
        return null
      }

      return {
        notification: {
          actionLabel: "Open document",
          dedupeKey: `document-updated:${event.documentId}`,
          documentId: event.documentId,
          href: `/documents/${event.documentId}`,
          kind: "document-updated",
          level: "info",
          message: `Document #${event.documentId} was updated.`,
          source: "realtime",
          title: "Document updated",
        },
        toastLevel: "info",
      }

    case "document-deleted":
      return {
        notification: {
          dedupeKey: `document-deleted:${event.documentId}`,
          kind: "document-deleted",
          level: "info",
          message: `Document #${event.documentId} was deleted.`,
          source: "realtime",
          title: "Document deleted",
        },
        toastLevel: "info",
      }

    default:
      return null
  }
}
