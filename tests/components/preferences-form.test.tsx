import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GlobalSearchType } from "@/data/ui-settings"
import { PreferencesForm } from "@/app/profile/preferences-form"

const refreshMock = vi.fn()
const updateUiSettingsMock = vi.fn()
const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}))

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}))

vi.mock("@/app/actions/ui-settings", () => ({
  updateUiSettings: (...args: unknown[]) => updateUiSettingsMock(...args),
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
      id,
    }: {
      children: React.ReactNode
      "aria-label"?: string
      id?: string
    }) => {
      const context = ReactModule.useContext(SelectContext)
      return (
        <select
          aria-label={ariaLabel}
          id={id}
          value={context?.value ?? ""}
          onChange={(event) => context?.onValueChange?.(event.target.value)}
        >
          {children}
        </select>
      )
    },
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({
      children,
      value,
    }: {
      children: React.ReactNode
      value: string
    }) => <option value={value}>{children}</option>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => (
      <option value="">{placeholder ?? ""}</option>
    ),
  }
})

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    "aria-label": ariaLabel,
    id,
  }: {
    checked: boolean
    onCheckedChange?: (checked: boolean) => void
    "aria-label"?: string
    id?: string
  }) => (
    <input
      type="checkbox"
      aria-label={ariaLabel}
      id={id}
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}))

describe("PreferencesForm", () => {
  beforeEach(() => {
    refreshMock.mockReset()
    updateUiSettingsMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
    updateUiSettingsMock.mockResolvedValue(undefined)
  })

  const initialSettings = {
    settings: {
      dark_mode: {
        thumb_inverted: false,
      },
      date_display: {
        date_format: "longDate",
        date_locale: "en-GB",
      },
      default_page_size: 50,
      notifications: {
        consumer_failed: false,
        consumer_new_documents: true,
        consumer_success: false,
        consumer_suppress_on_dashboard: false,
      },
      notifications_document_updated: true,
      search: {
        db_only: true,
        more_link: GlobalSearchType.ADVANCED,
      },
      slim_sidebar: true,
      theme: {
        color: "#123456",
      },
      theme_preset_id: "preset-1",
    },
  }

  const themePresets = [
    {
      id: "preset-1",
      name: "Classic",
      updatedAt: "2026-08-01T00:00:00.000Z",
    },
  ]

  it("renders NGX-aligned preference sections and reset controls", () => {
    render(
      <PreferencesForm initialSettings={initialSettings} themePresets={themePresets} />
    )

    expect(screen.getByText("Display")).toBeInTheDocument()
    expect(screen.getByText("Documents")).toBeInTheDocument()
    expect(screen.getByText("Search")).toBeInTheDocument()
    expect(screen.getByText("Notifications")).toBeInTheDocument()

    expect(screen.getByLabelText("Date locale")).toBeInTheDocument()
    expect(screen.getByLabelText("Date style")).toBeInTheDocument()
    expect(screen.getByLabelText("Theme preset")).toBeInTheDocument()
    expect(screen.getByLabelText("Theme color override")).toBeInTheDocument()
    expect(screen.getByLabelText("Default page size")).toBeInTheDocument()
    expect(screen.getByLabelText("Full search links to")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reset theme color" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reset theme preset" })).toBeInTheDocument()
  })

  it("saves nested preference patches through the adapter", async () => {
    render(
      <PreferencesForm initialSettings={initialSettings} themePresets={themePresets} />
    )

    fireEvent.click(screen.getByRole("button", { name: "Reset theme color" }))
    fireEvent.click(screen.getByRole("button", { name: "Reset theme preset" }))
    fireEvent.click(screen.getByRole("button", { name: /Save preferences/i }))

    await waitFor(() => {
      expect(updateUiSettingsMock).toHaveBeenCalledWith({
        dark_mode: {
          thumb_inverted: false,
        },
        date_display: {
          date_format: "longDate",
          date_locale: "en-GB",
        },
        default_page_size: 50,
        notifications: {
          consumer_failed: false,
          consumer_new_documents: true,
          consumer_success: false,
          consumer_suppress_on_dashboard: false,
        },
        notifications_document_added: false,
        notifications_document_updated: true,
        search: {
          db_only: true,
          more_link: GlobalSearchType.ADVANCED,
        },
        slim_sidebar: true,
        theme: {
          color: "",
        },
        theme_preset_id: null,
      })
    })

    expect(refreshMock).toHaveBeenCalled()
  })
})
