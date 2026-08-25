import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DocumentsWorkspace } from "@/app/documents/documents-workspace"
import { BulkActionBar } from "@/app/documents/bulk-action-bar"
import { createAllFilteredDocumentSelection } from "@/lib/document-selection"
import { ConfirmationDialogProvider } from "@/components/confirmation-dialog-provider"
import { JotaiProvider } from "@/components/jotai-provider"
import type { Document } from "@/app/documents/columns"

const {
  pushMock,
  refreshMock,
  toastSuccessMock,
  toastErrorMock,
  toastMessageMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastMessageMock: vi.fn(),
}))

vi.mock("@/auth", () => ({
  authOptions: {},
}))

vi.mock("next/navigation", () => ({
  usePathname: () => "/documents",
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams("page=1&page_size=25"),
}))

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
    message: toastMessageMock,
  },
}))

vi.mock("@/app/actions/ui-settings", () => ({
  updateUiSettings: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/components/permissions/can-change", () => ({
  CanChange: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock("@/components/permissions/can-delete", () => ({
  CanDelete: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock("@/components/realtime-document-list-sync", () => ({
  RealtimeDocumentListSync: () => null,
}))

vi.mock("@/components/documents/mixed-selection-picker", () => ({
  MixedSelectionPicker: ({
    stateById,
    onStateByIdChange,
  }: {
    stateById: Record<number, "selected" | "partial" | "unselected">
    onStateByIdChange: (
      next: Record<number, "selected" | "partial" | "unselected">
    ) => void
  }) => (
    <div>
      <div data-testid="mixed-tag-states">
        {Object.values(stateById).filter((state) => state !== "unselected").length}
      </div>
      <button
        type="button"
        onClick={() =>
          onStateByIdChange({
            8: "selected",
          })
        }
      >
        Set alternate tags
      </button>
    </div>
  ),
}))

vi.mock("@/app/documents/filter-panel", () => ({
  FilterPanel: ({ trailingControls }: { trailingControls?: ReactNode }) => (
    <div>
      <input data-documents-hotkey="search-input" placeholder="Search documents…" />
      {trailingControls}
    </div>
  ),
}))

vi.mock("@/app/documents/columns-picker", () => ({
  ColumnsPicker: () => null,
}))

vi.mock("@/app/documents/display-mode-picker", () => ({
  DisplayModePicker: () => null,
}))

vi.mock("@/app/documents/document-preview-dialog", () => ({
  DocumentPreviewDialog: () => null,
}))

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: ReactNode
    onClick?: () => void
    disabled?: boolean
    className?: string
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
  DropdownMenuSub: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSubContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSubTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
  DropdownMenuSeparator: () => <hr />,
}))

const documents: Document[] = [
  {
    id: 101,
    title: "Alpha invoice",
    created: "2024-01-01T00:00:00Z",
    added: "2024-01-02T00:00:00Z",
    modified: "2024-01-03T00:00:00Z",
    archive_serial_number: null,
    correspondent: null,
    document_type: null,
    storage_path: null,
    tags: [],
  },
  {
    id: 102,
    title: "Beta invoice",
    created: "2024-01-04T00:00:00Z",
    added: "2024-01-05T00:00:00Z",
    modified: "2024-01-06T00:00:00Z",
    archive_serial_number: null,
    correspondent: null,
    document_type: null,
    storage_path: null,
    tags: [],
  },
]

function renderWorkspace(currentFilters: { query?: string } = { query: "invoice" }) {
  return render(
    <JotaiProvider>
      <ConfirmationDialogProvider>
        <DocumentsWorkspace
          correspondents={[]}
          currentFilters={currentFilters}
          currentPage={1}
          currentPageSize={25}
          customFields={[]}
          data={documents}
          documentTypes={[]}
          lookup={{
            correspondents: {},
            customFields: {},
            documentTypes: {},
            storagePaths: {},
            tags: {},
            users: {},
          }}
          pageCount={2}
          savedViews={[]}
          storagePaths={[]}
          tags={[]}
          totalCount={4}
          users={[]}
          initialDisplayMode="table"
        />
      </ConfirmationDialogProvider>
    </JotaiProvider>
  )
}

describe("document selection workspace", () => {
  beforeEach(() => {
    pushMock.mockReset()
    refreshMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
    toastMessageMock.mockReset()
  })

  it("lets users select all filtered documents and clears on filter changes", async () => {
    const { rerender } = renderWorkspace()

    fireEvent.click(screen.getByLabelText("Select all"))

    expect(await screen.findByText("2 selected")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Select all 4 documents" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Select all 4 documents" }))

    expect(await screen.findByText("4 selected")).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText("Select Alpha invoice"))

    expect(await screen.findByText("3 selected")).toBeInTheDocument()
    expect(screen.getByText("1 excluded")).toBeInTheDocument()

    rerender(
      <JotaiProvider>
        <ConfirmationDialogProvider>
          <DocumentsWorkspace
            correspondents={[]}
            currentFilters={{ query: "receipts" }}
            currentPage={1}
            currentPageSize={25}
            customFields={[]}
            data={documents}
            documentTypes={[]}
            lookup={{
              correspondents: {},
              customFields: {},
              documentTypes: {},
              storagePaths: {},
              tags: {},
              users: {},
            }}
            pageCount={2}
            savedViews={[]}
            storagePaths={[]}
            tags={[]}
            totalCount={4}
            users={[]}
          />
        </ConfirmationDialogProvider>
      </JotaiProvider>
    )

    await waitFor(() => {
      expect(screen.queryByText("3 selected")).not.toBeInTheDocument()
    })
  })
})

describe("bulk action bar", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        selected_correspondents: [],
        selected_custom_fields: [],
        selected_document_types: [],
        selected_storage_paths: [],
        selected_tags: [],
      }),
    })
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("sends filtered bulk-edit payloads and uses the server-backed selected count in delete confirmation", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          selected_correspondents: [],
          selected_custom_fields: [],
          selected_document_types: [],
          selected_storage_paths: [],
          selected_tags: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

    const onComplete = vi.fn()

    render(
      <BulkActionBar
        selection={createAllFilteredDocumentSelection({ query: "invoice" }, [102])}
        selectedCount={3}
        totalResultsCount={4}
        onClearSelection={vi.fn()}
        onComplete={onComplete}
        onSelectAllFiltered={undefined}
        tags={[]}
        correspondents={[]}
        documentTypes={[]}
        storagePaths={[]}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "More…" }))
    fireEvent.click(await screen.findByText("Delete"))

    expect(await screen.findByText("Delete 3 document(s)?")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })

    const [selectionDataUrl, selectionDataOptions] = fetchMock.mock.calls[0]
    expect(selectionDataUrl).toBe("/api/documents/selection-data")
    expect(JSON.parse(String(selectionDataOptions?.body))).toEqual({
      all: true,
      filters: {
        query: "invoice",
      },
      excluded_document_ids: [102],
    })

    const [url, options] = fetchMock.mock.calls[1]
    expect(url).toBe("/api/bulk-edit")
    expect(JSON.parse(String(options?.body))).toEqual({
      all: true,
      filters: {
        query: "invoice",
      },
      excluded_document_ids: [102],
      method: "delete",
      parameters: {},
    })
    expect(onComplete).toHaveBeenCalled()
  })

  it("shows an exclusion summary when all filtered documents are selected", async () => {
    render(
      <BulkActionBar
        selection={createAllFilteredDocumentSelection({ query: "invoice" }, [102, 103])}
        selectedCount={2}
        totalResultsCount={4}
        onClearSelection={vi.fn()}
        onComplete={vi.fn()}
        onSelectAllFiltered={undefined}
        tags={[]}
        correspondents={[]}
        documentTypes={[]}
        storagePaths={[]}
      />
    )

    const badge = screen.getByText("2 selected")
    expect(badge).toBeInTheDocument()
    expect(within(badge.parentElement as HTMLElement).getByText("2 excluded")).toBeInTheDocument()
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })
  })

  it("uses page selection data for all-filtered selections without exclusions", async () => {
    render(
      <BulkActionBar
        selection={createAllFilteredDocumentSelection({ query: "invoice" })}
        selectedCount={2}
        totalResultsCount={2}
        selectionData={{
          selected_correspondents: [],
          selected_custom_fields: [],
          selected_document_types: [],
          selected_storage_paths: [],
          selected_tags: [{ id: 7, document_count: 2 }],
        }}
        onClearSelection={vi.fn()}
        onComplete={vi.fn()}
        onSelectAllFiltered={undefined}
        tags={[{ id: 7, name: "Invoices", color: "blue" }]}
        correspondents={[]}
        documentTypes={[]}
        storagePaths={[]}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId("mixed-tag-states")).toHaveTextContent("1")
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("loads selection data for explicit selections, resets state on selection changes, and sends tag deltas", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          selected_correspondents: [],
          selected_custom_fields: [],
          selected_document_types: [],
          selected_storage_paths: [],
          selected_tags: [{ id: 7, document_count: 2 }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          selected_correspondents: [],
          selected_custom_fields: [],
          selected_document_types: [],
          selected_storage_paths: [],
          selected_tags: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

    const onComplete = vi.fn()
    const { rerender } = render(
      <BulkActionBar
        selection={{ type: "explicit", documentIds: [101, 102] }}
        selectedCount={2}
        totalResultsCount={2}
        onClearSelection={vi.fn()}
        onComplete={onComplete}
        onSelectAllFiltered={undefined}
        tags={[
          { id: 7, name: "Invoices", color: "blue" },
          { id: 8, name: "Urgent", color: "red" },
        ]}
        correspondents={[]}
        documentTypes={[]}
        storagePaths={[]}
      />
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(screen.getByTestId("mixed-tag-states")).toHaveTextContent("1")
    })

    fireEvent.click(screen.getByRole("button", { name: "Set alternate tags" }))
    fireEvent.click(screen.getByRole("button", { name: /Apply tags/ }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    const [selectionDataUrl, selectionDataOptions] = fetchMock.mock.calls[0]
    expect(selectionDataUrl).toBe("/api/documents/selection-data")
    expect(JSON.parse(String(selectionDataOptions?.body))).toEqual({
      documents: [101, 102],
    })

    const [bulkEditUrl, bulkEditOptions] = fetchMock.mock.calls[1]
    expect(bulkEditUrl).toBe("/api/bulk-edit")
    expect(JSON.parse(String(bulkEditOptions?.body))).toEqual({
      documents: [101, 102],
      method: "modify_tags",
      parameters: {
        add_tags: [8],
        remove_tags: [7],
      },
    })
    expect(onComplete).toHaveBeenCalledTimes(1)

    rerender(
      <BulkActionBar
        selection={{ type: "explicit", documentIds: [103] }}
        selectedCount={1}
        totalResultsCount={1}
        onClearSelection={vi.fn()}
        onComplete={vi.fn()}
        onSelectAllFiltered={undefined}
        tags={[
          { id: 7, name: "Invoices", color: "blue" },
          { id: 8, name: "Urgent", color: "red" },
        ]}
        correspondents={[]}
        documentTypes={[]}
        storagePaths={[]}
      />
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3)
      expect(screen.getByTestId("mixed-tag-states")).toHaveTextContent("0")
    })
  })
})
