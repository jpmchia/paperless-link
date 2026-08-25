import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { HierarchicalTagPicker } from "@/components/tags/hierarchical-tag-picker"

Element.prototype.scrollIntoView = vi.fn()

const tags = [
  { id: 1, name: "Business", color: "#112233" },
  { id: 2, name: "Invoices", parent: 1, color: "#223344" },
  { id: 3, name: "2026", parent: 2, color: "#334455" },
]

describe("HierarchicalTagPicker", () => {
  it("renders path-aware hierarchical options and toggles a selection", () => {
    const onChange = vi.fn()
    render(
      <HierarchicalTagPicker
        tags={tags}
        selectedIds={[]}
        onSelectionChange={onChange}
      />
    )

    fireEvent.click(screen.getByRole("combobox"))

    expect(screen.getByText("Business / Invoices")).toBeInTheDocument()
    expect(screen.getByText("Business / Invoices / 2026")).toBeInTheDocument()

    fireEvent.click(screen.getByText("Business / Invoices"))
    expect(onChange).toHaveBeenCalledWith([2])
  })

  it("shows path-aware labels for selected tags", () => {
    render(
      <HierarchicalTagPicker
        tags={tags}
        selectedIds={[3]}
        onSelectionChange={() => undefined}
      />
    )

    expect(screen.getByText("Business / Invoices / 2026")).toBeInTheDocument()
  })
})
