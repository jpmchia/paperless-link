import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { LogsView } from "@/app/logs/logs-view"
import { JotaiProvider } from "@/components/jotai-provider"

const getJsonMock = vi.fn()

vi.mock("@/lib/paperless-client", () => ({
  getJson: (...args: unknown[]) => getJsonMock(...args),
  withQuery: (path: string, params: Record<string, string | number>) => {
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      searchParams.set(key, String(value))
    }
    return `${path}?${searchParams.toString()}`
  },
}))

describe("LogsView", () => {
  beforeEach(() => {
    getJsonMock.mockReset()
  })

  it("loads log files and the first log by default", async () => {
    getJsonMock.mockResolvedValueOnce(["paperless", "mail"])
    getJsonMock.mockResolvedValueOnce([
      "[INFO] Paperless started",
      "[WARNING] Check mail config",
    ])

    render(
      <JotaiProvider>
        <LogsView />
      </JotaiProvider>
    )

    expect(await screen.findByText("paperless.log")).toBeInTheDocument()

    await waitFor(() => {
      expect(getJsonMock).toHaveBeenNthCalledWith(1, "/api/logs")
      expect(getJsonMock).toHaveBeenNthCalledWith(
        2,
        "/api/logs?file=paperless&limit=5000"
      )
    })

    expect(screen.getByText("[INFO] Paperless started")).toBeInTheDocument()
  })

  it("switches log files and debounces line-limit updates", async () => {
    getJsonMock.mockResolvedValueOnce(["paperless", "mail"])
    getJsonMock.mockResolvedValueOnce(["[INFO] Paperless started"])
    getJsonMock.mockResolvedValueOnce(["[ERROR] OAuth failed"])
    getJsonMock.mockResolvedValueOnce(["[ERROR] OAuth failed"])

    render(
      <JotaiProvider>
        <LogsView />
      </JotaiProvider>
    )

    expect(await screen.findByText("mail.log")).toBeInTheDocument()

    const mailTab = screen.getByRole("tab", { name: "mail.log" })
    fireEvent.mouseDown(mailTab)
    fireEvent.click(mailTab)

    await waitFor(() => {
      expect(getJsonMock).toHaveBeenNthCalledWith(
        3,
        "/api/logs?file=mail&limit=5000"
      )
    })

    fireEvent.change(screen.getByDisplayValue("5000"), {
      target: { value: "1000" },
    })

    expect(getJsonMock).toHaveBeenCalledTimes(3)

    await waitFor(() => {
      expect(getJsonMock).toHaveBeenNthCalledWith(
        4,
        "/api/logs?file=mail&limit=1000"
      )
    }, { timeout: 1000 })
  })
})
