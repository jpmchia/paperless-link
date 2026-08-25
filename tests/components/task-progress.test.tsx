import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { TaskProgress } from "@/components/tasks/task-progress"

describe("TaskProgress", () => {
  it("renders determinate progress with accessible values", () => {
    render(<TaskProgress current={2} max={4} status="STARTED" />)
    expect(screen.getByText("2 / 4 (50%)")).toBeInTheDocument()
    expect(screen.getByLabelText(/Task progress 50%/)).toHaveAttribute(
      "aria-valuenow",
      "50"
    )
  })

  it("renders indeterminate progress when running without numbers", () => {
    render(<TaskProgress status="STARTED" />)
    expect(screen.getByText("In progress…")).toBeInTheDocument()
    expect(screen.getByLabelText("Task in progress")).toHaveAttribute(
      "aria-busy",
      "true"
    )
  })

  it("renders nothing for terminal tasks without progress", () => {
    const { container } = render(<TaskProgress status="SUCCESS" />)
    expect(container).toBeEmptyDOMElement()
  })
})
