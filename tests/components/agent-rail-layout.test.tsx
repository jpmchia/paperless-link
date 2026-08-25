import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AgentRailLayout } from "@/components/agent-rail-layout"

vi.mock("@/components/agent-interface", () => ({
  AgentInterface: () => <div>Agent rail</div>,
}))

vi.mock("@/components/global-search/global-search", () => ({
  GlobalSearch: () => <div>Global search</div>,
}))

vi.mock("@/components/help/help-menu", () => ({
  HelpMenu: () => <div>Help menu</div>,
}))

vi.mock("@/components/link-iq-connection-status", () => ({
  LinkIQConnectionStatus: () => <div>LinkIQ</div>,
}))

vi.mock("@/components/notifications/notification-center", () => ({
  NotificationCenter: () => <div>Notifications</div>,
}))

vi.mock("@/components/shell-status", () => ({
  ShellStatus: () => <div>Shell status</div>,
}))

describe("AgentRailLayout", () => {
  it("excludes help and shell controls when global controls are disabled", () => {
    render(
      <AgentRailLayout
        savedViews={[]}
        showGlobalControls={false}
        initialTourComplete={false}
        showAgentRailToggle={false}
      >
        <div>Workspace content</div>
      </AgentRailLayout>
    )

    expect(screen.getByText("Workspace content")).toBeInTheDocument()
    expect(screen.queryByText("Global search")).not.toBeInTheDocument()
    expect(screen.queryByText("Help menu")).not.toBeInTheDocument()
    expect(screen.queryByText("LinkIQ")).not.toBeInTheDocument()
    expect(screen.queryByText("Shell status")).not.toBeInTheDocument()
    expect(screen.queryByText("Notifications")).not.toBeInTheDocument()
  })
})
