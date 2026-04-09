"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { postJson } from "@/lib/paperless-client"

type Props = {
  slug: string
}

export function DataroomViewerSurface({ slug }: Props) {
  const router = useRouter()
  const [status, setStatus] = React.useState("Loading dataroom...")

  React.useEffect(() => {
    const run = async () => {
      const token = window.sessionStorage.getItem("dataroom_session")
      if (!token) {
        router.replace(`/dataroom/${slug}`)
        return
      }
      try {
        await postJson("/api/link-iq/dataroom-public/validate-session", { token, slug })
        setStatus("")
      } catch {
        window.sessionStorage.removeItem("dataroom_session")
        router.replace(`/dataroom/${slug}`)
      }
    }
    void run()
  }, [router, slug])

  return (
    <section className="flex min-w-0 flex-1">
      <div className="w-96 shrink-0 border-r p-4">
        <h2 className="font-medium">Document details</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Dataroom-configured metadata tabs render here.
        </p>
      </div>
      <div className="min-w-0 flex-1 p-4">
        {status ? (
          <p className="text-sm text-muted-foreground">{status}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Inline PDF viewer renders here.</p>
        )}
      </div>
    </section>
  )
}
