"use client"

import * as React from "react"
import { PanelRightOpen, PanelRightClose } from "lucide-react"
import { GlobalSearch } from "@/components/global-search/global-search"
import { HelpMenu } from "@/components/help/help-menu"
import { LinkIQConnectionStatus } from "@/components/link-iq-connection-status"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { ShellStatus } from "@/components/shell-status"
import { Button } from "@/components/ui/button"

type SavedViewEntry = {
  id: number
  name: string
  show_in_sidebar: boolean
}

type AgentRailLayoutProps = {
  sidebarTrigger?: React.ReactNode
  topbar?: React.ReactNode
  children: React.ReactNode
  savedViews: SavedViewEntry[]
  showGlobalControls?: boolean
  initialTourComplete?: boolean
  showAgentRailToggle?: boolean
  /** Reserved for agent-rail session scoping (unused until agent rail lands). */
  agentSurface?: "main" | "dataroom"
  /** Reserved for dataroom-scoped agent sessions (unused until agent rail lands). */
  dataroomSlug?: string | null
}

export function AgentRailLayout({
  sidebarTrigger,
  topbar,
  children,
  savedViews,
  showGlobalControls = true,
  initialTourComplete = true,
  showAgentRailToggle = true,
}: AgentRailLayoutProps) {
  const [isRailOpen, setIsRailOpen] = React.useState(false)
  const sidebarTriggerNodes = React.useMemo(
    () => React.Children.toArray(sidebarTrigger),
    [sidebarTrigger]
  )
  const topbarNodes = React.useMemo(
    () => React.Children.toArray(topbar),
    [topbar]
  )
  const contentNodes = React.useMemo(
    () => React.Children.toArray(children),
    [children]
  )

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-15 shrink-0 items-center justify-between gap-2 bg-transparent px-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex w-full min-w-0 items-center">
            {sidebarTriggerNodes}
            <div className="min-w-0 flex-1 ml-4">{topbarNodes}</div>
            {showGlobalControls ? (
              <div className="flex items-center gap-4">
                <GlobalSearch savedViews={savedViews} />
                <HelpMenu initialTourComplete={initialTourComplete} />
                <LinkIQConnectionStatus />
                <ShellStatus />
                <NotificationCenter />
                {showAgentRailToggle ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Toggle agent rail"
                    onClick={() => setIsRailOpen((previous) => !previous)}
                  >
                    {isRailOpen ? (
                      <PanelRightClose className="size-4" />
                    ) : (
                      <PanelRightOpen className="size-4" />
                    )}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>
        <main className="mb-[1.25rem] flex h-[calc(100vh-2rem)] min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-muted bg-background inset-shadow-xl">
          {contentNodes}
        </main>
      </div>
      {showAgentRailToggle ? (
        <aside
          className={`h-full shrink-0 border-l bg-sidebar text-sidebar-foreground transition-all duration-200 ${
            isRailOpen ? "w-80" : "w-0 overflow-hidden border-l-0"
          }`}
        >
          <div className="h-full p-3">
            <div className="rounded-md border border-sidebar-border/60 bg-sidebar-accent/30 p-3">
              <p className="text-sm font-medium">AI Agent</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Agent interface renders here. This rail is available only on
                authenticated AppShell screens.
              </p>
            </div>
          </div>
        </aside>
      ) : null}
    </div>
  )
}
