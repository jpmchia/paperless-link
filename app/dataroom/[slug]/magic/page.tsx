"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { postJson } from "@/lib/paperless-client"

export default function DataroomMagicPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get("token") || ""
  const [status, setStatus] = React.useState("Validating magic link...")

  React.useEffect(() => {
    const run = async () => {
      if (!token) {
        setStatus("Missing token")
        return
      }
      try {
        const result = await postJson<{ session?: string; dataroom?: { slug?: string } }>(
          "/api/link-iq/dataroom-public/consume",
          { token }
        )
        if (!result.session) {
          setStatus("Unable to establish dataroom session")
          return
        }
        window.sessionStorage.setItem("dataroom_session", result.session)
        const slug = result.dataroom?.slug || ""
        router.replace(`/dataroom/${slug}/view`)
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Failed to consume magic link")
      }
    }
    void run()
  }, [router, token])

  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">{status}</p>
    </div>
  )
}
