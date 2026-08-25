import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { HelpMenu } from "@/components/help/help-menu"
import { SETTINGS_KEYS } from "@/data/ui-settings"

const updateUiSettingsMock = vi.fn()
const toastErrorMock = vi.fn()

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    ...props
  }: React.ComponentProps<"a"> & { href?: string }) => (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event)
        event.preventDefault()
      }}
    >
      {children}
    </a>
  ),
}))

vi.mock("@/app/actions/ui-settings", () => ({
  updateUiSettings: (...args: unknown[]) => updateUiSettingsMock(...args),
}))

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}))

function openHelpMenu() {
  const trigger = screen.getByRole("button", { name: "Open help" })
  trigger.focus()
  fireEvent.keyDown(trigger, { key: "ArrowDown" })
}

describe("HelpMenu", () => {
  beforeEach(() => {
    updateUiSettingsMock.mockReset()
    toastErrorMock.mockReset()
    updateUiSettingsMock.mockResolvedValue(undefined)
  })

  it("opens the welcome dialog on first run and lets users reopen it from Help", async () => {
    const { rerender } = render(<HelpMenu initialTourComplete={false} />)

    expect(
      await screen.findByRole("dialog", { name: "Welcome to Paperless-Link" })
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Continue" }))

    await waitFor(() => {
      expect(updateUiSettingsMock).toHaveBeenCalledWith({
        [SETTINGS_KEYS.TOUR_COMPLETE]: true,
      })
    })

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Welcome to Paperless-Link" })
      ).not.toBeInTheDocument()
    })

    rerender(<HelpMenu initialTourComplete={false} />)
    expect(
      screen.queryByRole("dialog", { name: "Welcome to Paperless-Link" })
    ).not.toBeInTheDocument()

    openHelpMenu()
    fireEvent.click(screen.getByText("Welcome"))

    expect(
      await screen.findByRole("dialog", { name: "Welcome to Paperless-Link" })
    ).toBeInTheDocument()
  })

  it("only persists welcome completion on explicit actions", async () => {
    render(<HelpMenu initialTourComplete={false} />)

    const dialog = await screen.findByRole("dialog", {
      name: "Welcome to Paperless-Link",
    })
    fireEvent.keyDown(dialog, { key: "Escape" })

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Welcome to Paperless-Link" })
      ).not.toBeInTheDocument()
    })
    expect(updateUiSettingsMock).not.toHaveBeenCalled()
  })

  it("opens shortcut help with Shift+?, ignores editable targets, and restores focus", async () => {
    render(
      <>
        <button type="button">Focus target</button>
        <input aria-label="Editable field" />
        <HelpMenu initialTourComplete />
      </>
    )

    const editable = screen.getByLabelText("Editable field")
    editable.focus()
    fireEvent.keyDown(editable, { key: "?", shiftKey: true })
    expect(
      screen.queryByRole("dialog", { name: "Keyboard shortcuts" })
    ).not.toBeInTheDocument()

    const focusTarget = screen.getByRole("button", { name: "Focus target" })
    focusTarget.focus()
    fireEvent.keyDown(window, { key: "?", shiftKey: true })

    const dialog = await screen.findByRole("dialog", {
      name: "Keyboard shortcuts",
    })
    expect(dialog).toBeInTheDocument()

    fireEvent.keyDown(dialog, { key: "Escape" })

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Keyboard shortcuts" })
      ).not.toBeInTheDocument()
    })
    expect(focusTarget).toHaveFocus()
  })
})
