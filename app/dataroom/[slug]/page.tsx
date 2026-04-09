"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { useTheme } from "next-themes"
import { postJson } from "@/lib/paperless-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ModeToggle } from "@/components/theme-toggle"

export default function DataroomLoginPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug || ""
  const [email, setEmail] = React.useState("")
  const [status, setStatus] = React.useState<string>("")
  const [roomTitle, setRoomTitle] = React.useState("Dataroom access")
  const [loginLogoURL, setLoginLogoURL] = React.useState("")
  const [loginLogoDarkURL, setLoginLogoDarkURL] = React.useState("")
  const [logoLoadFailed, setLogoLoadFailed] = React.useState(false)
  const { resolvedTheme } = useTheme()
  const effectiveLogoURL = resolvedTheme === "dark" ? loginLogoDarkURL || loginLogoURL : loginLogoURL

  React.useEffect(() => {
    const loadPublicConfig = async () => {
      if (!slug) return
      try {
        const response = await fetch(
          `/api/link-iq/dataroom-public/config?slug=${encodeURIComponent(slug)}`,
          { cache: "no-store" },
        )
        if (!response.ok) return
        const payload = (await response.json()) as {
          dataroom?: { title?: string; login_logo_url?: string; login_logo_dark_url?: string }
        }
        setRoomTitle(payload.dataroom?.title?.trim() || "Dataroom access")
        setLoginLogoURL(payload.dataroom?.login_logo_url?.trim() || "")
        setLoginLogoDarkURL(payload.dataroom?.login_logo_dark_url?.trim() || "")
        setLogoLoadFailed(false)
      } catch {
        // Keep default title/logo when metadata fetch fails.
      }
    }
    void loadPublicConfig()
  }, [slug])

  React.useEffect(() => {
    setLogoLoadFailed(false)
  }, [effectiveLogoURL])

  const requestLink = async () => {
    setStatus("")
    try {
      const payload = await postJson<{ issued?: boolean; magic_link?: string }>(
        "/api/link-iq/dataroom-public/request-link",
        {
          slug,
          email,
          purpose: "login",
        }
      )
      setStatus(
        payload.magic_link
          ? `Magic link issued. ${payload.magic_link}`
          : "If this email is eligible, a magic link has been sent."
      )
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to request login link")
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-3xl items-stretch overflow-hidden rounded-xl border bg-card shadow-sm">
        {effectiveLogoURL ? (
          <div className="flex min-h-[260px] min-w-[260px] shrink-0 items-stretch border-r bg-muted/10">
            {logoLoadFailed ? (
              <div className="flex w-full items-center justify-center p-3 text-center text-muted-foreground text-xs">
                Branding logo failed to load
              </div>
            ) : (
              <img
                src={effectiveLogoURL}
                alt="Dataroom branding logo"
                className="block h-full w-auto max-w-none object-contain"
                onError={() => setLogoLoadFailed(true)}
              />
            )}
          </div>
        ) : null}
        <div className="relative flex-1 p-6 pb-14">
          <h1 className="text-xl font-semibold">{roomTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Please enter your email address</p>
          <div className="mt-4 flex gap-2">
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="you@example.com"
            />
            <Button onClick={() => void requestLink()}>Go</Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Ensure to use the registered email address that invitation was sent to. <br />
            You will require access to that inbox to receive and use the login link to access the dataroom.
          </p>
          {status ? <p className="mt-3 text-sm">{status}</p> : null}
          <div className="absolute right-4 bottom-4">
            <ModeToggle />
          </div>
        </div>
      </div>
    </div>
  )
}
