"use client"

import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  RefreshCw,
  ServerCrash,
  ShieldX,
  Wifi,
  XCircle,
} from "lucide-react"
import * as React from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

export type ApiErrorType = "network" | "timeout" | "auth" | "server" | "client"

export type ApiErrorDetails = {
  code: number
  details?: string
  endpoint?: string
  message: string
  requestId?: string
  timestamp: Date
  type: ApiErrorType
}

const errorConfig: Record<
  ApiErrorType,
  { canRetry: boolean; color: string; icon: React.ElementType }
> = {
  auth: { icon: ShieldX, color: "text-red-500", canRetry: false },
  client: { icon: XCircle, color: "text-destructive", canRetry: false },
  network: { icon: Wifi, color: "text-orange-500", canRetry: true },
  server: { icon: ServerCrash, color: "text-red-500", canRetry: true },
  timeout: { icon: Clock, color: "text-yellow-500", canRetry: true },
}

type DialogApiErrorProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  error: ApiErrorDetails
  onRetry?: () => Promise<void> | void
  supportHref?: string
  title?: string
  description?: string
}

export default function DialogApiError({
  open,
  onOpenChange,
  error,
  onRetry,
  supportHref,
  title = "Connection problem",
  description = "We encountered an error while communicating with a backend service.",
}: DialogApiErrorProps) {
  const [copied, setCopied] = React.useState(false)
  const [isRetrying, setIsRetrying] = React.useState(false)
  const [showDetails, setShowDetails] = React.useState(false)

  const config = errorConfig[error.type]
  const ErrorIcon = config.icon

  const handleRetry = async () => {
    if (!onRetry) return
    setIsRetrying(true)
    try {
      await onRetry()
    } finally {
      setIsRetrying(false)
    }
  }

  const handleCopyError = async () => {
    const errorInfo = `Error Report
--------------
Code: ${error.code}
Message: ${error.message}
Details: ${error.details || "n/a"}
Request ID: ${error.requestId || "n/a"}
Endpoint: ${error.endpoint || "n/a"}
Timestamp: ${error.timestamp.toISOString()}
User Agent: ${typeof navigator !== "undefined" ? navigator.userAgent : "N/A"}`

    await navigator.clipboard.writeText(errorInfo)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const getStatusBadgeVariant = (code: number) => {
    if (code >= 500) return "destructive"
    if (code >= 400) return "secondary"
    return "outline"
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "medium",
    })
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ErrorIcon className={`h-5 w-5 ${config.color}`} />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(error.code)}>{error.code}</Badge>
              <span className="text-sm text-muted-foreground">
                {error.type.charAt(0).toUpperCase() + error.type.slice(1)} Error
              </span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {error.details || "No further details were returned by the service."}
          </p>

          <Collapsible onOpenChange={setShowDetails} open={showDetails}>
            <CollapsibleTrigger asChild>
              <Button className="w-full justify-between" size="sm" variant="ghost">
                Technical Details
                {showDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2 rounded-lg border p-3 text-xs font-mono">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Request ID:</span>
                  <span>{error.requestId || "n/a"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Endpoint:</span>
                  <span>{error.endpoint || "n/a"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Timestamp:</span>
                  <span>{formatTimestamp(error.timestamp)}</span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          <div className="flex items-center justify-between text-sm">
            <Button className="h-8" onClick={() => void handleCopyError()} size="sm" variant="ghost">
              {copied ? (
                <>
                  <Check className="mr-2 h-3 w-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-3 w-3" />
                  Copy Error Info
                </>
              )}
            </Button>
            {supportHref ? (
              <Button asChild className="h-8" size="sm" variant="link">
                <a href={supportHref} rel="noopener noreferrer" target="_blank">
                  Contact Support
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            ) : null}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Dismiss
          </Button>
          {config.canRetry && onRetry ? (
            <Button disabled={isRetrying} onClick={() => void handleRetry()}>
              {isRetrying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </>
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
