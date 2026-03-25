import * as React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DocumentContextTab } from "@/app/documents/[id]/document-context-tab"
import { JotaiProvider } from "@/components/jotai-provider"

const fetchMock = vi.fn()

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
}))

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({
    json: async () => data,
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? "OK" : "Error",
    text: async () => "error",
    headers: new Headers({ "content-type": "application/json" }),
  })
}

describe("document context tab", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  it("loads repository context, taxonomy assignments, and matched domain models", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)

      if (url === "/api/link-iq/taxonomy/nodes") {
        return jsonResponse({
          nodes: [
            {
              taxonomy_node_id: "invoice",
              label: "Invoice",
              path: "Finance > Invoice",
              depth: 1,
              source_scope: "link_global",
            },
          ],
        })
      }

      if (url === "/api/proxy/documents/42/?full_perms=true") {
        return jsonResponse({
          id: 42,
          title: "Invoice 1001",
          document_type: 7,
        })
      }

      if (url === "/api/link-iq/documents/42/context?document_type=Invoice") {
        return jsonResponse({
          source_id: "example-ngx",
          document_id: "42",
          document_type: "Invoice",
          assignments: [
            {
              assignment: {
                assignment_id: "assign-1",
                taxonomy_node_id: "invoice",
                taxonomy_path: "Finance > Invoice",
                is_primary: true,
              },
              node: {
                taxonomy_node_id: "invoice",
                label: "Invoice",
                path: "Finance > Invoice",
                depth: 1,
                source_scope: "link_global",
              },
            },
          ],
          matched_definitions: [
            {
              definition_id: "invoice-definition",
              label: "Invoice Base Model",
              document_type: "Invoice",
              taxonomy_path: "Finance > Invoice",
              version: 3,
              entities: [
                {
                  entity_type: "invoice",
                  attributes: [{ attribute_id: "invoice.number" }],
                },
              ],
            },
          ],
        })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })

    render(
      <JotaiProvider>
        <DocumentContextTab
          canChangeDocument
          documentId={42}
          documentTypes={[{ id: 7, name: "Invoice" }]}
        />
      </JotaiProvider>
    )

    expect(await screen.findByText("Document Context")).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText("Invoice Base Model")).toBeInTheDocument()
      expect(screen.getAllByText("Finance > Invoice").length).toBeGreaterThan(0)
      expect(screen.getByText("Primary")).toBeInTheDocument()
    })
  })
})
