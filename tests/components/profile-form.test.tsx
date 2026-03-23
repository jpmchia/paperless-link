import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ProfileForm } from "@/app/profile/profile-form"
import type { ProfileData } from "@/app/profile/types"

const updateProfileMock = vi.fn()
const generateAuthTokenMock = vi.fn()
const disconnectSocialAccountMock = vi.fn()
const getTotpSettingsMock = vi.fn()
const activateTotpMock = vi.fn()
const deactivateTotpMock = vi.fn()
const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()

vi.mock("next/image", () => ({
  default: (
    props: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }
  ) => {
    const { unoptimized, alt, ...rest } = props
    void unoptimized
    return React.createElement("img", { ...rest, alt: alt ?? "" })
  },
}))

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}))

vi.mock("@/app/profile/actions", () => ({
  updateProfile: (...args: unknown[]) => updateProfileMock(...args),
  generateAuthToken: (...args: unknown[]) => generateAuthTokenMock(...args),
  disconnectSocialAccount: (...args: unknown[]) => disconnectSocialAccountMock(...args),
  getTotpSettings: (...args: unknown[]) => getTotpSettingsMock(...args),
  activateTotp: (...args: unknown[]) => activateTotpMock(...args),
  deactivateTotp: (...args: unknown[]) => deactivateTotpMock(...args),
}))

const profileFixture: ProfileData = {
  id: 1,
  username: "jpmchia",
  email: "jp@example.com",
  first_name: "JP",
  last_name: "Mchia",
  auth_token: "old-token",
  social_accounts: [
    {
      id: 7,
      provider: "google",
      name: "Google Account",
    },
  ],
  has_usable_password: true,
  is_mfa_enabled: false,
}

describe("ProfileForm", () => {
  beforeEach(() => {
    updateProfileMock.mockReset()
    generateAuthTokenMock.mockReset()
    disconnectSocialAccountMock.mockReset()
    getTotpSettingsMock.mockReset()
    activateTotpMock.mockReset()
    deactivateTotpMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it("regenerates the API token and updates the visible value", async () => {
    generateAuthTokenMock.mockResolvedValue("new-token")

    render(<ProfileForm profile={profileFixture} />)

    fireEvent.click(screen.getByRole("button", { name: /Regenerate/i }))

    await waitFor(() => {
      expect(generateAuthTokenMock).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getByDisplayValue("new-token")).toBeInTheDocument()
    })
  })

  it("loads TOTP setup and activates two-factor authentication", async () => {
    getTotpSettingsMock.mockResolvedValue({
      secret: "ABC123",
      qr_svg: "<svg></svg>",
      url: "otpauth://totp/example",
    })
    activateTotpMock.mockResolvedValue({
      success: true,
      recovery_codes: ["code-1", "code-2"],
    })

    render(<ProfileForm profile={profileFixture} />)

    fireEvent.click(screen.getByRole("button", { name: /Set up TOTP/i }))

    await waitFor(() => {
      expect(getTotpSettingsMock).toHaveBeenCalled()
    })

    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "123456" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^Enable$/i }))

    await waitFor(() => {
      expect(activateTotpMock).toHaveBeenCalledWith("ABC123", "123456")
    })

    await waitFor(() => {
      expect(screen.getByText("Recovery codes")).toBeInTheDocument()
    })
  })
})
