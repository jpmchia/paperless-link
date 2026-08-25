import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import {
  type GlobalSearchAction,
  type GlobalSearchResult,
} from "@/lib/global-search-actions"
import { GlobalSearchResultRow } from "@/components/global-search/global-search-result"

vi.mock("@/components/ui/command", () => ({
  CommandItem: ({
    children,
    onKeyDown,
    onSelect,
  }: {
    children: React.ReactNode
    onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void
    onSelect?: (value: string) => void
  }) => (
    <div
      role="option"
      tabIndex={0}
      onClick={() => onSelect?.("")}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.key === "Enter" && !event.defaultPrevented) {
          onSelect?.("")
        }
      }}
    >
      {children}
    </div>
  ),
  CommandShortcut: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

function createAction(id: GlobalSearchAction["id"], label: string): GlobalSearchAction {
  return { id, label }
}

const documentResult: GlobalSearchResult = {
  id: 12,
  kind: "document",
  title: "Statement.pdf",
}

describe("GlobalSearchResultRow", () => {
  it("fires only the clicked action and does not trigger the row default", () => {
    const onAction = vi.fn()

    render(
      <GlobalSearchResultRow
        result={documentResult}
        primaryAction={createAction("open", "Open")}
        secondaryAction={createAction("download", "Download")}
        alternateAction={createAction("openInNewWindow", "Open in new window")}
        onAction={onAction}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Download Statement.pdf" }))

    expect(onAction).toHaveBeenCalledTimes(1)
    expect(onAction).toHaveBeenCalledWith("download", documentResult)
  })

  it("uses the primary action when the row is selected", () => {
    const onAction = vi.fn()

    render(
      <GlobalSearchResultRow
        result={documentResult}
        primaryAction={createAction("open", "Open")}
        secondaryAction={createAction("download", "Download")}
        alternateAction={createAction("openInNewWindow", "Open in new window")}
        onAction={onAction}
      />
    )

    fireEvent.click(screen.getByRole("option"))

    expect(onAction).toHaveBeenCalledWith("open", documentResult)
  })

  it("supports Ctrl/Cmd+Enter to trigger the alternate document action", () => {
    const onAction = vi.fn()

    render(
      <GlobalSearchResultRow
        result={documentResult}
        primaryAction={createAction("open", "Open")}
        secondaryAction={createAction("download", "Download")}
        alternateAction={createAction("openInNewWindow", "Open in new window")}
        onAction={onAction}
      />
    )

    const primaryButton = screen.getByRole("button", { name: "Open Statement.pdf" })

    fireEvent.keyDown(primaryButton, { ctrlKey: true, key: "Enter" })
    fireEvent.keyDown(screen.getByRole("option"), { metaKey: true, key: "Enter" })

    expect(onAction).toHaveBeenNthCalledWith(1, "openInNewWindow", documentResult)
    expect(onAction).toHaveBeenNthCalledWith(2, "openInNewWindow", documentResult)
  })

  it("supports arrow key traversal between primary and secondary actions", () => {
    const onAction = vi.fn()

    render(
      <GlobalSearchResultRow
        result={documentResult}
        primaryAction={createAction("open", "Open")}
        secondaryAction={createAction("download", "Download")}
        alternateAction={createAction("openInNewWindow", "Open in new window")}
        onAction={onAction}
      />
    )

    const primaryButton = screen.getByRole("button", { name: "Open Statement.pdf" })
    const secondaryButton = screen.getByRole("button", { name: "Download Statement.pdf" })

    primaryButton.focus()
    fireEvent.keyDown(primaryButton, { key: "ArrowRight" })
    expect(secondaryButton).toHaveFocus()

    fireEvent.keyDown(secondaryButton, { key: "ArrowLeft" })
    expect(primaryButton).toHaveFocus()
  })
})
