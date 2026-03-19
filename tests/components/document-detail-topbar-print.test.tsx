import * as React from "react"
import type { ReactNode } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { Provider, useSetAtom } from "jotai"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  activeVersionIdAtom,
  documentDetailAvailableFieldsAtom,
  documentDetailFieldLayoutAtom,
  documentListState,
  documentSectionAtom,
  pdfViewerRegistryAtom,
} from "@/lib/store"
import { TopBar } from "@/app/documents/[id]/topbar"

const {
  closeMock,
  confirmMock,
  focusMock,
  getDocumentMock,
  openMock,
  printMock,
  pushMock,
  refreshMock,
  toastErrorMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  closeMock: vi.fn(),
  confirmMock: vi.fn().mockResolvedValue(true),
  focusMock: vi.fn(),
  getDocumentMock: vi.fn(),
  openMock: vi.fn(),
  printMock: vi.fn(),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}))

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  GlobalWorkerOptions: {},
  getDocument: getDocumentMock,
}))

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}))

vi.mock("@/components/confirmation-dialog-provider", () => ({
  useConfirmationDialog: () => ({
    confirm: confirmMock,
  }),
}))

vi.mock("@/components/permissions/has-object-permission", () => ({
  HasObjectPermission: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock("@/components/open-document-link", () => ({
  OpenDocumentLink: ({
    children,
    href,
  }: {
    children: ReactNode
    href?: string
  }) => <a href={href}>{children}</a>,
}))

vi.mock("@/app/documents/[id]/details-fields-picker", () => ({
  DetailsFieldsPicker: () => <button type="button">Fields</button>,
}))

vi.mock("@/app/documents/[id]/email-document-dialog", () => ({
  EmailDocumentDialog: () => null,
}))

vi.mock("@/app/documents/[id]/pdf-tools-dialog", () => ({
  PdfToolsDialog: () => null,
}))

vi.mock("@/app/documents/[id]/remove-password-dialog", () => ({
  RemovePasswordDialog: () => null,
}))

vi.mock("@/app/documents/[id]/actions", () => ({
  deleteDocument: vi.fn(),
  removeDocumentPassword: vi.fn(),
  reprocessDocument: vi.fn(),
}))

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
    className,
  }: {
    children: ReactNode
    onClick?: () => void
    className?: string
  }) => (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuCheckboxItem: ({
    children,
    checked,
    onCheckedChange,
  }: {
    children: ReactNode
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
  }) => (
    <button type="button" aria-pressed={checked} onClick={() => onCheckedChange?.(!checked)}>
      {children}
    </button>
  ),
}))

function InitializeAtoms({
  versionId = null,
  registry = null,
  children,
}: {
  versionId?: number | null
  registry?: unknown
  children: ReactNode
}) {
  const setDocumentList = useSetAtom(documentListState)
  const setDocumentSection = useSetAtom(documentSectionAtom)
  const setDetailFieldLayout = useSetAtom(documentDetailFieldLayoutAtom)
  const setAvailableFields = useSetAtom(documentDetailAvailableFieldsAtom)
  const setActiveVersionId = useSetAtom(activeVersionIdAtom)
  const setPdfViewerRegistry = useSetAtom(pdfViewerRegistryAtom)

  React.useEffect(() => {
    setDocumentList([4])
    setDocumentSection("details")
    setDetailFieldLayout([])
    setAvailableFields([])
    setActiveVersionId(versionId)
    setPdfViewerRegistry(registry as never)
  }, [
    setActiveVersionId,
    setAvailableFields,
    setDetailFieldLayout,
    setDocumentList,
    setDocumentSection,
    setPdfViewerRegistry,
    registry,
    versionId,
  ])

  return children
}

function RenderTopBar({
  versionId = null,
  registry = null,
}: {
  versionId?: number | null
  registry?: unknown
}) {
  return (
    <Provider>
      <InitializeAtoms versionId={versionId} registry={registry}>
        <TopBar documentId={4} title="Test Document">
          <div>child</div>
        </TopBar>
      </InitializeAtoms>
    </Provider>
  )
}

describe("TopBar print flow", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal("fetch", vi.fn())
    vi.spyOn(window, "open").mockImplementation(((...args: Parameters<typeof window.open>) => {
      openMock(...args)
      const printDocument = document.implementation.createHTMLDocument("")
      const originalPrintCreateElement = printDocument.createElement.bind(printDocument)

      vi.spyOn(printDocument, "createElement").mockImplementation(((tagName: string) => {
        const element = originalPrintCreateElement(tagName)
        if (tagName.toLowerCase() === "canvas") {
          Object.defineProperty(element, "getContext", {
            configurable: true,
            value: () => ({
              clearRect: vi.fn(),
              setTransform: vi.fn(),
            }),
          })
        }
        return element
      }) as typeof printDocument.createElement)

      return {
        document: printDocument,
        focus: focusMock,
        print: printMock,
        close: closeMock,
        onafterprint: null,
      } as unknown as Window
    }) as typeof window.open)

    getDocumentMock.mockReturnValue({
      destroy: vi.fn(),
      promise: Promise.resolve({
        destroy: vi.fn(),
        getPage: vi.fn().mockResolvedValue({
          getViewport: vi.fn().mockReturnValue({ width: 600, height: 800 }),
          render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
        }),
        numPages: 1,
      }),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("prints a successfully fetched PDF and includes the selected version", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(new Blob(["pdf"], { type: "application/pdf" }), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
        },
      })
    )

    render(<RenderTopBar versionId={7} />)

    fireEvent.click(await screen.findByText("Print"))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/proxy/documents/4/download?version=7"
      )
    })

    await waitFor(() => {
      expect(openMock).toHaveBeenCalled()
      expect(getDocumentMock).toHaveBeenCalled()
      expect(focusMock).toHaveBeenCalled()
      expect(printMock).toHaveBeenCalled()
    })

    const openedWindow = vi.mocked(window.open).mock.results[0]?.value as Window
    expect(typeof openedWindow.onafterprint).toBe("function")

    openedWindow.onafterprint?.(new Event("afterprint"))

    await waitFor(() => {
      expect(closeMock).toHaveBeenCalled()
    })
  })

  it("shows an error instead of printing a non-pdf response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("<html>login</html>", {
        status: 200,
        headers: {
          "Content-Type": "text/html",
        },
      })
    )

    render(<RenderTopBar />)

    fireEvent.click(await screen.findByText("Print"))

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled()
    })
    expect(printMock).not.toHaveBeenCalled()
  })

  it("shows an error when the printable document fetch fails", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("Forbidden", {
        status: 403,
        headers: {
          "Content-Type": "text/plain",
        },
      })
    )

    render(<RenderTopBar />)

    fireEvent.click(await screen.findByText("Print"))

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled()
    })
    expect(printMock).not.toHaveBeenCalled()
  })

  it("routes viewer commands through the embedpdf registry", async () => {
    const executeMock = vi.fn()
    const copyToClipboardMock = vi.fn()
    const registry = {
      getPlugin: vi.fn((name: string) => {
        if (name === "commands") {
          return {
            provides: () => ({
              execute: executeMock,
            }),
          }
        }

        if (name === "selection") {
          return {
            provides: () => ({
              copyToClipboard: copyToClipboardMock,
            }),
          }
        }

        return undefined
      }),
    }

    render(<RenderTopBar registry={registry} />)

    fireEvent.click(await screen.findByText("Copy selected text"))
    fireEvent.click(screen.getByText("Fit page"))
    fireEvent.click(screen.getByText("Fit width"))
    fireEvent.click(screen.getByText("Single page"))
    fireEvent.click(screen.getByText("Two-up"))
    fireEvent.click(screen.getByText("Rotate left"))
    fireEvent.click(screen.getByText("Rotate right"))

    expect(copyToClipboardMock).toHaveBeenCalledTimes(1)
    expect(executeMock).toHaveBeenCalledWith("zoom:fit-page", undefined, "ui")
    expect(executeMock).toHaveBeenCalledWith("zoom:fit-width", undefined, "ui")
    expect(executeMock).toHaveBeenCalledWith("spread:none", undefined, "ui")
    expect(executeMock).toHaveBeenCalledWith("spread:odd", undefined, "ui")
    expect(executeMock).toHaveBeenCalledWith("rotate:counter-clockwise", undefined, "ui")
    expect(executeMock).toHaveBeenCalledWith("rotate:clockwise", undefined, "ui")
  })
})
