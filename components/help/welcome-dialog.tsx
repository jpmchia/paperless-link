"use client"

import Link from "next/link"
import * as React from "react"
import {
  Files,
  Keyboard,
  LayoutDashboard,
  LayoutList,
  UserRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface WelcomeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinue: () => void | Promise<void>
  onDismiss: () => void | Promise<void>
  onOpenShortcutHelp: () => void
  saving?: boolean
}

const welcomeLinks = [
  {
    href: "/dashboard",
    title: "Upload documents",
    description: "Head to the dashboard upload widget to add files quickly.",
    icon: LayoutDashboard,
  },
  {
    href: "/documents",
    title: "Browse documents",
    description: "Search, filter, and manage your document library.",
    icon: Files,
  },
  {
    href: "/savedviews",
    title: "Saved views",
    description: "Return to your most useful document filters in one click.",
    icon: LayoutList,
  },
  {
    href: "/profile",
    title: "Profile and preferences",
    description: "Adjust display, search, and notification defaults.",
    icon: UserRound,
  },
]

export function WelcomeDialog({
  open,
  onOpenChange,
  onContinue,
  onDismiss,
  onOpenShortcutHelp,
  saving = false,
}: WelcomeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Welcome to Paperless-Link</DialogTitle>
          <DialogDescription>
            Start with the places you will use most often, then keep the
            shortcut reference nearby whenever you need it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {welcomeLinks.map((item) => (
            <Button
              key={item.title}
              asChild
              variant="outline"
              className="h-auto items-start justify-start px-3 py-3 text-left"
            >
              <Link href={item.href} onClick={() => onOpenChange(false)}>
                <item.icon className="mt-0.5 size-4 shrink-0" />
                <span className="space-y-1">
                  <span className="block text-sm font-medium">
                    {item.title}
                  </span>
                  <span className="block text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </Link>
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            className="h-auto items-start justify-start px-3 py-3 text-left"
            onClick={() => {
              onOpenChange(false)
              onOpenShortcutHelp()
            }}
          >
            <Keyboard className="mt-0.5 size-4 shrink-0" />
            <span className="space-y-1">
              <span className="block text-sm font-medium">
                Keyboard shortcuts
              </span>
              <span className="block text-muted-foreground">
                Review the shortcuts available across the app and documents
                workspace.
              </span>
            </span>
          </Button>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => void onDismiss()}
          >
            Dismiss
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => void onContinue()}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
