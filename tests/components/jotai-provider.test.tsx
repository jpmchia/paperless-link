import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { JotaiProvider } from "@/components/jotai-provider"

describe("JotaiProvider", () => {
  it("renders children", () => {
    render(
      <JotaiProvider>
        <div>child content</div>
      </JotaiProvider>
    )

    expect(screen.getByText("child content")).toBeInTheDocument()
  })
})
