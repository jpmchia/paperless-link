"use client"

import * as React from "react"
import { ServerCrash, Wifi, WifiOff } from "lucide-react"
import { toast } from "sonner"
import DialogApiError, {
  type ApiErrorDetails,
} from "@/components/blocks/dialog/dialog-api-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getJson } from "@/lib/paperless-client"

type HealthResponse = {
  checked_at?: string
  error?: string
  ok?: boolean
  service?: string
  status?: string
}

type ConnectionStatus = "checking" | "online" | "offline"

const POLL_INTERVAL_MS = 15000

function buildError(response: HealthResponse): ApiErrorDetails {
  return {
    code: response.ok ? 200 : 503,
    details:
      response.error ||
      "The Paperless Link frontend could not reach the link-iq backend service.",
    endpoint: "/api/link-iq/health",
    message: response.ok
      ? "link-iq is reachable again."
      : "The link-iq backend connection was lost.",
    requestId: undefined,
    timestamp: new Date(response.checked_at || Date.now()),
    type: "network",
  }
}

export function LinkIQConnectionStatus() {
  const [status, setStatus] = React.useState<ConnectionStatus>("checking")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [error, setError] = React.useState<ApiErrorDetails>(() =>
    buildError({ checked_at: new Date().toISOString(), ok: false })
  )
  const hasShownForCurrentOutageRef = React.useRef(false)

  const checkHealth = React.useCallback(async () => {
    try {
      const response = await getJson<HealthResponse>("/api/link-iq/health")
      if (response.ok) {
        setStatus((current) => {
          if (current === "offline") {
            toast.success("link-iq connection restored")
          }
          return "online"
        })
        setDialogOpen(false)
        hasShownForCurrentOutageRef.current = false
        return true
      }

      const nextError = buildError(response)
      setError(nextError)
      setStatus("offline")
      if (!hasShownForCurrentOutageRef.current) {
        toast.error("Lost connection to link-iq", {
          description: nextError.details,
        })
        setDialogOpen(true)
        hasShownForCurrentOutageRef.current = true
      }
      return false
    } catch (requestError) {
      const nextError = buildError({
        checked_at: new Date().toISOString(),
        error:
          requestError instanceof Error
            ? requestError.message
            : "Failed to connect to link-iq",
        ok: false,
      })
      setError(nextError)
      setStatus("offline")
      if (!hasShownForCurrentOutageRef.current) {
        toast.error("Lost connection to link-iq", {
          description: nextError.details,
        })
        setDialogOpen(true)
        hasShownForCurrentOutageRef.current = true
      }
      return false
    }
  }, [])

  React.useEffect(() => {
    void checkHealth()
    const intervalId = window.setInterval(() => {
      void checkHealth()
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [checkHealth])

  if (status === "checking") {
    return (
      <Badge variant="secondary" className="hidden h-8 items-center gap-1 px-2 text-xs md:inline-flex">
        <ServerCrash className="size-3.5" />
        Checking link-iq
      </Badge>
    )
  }

  return (
    <>
      {status === "online" ? (
        <Badge
          variant="outline"
          className="hidden h-8 items-center gap-1 px-2 text-xs md:inline-flex"
        >
          <Wifi className="size-3.5 text-emerald-500" />
          link-iq online
        </Badge>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          className="hidden h-8 items-center gap-1 px-2 text-xs md:inline-flex"
          onClick={() => setDialogOpen(true)}
        >
          <WifiOff className="size-3.5 text-orange-500" />
          link-iq offline
        </Button>
      )}

      <DialogApiError
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        error={error}
        onRetry={async () => {
          await checkHealth()
        }}
        title="link-iq backend unavailable"
        description="Paperless Link cannot currently reach the link-iq backend service. Features that depend on taxonomy, AI, business context, or domain modeling may fail until the connection is restored."
      />
    </>
  )
}
