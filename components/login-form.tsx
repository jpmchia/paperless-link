"use client"

import * as React from "react"
import { signIn } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type {
  PaperlessSsoPendingState,
  PaperlessSsoProvider,
} from "@/lib/paperless-sso"

function resolveErrorMessage(error: string | null) {
  switch (error) {
    case "CredentialsSignin":
    case "credentials":
      return "Invalid username or password."
    case "AccessDenied":
      return "Access denied."
    default:
      return error ? "Unable to complete sign in." : null
  }
}

interface LoginFormProps {
  callbackUrl: string
  errorMessage: string | null
  paperlessSsoProviders: PaperlessSsoProvider[]
  paperlessSsoState: PaperlessSsoPendingState
}

export function LoginForm({
  callbackUrl,
  errorMessage,
  paperlessSsoProviders,
  paperlessSsoState,
}: LoginFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [localError, setLocalError] = React.useState<string | null>(errorMessage)
  const showProviderSignup = paperlessSsoState === "provider-signup"

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setLocalError(null)

    const formData = new FormData(event.currentTarget)
    const username = String(formData.get("username") ?? "")
    const password = String(formData.get("password") ?? "")

    const result = await signIn("credentials", {
      callbackUrl,
      password,
      redirect: false,
      username,
    })

    if (result?.error) {
      setLocalError(resolveErrorMessage(result.error))
      setIsSubmitting(false)
      return
    }

    window.location.assign(result?.url ?? callbackUrl)
  }

  return (
    <>
      <CardContent className="space-y-4 py-5">
        {localError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/8 px-3 py-2 text-xs text-destructive dark:border-destructive/40 dark:bg-destructive/12">
            {localError}
          </div>
        ) : null}

        {showProviderSignup ? (
          <form
            action="/api/auth/paperless-sso/signup"
            className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4"
            method="post"
          >
            <input name="callbackUrl" type="hidden" value={callbackUrl} />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Complete your social sign in
              </p>
              <p className="text-xs text-muted-foreground">
                Paperless needs an email address before Link can create your
                session.
              </p>
            </div>
            <div className="space-y-2">
              <label
                className="text-xs font-medium text-foreground"
                htmlFor="paperless-sso-email"
              >
                Email address
              </label>
              <Input
                autoComplete="email"
                id="paperless-sso-email"
                name="email"
                required
                type="email"
              />
            </div>
            <Button className="w-full" type="submit" variant="outline">
              Complete Paperless sign in
            </Button>
          </form>
        ) : null}

        {paperlessSsoProviders.length > 0 ? (
          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Continue with Paperless SSO
              </p>
              <p className="text-xs text-muted-foreground">
                Delegate authentication to your configured Paperless identity
                provider.
              </p>
            </div>

            <div className="space-y-2">
              {paperlessSsoProviders.map((provider) => (
                <form
                  action="/api/auth/paperless-sso/start"
                  key={provider.id}
                  method="post"
                >
                  <input name="provider" type="hidden" value={provider.id} />
                  <input name="callbackUrl" type="hidden" value={callbackUrl} />
                  <Button className="w-full" type="submit" variant="outline">
                    Continue with {provider.name}
                  </Button>
                </form>
              ))}
            </div>
          </div>
        ) : null}

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-2 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Or use credentials
            </span>
          </div>
        </div>

        <form
          className="space-y-4"
          id="credentials-login-form"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="space-y-2">
            <label
              className="text-xs font-medium text-foreground"
              htmlFor="username"
            >
              Username
            </label>
            <Input
              autoComplete="username"
              id="username"
              name="username"
              placeholder="admin"
              required
              type="text"
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-xs font-medium text-foreground"
              htmlFor="password"
            >
              Password
            </label>
            <Input
              autoComplete="current-password"
              id="password"
              name="password"
              required
              type="password"
            />
          </div>
        </form>
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-3 border-t border-border/60 py-5">
        <Button
          className="w-full"
          disabled={isSubmitting}
          form="credentials-login-form"
          size="lg"
          type="submit"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Authentication is delegated to your Paperless-ngx repository.
        </p>
      </CardFooter>
    </>
  )
}
