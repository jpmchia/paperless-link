import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MailTable } from "@/app/mail/mail-table"
import { JotaiProvider } from "@/components/jotai-provider"
import { PermissionsProvider } from "@/components/permissions/provider"

const postJsonMock = vi.fn()
const patchJsonMock = vi.fn()
const deleteJsonMock = vi.fn()
const getJsonMock = vi.fn()
const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}))

vi.mock("@/lib/paperless-client", () => ({
  postJson: (...args: unknown[]) => postJsonMock(...args),
  patchJson: (...args: unknown[]) => patchJsonMock(...args),
  deleteJson: (...args: unknown[]) => deleteJsonMock(...args),
  getJson: (...args: unknown[]) => getJsonMock(...args),
  withQuery: (path: string, params: Record<string, string | number | null | undefined>) => {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value == null) continue
      search.set(key, String(value))
    }
    const query = search.toString()
    return query ? `${path}?${query}` : path
  },
}))

vi.mock("@/components/draggable-dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LargeEditorDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock("@/components/open-document-link", () => ({
  OpenDocumentLink: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

vi.mock("@/components/ui/select", async () => {
  const ReactModule = await import("react")

  type SelectContextValue = {
    value: string
    onValueChange?: (value: string) => void
  }

  const SelectContext = ReactModule.createContext<SelectContextValue | null>(null)

  return {
    Select: ({
      children,
      value,
      onValueChange,
    }: {
      children: React.ReactNode
      value: string
      onValueChange?: (value: string) => void
    }) => (
      <SelectContext.Provider value={{ value, onValueChange }}>
        <div>{children}</div>
      </SelectContext.Provider>
    ),
    SelectTrigger: ({
      children,
      "aria-label": ariaLabel,
    }: {
      children: React.ReactNode
      "aria-label"?: string
    }) => {
      const context = ReactModule.useContext(SelectContext)
      return (
        <label>
          <span className="sr-only">{ariaLabel}</span>
          <select
            aria-label={ariaLabel}
            value={context?.value ?? ""}
            onChange={(event) => context?.onValueChange?.(event.target.value)}
          >
            {children}
          </select>
        </label>
      )
    },
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({
      children,
      value,
      disabled,
    }: {
      children: React.ReactNode
      value: string
      disabled?: boolean
    }) => (
      <option value={value} disabled={disabled}>
        {children}
      </option>
    ),
    SelectValue: ({ placeholder }: { placeholder?: string }) => <option value="">{placeholder ?? ""}</option>,
  }
})

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    "aria-label": ariaLabel,
    className,
  }: {
    checked: boolean
    onCheckedChange?: (checked: boolean) => void
    "aria-label"?: string
    className?: string
  }) => (
    <input
      type="checkbox"
      aria-label={ariaLabel}
      className={className}
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}))

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    "aria-label": ariaLabel,
  }: {
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
    "aria-label"?: string
  }) => (
    <input
      type="checkbox"
      aria-label={ariaLabel}
      checked={Boolean(checked)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}))

vi.mock("@/components/ui/tabs", async () => {
  const ReactModule = await import("react")
  const TabsContext = ReactModule.createContext<{
    value: string
    setValue: (value: string) => void
  } | null>(null)

  return {
    Tabs: ({
      children,
      defaultValue,
    }: {
      children: React.ReactNode
      defaultValue: string
    }) => {
      const [value, setValue] = ReactModule.useState(defaultValue)
      return <TabsContext.Provider value={{ value, setValue }}>{children}</TabsContext.Provider>
    },
    TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TabsTrigger: ({
      children,
      value,
    }: {
      children: React.ReactNode
      value: string
    }) => {
      const context = ReactModule.useContext(TabsContext)
      return (
        <button type="button" onClick={() => context?.setValue(value)}>
          {children}
        </button>
      )
    },
    TabsContent: ({
      children,
      value,
    }: {
      children: React.ReactNode
      value: string
    }) => {
      const context = ReactModule.useContext(TabsContext)
      return context?.value === value ? <div>{children}</div> : null
    },
  }
})

const baseAccount = {
  id: 1,
  name: "Primary mailbox",
  imap_server: "imap.example.com",
  imap_port: 993,
  imap_security: 2,
  username: "mailbox@example.com",
  is_token: false,
  character_set: "UTF-8",
  account_type: 1,
}

const baseRule = {
  id: 4,
  name: "Invoices",
  account: 1,
  folder: "INBOX",
  filter_from: "billing@example.com",
  filter_subject: "Invoice",
  order: 1,
  action: 1,
  enabled: true,
  assign_tags: [11],
}

const baseProcessed = {
  id: 88,
  subject: "Invoice 1001",
  received: "2026-03-20T10:00:00Z",
  processed: "2026-03-20T10:01:00Z",
  status: "FAILED",
  error: "Attachment parsing failed",
  folder: "INBOX",
  uid: 1001,
  rule: 4,
  document: 6,
}

function renderMailTable(permissionCodes: string[] = [
  "view_mailaccount",
  "add_mailaccount",
  "change_mailaccount",
  "delete_mailaccount",
  "view_mailrule",
  "add_mailrule",
  "change_mailrule",
  "delete_mailrule",
  "view_processedmail",
  "delete_processedmail",
]) {
  return render(
    <JotaiProvider>
      <PermissionsProvider
        initialPermissions={{
          groupIds: [],
          isAuthenticated: true,
          isStaff: false,
          isSuperuser: false,
          permissionCodes,
          userId: 1,
        }}
      >
        <MailTable
          accounts={[baseAccount]}
          rules={[baseRule]}
          processedMail={[baseProcessed]}
          gmailOAuthUrl="https://accounts.google.test/connect"
          outlookOAuthUrl="https://outlook.test/connect"
          tags={[{ id: 11, name: "Invoices" }]}
          correspondents={[{ id: 3, name: "Billing" }]}
          documentTypes={[{ id: 5, name: "Invoice" }]}
        />
      </PermissionsProvider>
    </JotaiProvider>
  )
}

describe("MailTable", () => {
  beforeEach(() => {
    postJsonMock.mockReset()
    patchJsonMock.mockReset()
    deleteJsonMock.mockReset()
    getJsonMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
  })

  it("creates a new IMAP mail account", async () => {
    postJsonMock.mockResolvedValue({ ...baseAccount, id: 2, name: "Invoices mailbox" })

    renderMailTable()

    fireEvent.click(screen.getByRole("button", { name: "New account" }))
    fireEvent.change(screen.getByLabelText("Account name"), { target: { value: "Invoices mailbox" } })
    fireEvent.change(screen.getByLabelText("IMAP server"), { target: { value: "imap.invoices.example" } })
    fireEvent.change(screen.getByLabelText("Account username"), { target: { value: "invoices@example.com" } })
    fireEvent.change(screen.getByLabelText("Account password or token"), { target: { value: "secret" } })
    fireEvent.click(screen.getByRole("button", { name: "Create account" }))

    await waitFor(() => {
      expect(postJsonMock).toHaveBeenCalledWith("/api/proxy/mail_accounts/", expect.objectContaining({
        name: "Invoices mailbox",
        imap_server: "imap.invoices.example",
        username: "invoices@example.com",
        account_type: 1,
      }))
    })
  })

  it("updates an existing mail account", async () => {
    patchJsonMock.mockResolvedValue({ ...baseAccount, name: "Renamed mailbox" })

    renderMailTable()

    fireEvent.click(screen.getByRole("button", { name: "Edit Primary mailbox" }))
    fireEvent.change(screen.getByLabelText("Account name"), { target: { value: "Renamed mailbox" } })
    fireEvent.click(screen.getByRole("button", { name: "Save account" }))

    await waitFor(() => {
      expect(patchJsonMock).toHaveBeenCalledWith("/api/proxy/mail_accounts/1/", expect.objectContaining({
        name: "Renamed mailbox",
      }))
    })
  })

  it("tests a mail account connection from the dialog", async () => {
    postJsonMock.mockResolvedValueOnce({ success: true })

    renderMailTable()

    fireEvent.click(screen.getByRole("button", { name: "New account" }))
    fireEvent.change(screen.getByLabelText("Account name"), { target: { value: "Test mailbox" } })
    fireEvent.change(screen.getByLabelText("IMAP server"), { target: { value: "imap.test.example" } })
    fireEvent.change(screen.getByLabelText("Account username"), { target: { value: "tester@example.com" } })
    fireEvent.change(screen.getByLabelText("Account password or token"), { target: { value: "secret" } })
    fireEvent.click(screen.getByRole("button", { name: "Test connection" }))

    await waitFor(() => {
      expect(postJsonMock).toHaveBeenCalledWith("/api/proxy/mail_accounts/test/", expect.objectContaining({
        name: "Test mailbox",
        imap_server: "imap.test.example",
        username: "tester@example.com",
      }))
    })
  })

  it("creates a mail rule", async () => {
    postJsonMock.mockResolvedValue({ ...baseRule, id: 9, name: "Expenses" })

    renderMailTable()

    fireEvent.click(screen.getByRole("button", { name: /Rules/ }))
    fireEvent.click(screen.getByRole("button", { name: "New rule" }))
    fireEvent.change(screen.getByLabelText("Rule name"), { target: { value: "Expenses" } })
    fireEvent.click(screen.getByRole("button", { name: "Create rule" }))

    await waitFor(() => {
      expect(postJsonMock).toHaveBeenCalledWith("/api/proxy/mail_rules/", expect.objectContaining({
        name: "Expenses",
        account: 1,
        folder: "INBOX",
      }))
    })
  })

  it("opens processed mail for a rule and bulk deletes selected records", async () => {
    getJsonMock.mockResolvedValue({ count: 1, results: [baseProcessed] })
    postJsonMock.mockResolvedValue({ result: "OK", deleted_mail_ids: [88] })

    renderMailTable()

    fireEvent.click(screen.getByRole("button", { name: /Rules/ }))
    fireEvent.click(screen.getByRole("button", { name: "View processed" }))

    await waitFor(() => {
      expect(getJsonMock).toHaveBeenCalledWith(expect.stringContaining("/api/proxy/processed_mail/?"))
      expect(getJsonMock.mock.calls[0]?.[0]).toContain("rule=4")
    })

    fireEvent.click(screen.getByLabelText("Select processed mail 88"))
    fireEvent.click(screen.getByRole("button", { name: "Delete selected" }))

    await waitFor(() => {
      expect(postJsonMock).toHaveBeenCalledWith("/api/proxy/processed_mail/bulk_delete/", {
        mail_ids: [88],
      })
    })
  })

  it("hides create and edit controls when mail permissions are missing", () => {
    renderMailTable([
      "view_mailaccount",
      "view_mailrule",
      "view_processedmail",
    ])

    expect(screen.queryByRole("button", { name: "New account" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Rules/ }))
    expect(screen.queryByRole("button", { name: "New rule" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Edit Primary mailbox" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Edit Invoices" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "View processed" })).toBeInTheDocument()
  })
})
