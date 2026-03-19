"use client"

import * as React from "react"
import { useAtom, useSetAtom } from "jotai"
import { useRouter } from "next/navigation"
import {
  Bell,
  CheckCheck,
  Check,
  CircleAlert,
  ExternalLink,
  FileText,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  clearNotificationsAtom,
  markAllNotificationsReadAtom,
  markNotificationReadAtom,
  notificationsAtom,
  suppressNotificationToastsAtom,
  unreadNotificationCountAtom,
  type UiNotification,
} from "@/lib/stores/notifications"
import { useOpenDocumentNavigation } from "@/hooks/use-open-document-navigation"

function formatNotificationTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Unknown time"
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date)
}

function getNotificationIcon(notification: UiNotification) {
  switch (notification.kind) {
    case "document-consumed":
    case "document-updated":
    case "document-deleted":
      return <FileText className="mt-0.5 size-4 shrink-0" />
    case "document-failed":
      return <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
    case "document-detected":
      return <RefreshCw className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
    default:
      return <Bell className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
  }
}

export function NotificationCenter() {
  const [notifications] = useAtom(notificationsAtom)
  const [unreadCount] = useAtom(unreadNotificationCountAtom)
  const clearNotifications = useSetAtom(clearNotificationsAtom)
  const markAllRead = useSetAtom(markAllNotificationsReadAtom)
  const markNotificationRead = useSetAtom(markNotificationReadAtom)
  const setSuppressNotificationToasts = useSetAtom(suppressNotificationToastsAtom)
  const navigateToDocument = useOpenDocumentNavigation()
  const router = useRouter()
  const [hasMounted, setHasMounted] = React.useState(false)

  React.useEffect(() => {
    setHasMounted(true)
  }, [])

  const handleOpenNotification = (notification: UiNotification) => {
    markNotificationRead(notification.id)

    if (notification.documentId && notification.href?.startsWith("/documents/")) {
      navigateToDocument({
        documentId: notification.documentId,
        href: notification.href,
        title: notification.title,
      })
      return
    }

    if (notification.href) {
      router.push(notification.href)
    }
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        setSuppressNotificationToasts(open)
        if (open && hasMounted) {
          markAllRead()
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          aria-label="Open notifications"
        >
          <Bell className="size-4" />
          {hasMounted && unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-[20px] px-1 text-[10px] leading-none"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0 text-foreground">
            Notifications
          </DropdownMenuLabel>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => markAllRead()}
              disabled={notifications.length === 0 || unreadCount === 0}
            >
              <CheckCheck className="size-3.5" />
              Read
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => clearNotifications()}
              disabled={notifications.length === 0}
            >
              <Trash2 className="size-3.5" />
              Clear
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator />
        {!hasMounted || notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          notifications.map((notification) => (
            <React.Fragment key={notification.id}>
              <DropdownMenuItem
                className="flex cursor-default gap-3 py-2.5"
                onSelect={(event) => {
                  event.preventDefault()
                  if (notification.href) {
                    handleOpenNotification(notification)
                  } else {
                    markNotificationRead(notification.id)
                  }
                }}
              >
                {getNotificationIcon(notification)}
                <div className="min-w-0 flex-1">
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="font-medium text-foreground">
                      {notification.title}
                    </span>
                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <span className="size-2 rounded-full bg-primary" />
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {formatNotificationTime(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {notification.message}
                  </p>
                  {notification.href && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-primary">
                      <ExternalLink className="size-3" />
                      <span>{notification.actionLabel ?? "Open"}</span>
                    </div>
                  )}
                </div>
                {!notification.read && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      markNotificationRead(notification.id)
                    }}
                    aria-label={`Mark ${notification.title} as read`}
                  >
                    <Check className="size-3.5" />
                  </Button>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </React.Fragment>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
