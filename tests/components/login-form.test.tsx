import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const signInMock = vi.fn()

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}))

import { LoginForm } from "@/components/login-form"

describe("LoginForm", () => {
  beforeEach(() => {
    signInMock.mockReset()
  })

  it("keeps credentials login working when SSO providers are present", async () => {
    signInMock.mockResolvedValue({
      error: undefined,
      url: "/documents",
    })

    const assignMock = vi.fn()
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        assign: assignMock,
      },
    })

    render(
      <LoginForm
        callbackUrl="/documents"
        errorMessage={null}
        paperlessSsoProviders={[{ id: "openid", name: "Paperless SSO" }]}
        paperlessSsoState={null}
      />
    )

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "alice" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }))

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith("credentials", {
        callbackUrl: "/documents",
        password: "secret",
        redirect: false,
        username: "alice",
      })
    })

    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith("/documents")
    })
  })

  it("renders delegated SSO entry points with safe callback propagation", () => {
    render(
      <LoginForm
        callbackUrl="/dashboard?tab=recent"
        errorMessage={null}
        paperlessSsoProviders={[
          { id: "google", name: "Google" },
          { id: "openid", name: "OpenID Connect" },
        ]}
        paperlessSsoState={null}
      />
    )

    expect(
      screen.getByRole("button", { name: "Continue with Google" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Continue with OpenID Connect" })
    ).toBeInTheDocument()

    const callbackFields = screen.getAllByDisplayValue("/dashboard?tab=recent")
    expect(callbackFields).toHaveLength(2)
  })

  it("renders the provider signup continuation form for pending social signup", () => {
    render(
      <LoginForm
        callbackUrl="/dashboard"
        errorMessage="Complete your Paperless account setup to continue."
        paperlessSsoProviders={[{ id: "openid", name: "Paperless SSO" }]}
        paperlessSsoState="provider-signup"
      />
    )

    expect(
      screen.getByRole("textbox", { name: "Email address" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Complete Paperless sign in" })
    ).toBeInTheDocument()
    expect(screen.getByText("Complete your Paperless account setup to continue."))
      .toBeInTheDocument()
  })
})
