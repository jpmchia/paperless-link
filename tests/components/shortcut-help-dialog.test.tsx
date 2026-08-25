import { render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { ShortcutHelpDialog } from "@/components/help/shortcut-help-dialog"

const originalPlatform = window.navigator.platform

describe("ShortcutHelpDialog", () => {
  afterEach(() => {
    Object.defineProperty(window.navigator, "platform", {
      configurable: true,
      value: originalPlatform,
    })
  })

  it("groups shortcuts by scope and formats platform-specific modifier labels", () => {
    Object.defineProperty(window.navigator, "platform", {
      configurable: true,
      value: "MacIntel",
    })

    render(<ShortcutHelpDialog open onOpenChange={() => {}} />)

    const globalSection = screen
      .getByRole("heading", { name: "Global" })
      .closest("section")
    const documentsSection = screen
      .getByRole("heading", { name: "Document workspace" })
      .closest("section")

    expect(globalSection).not.toBeNull()
    expect(documentsSection).not.toBeNull()

    expect(
      within(globalSection as HTMLElement).getByText("Open global search")
    ).toBeInTheDocument()
    expect(
      within(globalSection as HTMLElement).getByText("Cmd+K")
    ).toBeInTheDocument()
    expect(
      within(documentsSection as HTMLElement).getByText("Focus document search")
    ).toBeInTheDocument()
  })
})
