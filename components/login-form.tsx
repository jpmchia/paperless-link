"use client"

import * as React from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

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
}

export function LoginForm({ callbackUrl, errorMessage }: LoginFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [localError, setLocalError] = React.useState<string | null>(errorMessage)

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
    <form className="contents" onSubmit={(event) => void handleSubmit(event)}>
      <CardContent className="space-y-4 py-5">
        {localError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/8 px-3 py-2 text-xs text-destructive dark:border-destructive/40 dark:bg-destructive/12">
            {localError}
          </div>
        ) : null}

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
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-3 border-t border-border/60 py-5">
        <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Authentication is delegated to your Paperless-ngx
          repository.
        </p>
      </CardFooter>
    </form>
  )
}
