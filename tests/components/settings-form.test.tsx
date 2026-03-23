import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SettingsForm } from "@/app/settings/settings-form"

const updateConfigMock = vi.fn()
const uploadConfigLogoMock = vi.fn()
const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}))

vi.mock("@/app/config/actions", () => ({
  updateConfig: (...args: unknown[]) => updateConfigMock(...args),
  uploadConfigLogo: (...args: unknown[]) => uploadConfigLogoMock(...args),
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
    SelectTrigger: ({ children }: { children: React.ReactNode }) => {
      const context = ReactModule.useContext(SelectContext)
      return (
        <select
          aria-label="Select value"
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
  }: {
    checked: boolean
    onCheckedChange?: (checked: boolean) => void
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}))

describe("SettingsForm", () => {
  beforeEach(() => {
    updateConfigMock.mockReset()
    uploadConfigLogoMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
  })

  it("persists edited configuration values", async () => {
    updateConfigMock.mockResolvedValue({
      id: 1,
      app_title: "TerraNet Paperless",
      app_logo: "/logo/current.png",
      ai_enabled: false,
    })

    const { container } = render(
      <SettingsForm
        initialConfig={{
          id: 1,
          app_title: "Paperless",
          app_logo: "/logo/current.png",
          ai_enabled: false,
        }}
      />
    )

    const titleInput = container.querySelector(
      'input[type="text"][value="Paperless"]'
    ) as HTMLInputElement | null

    expect(titleInput).not.toBeNull()
    fireEvent.change(titleInput!, {
      target: { value: "TerraNet Paperless" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Save configuration/i }))

    await waitFor(() => {
      expect(updateConfigMock).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          app_title: "TerraNet Paperless",
          ai_enabled: false,
        })
      )
    })

    expect(uploadConfigLogoMock).not.toHaveBeenCalled()
  })

  it("uploads the staged logo before saving the rest of the configuration", async () => {
    uploadConfigLogoMock.mockResolvedValue({
      id: 1,
      app_title: "Paperless",
      app_logo: "/logo/uploaded.png",
    })
    updateConfigMock.mockResolvedValue({
      id: 1,
      app_title: "Paperless",
      app_logo: "/logo/uploaded.png",
    })

    const { container } = render(
      <SettingsForm
        initialConfig={{
          id: 1,
          app_title: "Paperless",
          app_logo: "/logo/current.png",
        }}
      />
    )

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement | null

    expect(fileInput).not.toBeNull()
    const file = new File(["logo"], "logo.png", { type: "image/png" })
    fireEvent.change(fileInput!, {
      target: { files: [file] },
    })

    fireEvent.click(screen.getByRole("button", { name: /Upload and save now/i }))

    await waitFor(() => {
      expect(uploadConfigLogoMock).toHaveBeenCalledWith(1, file)
    })

    await waitFor(() => {
      expect(updateConfigMock).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          app_title: "Paperless",
        })
      )
    })
  })
})
