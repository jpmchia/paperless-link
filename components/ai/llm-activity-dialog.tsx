"use client"

import * as React from "react"
import { History, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/draggable-dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { LLMExecutionEntry } from "@/lib/llm-activity"

export type LLMAuditEntry = {
  id: string
  changed_at?: string
  changed_by?: string
  summary: string
  status?: string
}

type Props = {
  auditEntries: LLMAuditEntry[]
  auditLoading?: boolean
  auditTargetLabel?: string
  executionEntries: LLMExecutionEntry[]
  executionEmptyMessage?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
}

function formatDateTime(value?: string) {
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function LLMActivityDialog({
  auditEntries,
  auditLoading = false,
  auditTargetLabel,
  executionEntries,
  executionEmptyMessage = "No LLM executions have been recorded yet.",
  open,
  onOpenChange,
  title,
  description,
}: Props) {
  return (
    <Dialog modal={false} open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlay={false}
        draggable
        resizable
        initialWidth={940}
        initialHeight={720}
        minWidth={720}
        maxWidth={1280}
        minHeight={480}
        maxHeight={920}
      >
        <DialogHeader
          headerRight={
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {executionEntries.length} execution
                {executionEntries.length === 1 ? "" : "s"}
              </Badge>
              <Badge variant="secondary">
                {auditEntries.length} audit entr
                {auditEntries.length === 1 ? "y" : "ies"}
              </Badge>
            </div>
          }
        >
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogBody className="pt-2">
          <Tabs defaultValue="executions" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="w-fit">
              <TabsTrigger value="executions">
                <Sparkles className="size-4" />
                Executions
              </TabsTrigger>
              <TabsTrigger value="audit">
                <History className="size-4" />
                Audit history
              </TabsTrigger>
            </TabsList>

            <TabsContent value="executions" className="mt-4 min-h-0 flex-1">
              <ScrollArea className="h-[520px] rounded-lg border bg-background">
                <div className="space-y-4 p-4">
                  {executionEntries.length > 0 ? (
                    executionEntries.map((entry) => (
                      <div
                        key={entry.execution_id}
                        className="rounded-lg border bg-muted/20 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{entry.trigger}</Badge>
                          {entry.process_label ? (
                            <Badge variant="secondary">{entry.process_label}</Badge>
                          ) : null}
                          {entry.model_label ? (
                            <Badge variant="secondary">{entry.model_label}</Badge>
                          ) : null}
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(entry.generated_at)}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                          <section className="space-y-2">
                            <div className="text-xs font-medium tracking-wide text-muted-foreground">
                              Prompt
                            </div>
                            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-background p-3 text-xs leading-6">
                              {entry.prompt || "No prompt captured."}
                            </pre>
                          </section>
                          <section className="space-y-2">
                            <div className="text-xs font-medium tracking-wide text-muted-foreground">
                              Output
                            </div>
                            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-background p-3 text-xs leading-6">
                              {entry.error
                                ? `Error: ${entry.error}`
                                : entry.output_text || "No output captured."}
                            </pre>
                          </section>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="ui-help-text p-6">{executionEmptyMessage}</div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="audit" className="mt-4 min-h-0 flex-1">
              <ScrollArea className="h-[520px] rounded-lg border bg-background">
                <div className="space-y-3 p-4">
                  {auditTargetLabel ? (
                    <div className="text-sm text-muted-foreground">
                      Audit history for <span className="font-medium text-foreground">{auditTargetLabel}</span>.
                    </div>
                  ) : null}
                  {auditLoading ? (
                    <div className="ui-help-text">Loading audit history...</div>
                  ) : auditEntries.length > 0 ? (
                    auditEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-lg border bg-muted/20 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {entry.status ? (
                            <Badge variant="outline">{entry.status}</Badge>
                          ) : null}
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(entry.changed_at)}
                          </span>
                          {entry.changed_by ? (
                            <span className="text-xs text-muted-foreground">
                              by {entry.changed_by}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 text-sm text-foreground">
                          {entry.summary}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="ui-help-text p-6">
                      No audit history is available for this selection yet.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
