"use client"

import * as React from "react"
import { Mail, Send } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog as DraggableDialog,
  DialogBody as DraggableDialogBody,
  DialogContent as DraggableDialogContent,
  DialogDescription as DraggableDialogDescription,
  DialogFooter as DraggableDialogFooter,
  DialogHeader as DraggableDialogHeader,
  DialogTitle as DraggableDialogTitle,
} from "@/components/draggable-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  buildDocumentEmailPayload,
  validateDocumentEmailAddresses,
} from "@/lib/document-email"

export type EmailDocumentsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentIds: number[]
  documentLabel: string
  hasArchiveVersion: boolean
  versionLabel?: string | null
}

export function EmailDocumentsDialog({
  open,
  onOpenChange,
  documentIds,
  documentLabel,
  hasArchiveVersion,
  versionLabel,
}: EmailDocumentsDialogProps) {
  const [addresses, setAddresses] = React.useState("")
  const [subject, setSubject] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [useArchiveVersion, setUseArchiveVersion] = React.useState(hasArchiveVersion)
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    setUseArchiveVersion(hasArchiveVersion)
  }, [hasArchiveVersion])

  React.useEffect(() => {
    if (open) return
    setAddresses("")
    setSubject("")
    setMessage("")
    setUseArchiveVersion(hasArchiveVersion)
  }, [hasArchiveVersion, open])

  const invalidAddresses = validateDocumentEmailAddresses(addresses)
  const formInvalid =
    addresses.trim().length === 0 ||
    subject.trim().length === 0 ||
    message.trim().length === 0 ||
    invalidAddresses.length > 0 ||
    documentIds.length === 0

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (formInvalid || pending) return

    const payload = buildDocumentEmailPayload({
      documentIds,
      addresses,
      subject,
      message,
      useArchiveVersion: hasArchiveVersion ? useArchiveVersion : false,
    })

    setPending(true)
    try {
      const response = await fetch("/api/proxy/documents/email/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok && response.status !== 204) {
        throw new Error(await response.text())
      }
      toast.success("Email sent")
      onOpenChange(false)
    } catch (error) {
      toast.error("Failed to email document", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <DraggableDialog open={open} onOpenChange={onOpenChange}>
      <DraggableDialogContent initialWidth={720} initialHeight={520} maxWidth={900}>
        <DraggableDialogHeader>
          <DraggableDialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email documents
          </DraggableDialogTitle>
          <DraggableDialogDescription>
            Send <span className="font-medium text-foreground">{documentLabel}</span>
            {versionLabel ? (
              <>
                {" "}
                (<span className="font-medium text-foreground">{versionLabel}</span>)
              </>
            ) : null}{" "}
            by email.
          </DraggableDialogDescription>
        </DraggableDialogHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <DraggableDialogBody className="space-y-5 pb-2">
            <div className="space-y-2">
              <Label htmlFor="email-addresses">Email address(es)</Label>
              <Input
                id="email-addresses"
                autoFocus
                placeholder="name@example.com, second@example.com"
                value={addresses}
                onChange={(event) => setAddresses(event.target.value)}
              />
              {invalidAddresses.length > 0 ? (
                <p className="text-xs text-destructive">
                  Invalid email address: {invalidAddresses.join(", ")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                placeholder="Document subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-message">Message</Label>
              <Textarea
                id="email-message"
                className="min-h-32"
                placeholder="Add a message for the recipient."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>

            <div className="flex items-start gap-3 rounded-md border bg-muted/20 px-3 py-3">
              <Checkbox
                id="email-archive"
                checked={hasArchiveVersion ? useArchiveVersion : false}
                disabled={!hasArchiveVersion}
                onCheckedChange={(checked) => setUseArchiveVersion(Boolean(checked))}
              />
              <div className="space-y-1">
                <Label htmlFor="email-archive">Use archive version</Label>
                <p className="text-xs text-muted-foreground">
                  {hasArchiveVersion
                    ? "When enabled, archive PDFs are attached when available; originals are used as a fallback."
                    : "Archive versions are not available for this selection."}
                </p>
              </div>
            </div>
          </DraggableDialogBody>

          <DraggableDialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={formInvalid || pending}>
              <Send className="mr-2 h-3.5 w-3.5" />
              Send email
            </Button>
          </DraggableDialogFooter>
        </form>
      </DraggableDialogContent>
    </DraggableDialog>
  )
}
