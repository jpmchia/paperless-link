"use client"

import * as React from "react"
import { toast } from "sonner"
import { Mail, Send } from "lucide-react"
import { postJson } from "@/lib/paperless-client"
import { useAsyncAction } from "@/hooks/use-async-action"
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

interface EmailDocumentDialogProps {
  documentId: number
  documentTitle: string
  hasArchiveVersion: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EmailDocumentDialog({
  documentId,
  documentTitle,
  hasArchiveVersion,
  open,
  onOpenChange,
}: EmailDocumentDialogProps) {
  const [addresses, setAddresses] = React.useState("")
  const [subject, setSubject] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [useArchiveVersion, setUseArchiveVersion] = React.useState(hasArchiveVersion)

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

  const { pending, run } = useAsyncAction({
    action: async (payload: Record<string, unknown>) =>
      postJson<unknown>("/api/proxy/documents/email/", payload),
    errorMessage: "Failed to email document",
    onSuccess: () => {
      toast.success("Email sent")
      onOpenChange(false)
    },
  })

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    await run({
      documents: [documentId],
      addresses: addresses.trim(),
      subject: subject.trim(),
      message: message.trim(),
      use_archive_version: hasArchiveVersion ? useArchiveVersion : false,
    })
  }

  const formInvalid =
    addresses.trim().length === 0 ||
    subject.trim().length === 0 ||
    message.trim().length === 0

  return (
    <DraggableDialog open={open} onOpenChange={onOpenChange}>
      <DraggableDialogContent initialWidth={720} initialHeight={520} maxWidth={900}>
        <DraggableDialogHeader>
          <DraggableDialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Document
          </DraggableDialogTitle>
          <DraggableDialogDescription>
            Send <span className="font-medium text-foreground">{documentTitle}</span> by email.
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
                id="use-archive-version"
                checked={hasArchiveVersion ? useArchiveVersion : false}
                disabled={!hasArchiveVersion}
                onCheckedChange={(checked) => setUseArchiveVersion(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="use-archive-version" className="text-sm font-medium">
                  Use archive version
                </Label>
                <p className="text-xs text-muted-foreground">
                  {hasArchiveVersion
                    ? "Send the archived version of the document when available."
                    : "This document does not have an archive version available."}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Some email servers may reject messages with large attachments.
            </p>
          </DraggableDialogBody>

          <DraggableDialogFooter className="items-center justify-between gap-2 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              The document will be sent using the Paperless backend email configuration.
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || formInvalid}>
                <Send className="mr-2 h-4 w-4" />
                {pending ? "Sending..." : "Send email"}
              </Button>
            </div>
          </DraggableDialogFooter>
        </form>
      </DraggableDialogContent>
    </DraggableDialog>
  )
}
