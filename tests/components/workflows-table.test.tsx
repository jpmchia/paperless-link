import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  buildWorkflowPayload,
  WorkflowsTable,
} from "@/app/workflows/workflows-table"
import { JotaiProvider } from "@/components/jotai-provider"
import { PermissionsProvider } from "@/components/permissions/provider"
import {
  createDefaultAction,
  createDefaultTrigger,
  DocumentSource,
  ScheduleDateField,
  WorkflowActionType,
  WorkflowTriggerType,
  type WorkflowLookups,
} from "@/components/workflows/editor/types"

const postJsonMock = vi.fn()
const patchJsonMock = vi.fn()
const deleteJsonMock = vi.fn()
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
}))

vi.mock("@/components/draggable-dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LargeEditorDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  KeyboardSensor: class {},
  PointerSensor: class {},
  closestCenter: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}))

vi.mock("@dnd-kit/sortable", () => ({
  arrayMove: <T,>(items: T[], oldIndex: number, newIndex: number) => {
    const next = [...items]
    const [item] = next.splice(oldIndex, 1)
    next.splice(newIndex, 0, item)
    return next
  },
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  })),
  verticalListSortingStrategy: {},
}))

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
}))

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    className,
  }: {
    checked: boolean
    onCheckedChange?: (checked: boolean) => void
    className?: string
  }) => (
    <input
      type="checkbox"
      className={className}
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}))

const lookups: WorkflowLookups = {
  tags: [{ id: 4, name: "Finance" }],
  correspondents: [{ id: 6, name: "Accounts" }],
  documentTypes: [{ id: 7, name: "Invoice" }],
  storagePaths: [{ id: 8, name: "Archive" }],
  customFields: [{ id: 9, name: "Review date", data_type: "date" }],
  users: [{ id: 11, username: "alice" }],
  groups: [{ id: 12, name: "Managers" }],
  mailRules: [{ id: 13, name: "Inbox invoices" }],
}

const baseWorkflow = {
  id: 21,
  name: "Invoice triage",
  order: 1,
  enabled: true,
  triggers: [createDefaultTrigger()],
  actions: [createDefaultAction()],
}

function renderWorkflowsTable(
  permissionCodes: string[] = [
    "view_workflow",
    "change_workflow",
    "delete_workflow",
    "add_workflow",
  ]
) {
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
        <WorkflowsTable initialItems={[baseWorkflow]} lookups={lookups} />
      </PermissionsProvider>
    </JotaiProvider>
  )
}

describe("buildWorkflowPayload", () => {
  beforeEach(() => {
    postJsonMock.mockReset()
    patchJsonMock.mockReset()
    deleteJsonMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
  })

  it("serializes NGX workflow payloads using typed triggers and actions", () => {
    const payload = buildWorkflowPayload(
      {
        id: 99,
        name: "  Scheduled cleanup  ",
        order: "",
        enabled: true,
        triggers: [
          {
            ...createDefaultTrigger(),
            id: 31,
            type: WorkflowTriggerType.Scheduled,
            filter_filename: " invoice ",
            matching_algorithm: 4,
            match: " INV-[0-9]+ ",
            is_insensitive: true,
            filter_has_tags: [4],
            filter_has_correspondent: 6,
            filter_custom_field_query: ' {"operator":"and"} ',
            schedule_offset_days: 14,
            schedule_is_recurring: true,
            schedule_recurring_interval_days: 30,
            schedule_date_field: ScheduleDateField.CustomField,
            schedule_date_custom_field: 9,
          },
          {
            ...createDefaultTrigger(),
            id: 32,
            type: WorkflowTriggerType.Consumption,
            sources: [DocumentSource.MailFetch],
            filter_filename: " pdf ",
            filter_path: "Inbox",
            filter_mailrule: 13,
          },
        ],
        actions: [
          {
            ...createDefaultAction(),
            id: 41,
            type: WorkflowActionType.Assignment,
            assign_title: "  Normalized title ",
            assign_tags: [4],
            assign_document_type: 7,
            assign_correspondent: 6,
            assign_storage_path: 8,
            assign_owner: 11,
            assign_view_users: [11],
            assign_view_groups: [12],
            assign_change_users: [11],
            assign_change_groups: [12],
            assign_custom_fields: [9],
            assign_custom_fields_values: { "9": "2026-03-25" },
          },
          {
            ...createDefaultAction(),
            id: 42,
            type: WorkflowActionType.Webhook,
            webhook: {
              url: " https://example.com/workflow ",
              use_params: true,
              as_json: true,
              include_document: true,
              headers: { Authorization: "Bearer token" },
              params: { source: "paperless" },
              body: "  ping  ",
            },
          },
        ],
      },
      3
    )

    expect(payload).toEqual({
      name: "Scheduled cleanup",
      enabled: true,
      order: 4,
      triggers: [
        expect.objectContaining({
          id: 31,
          type: WorkflowTriggerType.Scheduled,
          filter_filename: "invoice",
          matching_algorithm: 4,
          match: "INV-[0-9]+",
          is_insensitive: true,
          filter_has_tags: [4],
          filter_has_correspondent: 6,
          filter_custom_field_query: '{"operator":"and"}',
          schedule_offset_days: 14,
          schedule_is_recurring: true,
          schedule_recurring_interval_days: 30,
          schedule_date_field: ScheduleDateField.CustomField,
          schedule_date_custom_field: 9,
        }),
        expect.objectContaining({
          id: 32,
          type: WorkflowTriggerType.Consumption,
          sources: [DocumentSource.MailFetch],
          filter_filename: "pdf",
          filter_path: "Inbox",
          filter_mailrule: 13,
        }),
      ],
      actions: [
        expect.objectContaining({
          id: 41,
          type: WorkflowActionType.Assignment,
          assign_title: "Normalized title",
          assign_tags: [4],
          assign_document_type: 7,
          assign_correspondent: 6,
          assign_storage_path: 8,
          assign_owner: 11,
          assign_view_users: [11],
          assign_view_groups: [12],
          assign_change_users: [11],
          assign_change_groups: [12],
          assign_custom_fields: [9],
          assign_custom_fields_values: { "9": "2026-03-25" },
        }),
        expect.objectContaining({
          id: 42,
          type: WorkflowActionType.Webhook,
          webhook: {
            url: "https://example.com/workflow",
            use_params: true,
            as_json: true,
            include_document: true,
            headers: { Authorization: "Bearer token" },
            params: { source: "paperless" },
            body: "ping",
          },
        }),
      ],
    })
  })
})

describe("WorkflowsTable", () => {
  beforeEach(() => {
    postJsonMock.mockReset()
    patchJsonMock.mockReset()
    deleteJsonMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
  })

  it("creates a workflow from the editor dialog", async () => {
    postJsonMock.mockResolvedValue({
      ...baseWorkflow,
      id: 99,
      name: "Nightly cleanup",
    })

    renderWorkflowsTable()

    fireEvent.click(screen.getByRole("button", { name: "New workflow" }))
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Nightly cleanup" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create workflow" }))

    await waitFor(() => {
      expect(postJsonMock).toHaveBeenCalledWith(
        "/api/proxy/workflows/",
        expect.objectContaining({
          name: "Nightly cleanup",
          triggers: [expect.any(Object)],
          actions: [expect.any(Object)],
        })
      )
    })
  })

  it("updates an existing workflow", async () => {
    patchJsonMock.mockResolvedValue({
      ...baseWorkflow,
      name: "Invoice triage updated",
    })

    renderWorkflowsTable()

    fireEvent.click(screen.getByRole("button", { name: "Edit Invoice triage" }))
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Invoice triage updated" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save workflow" }))

    await waitFor(() => {
      expect(patchJsonMock).toHaveBeenCalledWith(
        "/api/proxy/workflows/21/",
        expect.objectContaining({
          name: "Invoice triage updated",
        })
      )
    })
  })

  it("duplicates a workflow through the create flow", async () => {
    postJsonMock.mockResolvedValue({
      ...baseWorkflow,
      id: 88,
      name: "Invoice triage (copy)",
    })

    renderWorkflowsTable()

    fireEvent.click(screen.getByRole("button", { name: "Copy Invoice triage" }))
    expect(screen.getByDisplayValue("Invoice triage (copy)")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Create workflow" }))

    await waitFor(() => {
      expect(postJsonMock).toHaveBeenCalledWith(
        "/api/proxy/workflows/",
        expect.objectContaining({
          name: "Invoice triage (copy)",
        })
      )
    })
  })

  it("deletes a workflow after confirmation", async () => {
    deleteJsonMock.mockResolvedValue(undefined)

    renderWorkflowsTable()

    fireEvent.click(screen.getByRole("button", { name: "Delete Invoice triage" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() => {
      expect(deleteJsonMock).toHaveBeenCalledWith("/api/proxy/workflows/21/")
    })
  })

  it("hides change, delete, duplicate, and reorder affordances when permissions are missing", () => {
    renderWorkflowsTable(["view_workflow"])

    expect(screen.queryByRole("button", { name: "New workflow" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Edit Invoice triage" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Copy Invoice triage" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Delete Invoice triage" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Drag to reorder" })).not.toBeInTheDocument()
  })
})
