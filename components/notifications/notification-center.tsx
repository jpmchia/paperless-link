"use client"

import * as React from "react"
import { useAtom, useSetAtom } from "jotai"
import { Bell, CheckCheck } from "lucide-react"
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
  notificationsAtom,
} from "@/lib/stores/notifications"

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

export function NotificationCenter() {
  const [notifications] = useAtom(notificationsAtom)
  const clearNotifications = useSetAtom(clearNotificationsAtom)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          aria-label="Open notifications"
        >
          <Bell className="size-4" />
          {notifications.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-[20px] px-1 text-[10px] leading-none"
            >
              {notifications.length > 9 ? "9+" : notifications.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0 text-foreground">
            Notifications
          </DropdownMenuLabel>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={() => clearNotifications()}
            disabled={notifications.length === 0}
          >
            <CheckCheck className="size-3.5" />
            Clear
          </Button>
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          notifications.map((notification) => (
            <React.Fragment key={notification.id}>
              <DropdownMenuItem
                className="flex cursor-default flex-col items-start gap-1 py-2.5"
                onSelect={(event) => event.preventDefault()}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {notification.title}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatNotificationTime(notification.createdAt)}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {notification.message}
                </p>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </React.Fragment>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
