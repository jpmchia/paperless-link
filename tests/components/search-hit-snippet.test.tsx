import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SearchHitSnippet } from "@/components/documents/search-hit-snippet"

describe("SearchHitSnippet", () => {
  it("renders matched text without injecting highlight HTML", () => {
    const { container } = render(
      <SearchHitSnippet
        hit={{
          content:
            'Payment <span class="match">overdue</span><img src=x onerror=alert(1)>',
        }}
      />
    )

    expect(screen.getByText("overdue").tagName).toBe("MARK")
    expect(container).toHaveTextContent("Payment overdue")
    expect(container.querySelector("img")).toBeNull()
  })

  it("renders nothing for an empty hit", () => {
    const { container } = render(<SearchHitSnippet hit={null} />)

    expect(container).toBeEmptyDOMElement()
  })
})
