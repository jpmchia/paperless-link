"use client"

import * as React from "react"
import { Play } from "lucide-react"
import {
  Message,
  MessageContent,
} from "@/components/ai/message"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai/prompt-input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { AIModel, AIModelRunResult } from "@/lib/link-iq-types"

type TestMessage = {
  id: string
  role: "user" | "assistant"
  text: string
}

type Props = {
  selectedEnabledModel: AIModel | null
  onRunModel: (prompt: string) => Promise<AIModelRunResult>
  onTestCompleted: () => void
}

export function ModelTestCard({
  selectedEnabledModel,
  onRunModel,
  onTestCompleted,
}: Props) {
  const displayName = selectedEnabledModel?.label.trim() || selectedEnabledModel?.model_name || "model"
  const [messages, setMessages] = React.useState<TestMessage[]>([])
  const [running, setRunning] = React.useState(false)

  React.useEffect(() => {
    setMessages([])
  }, [selectedEnabledModel?.model_id])

  async function handleSubmit(prompt: string) {
    if (!selectedEnabledModel || !prompt.trim()) return

    const userMessage: TestMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: prompt.trim(),
    }
    setMessages((current) => [...current, userMessage])
    setRunning(true)

    try {
      const result = await onRunModel(prompt.trim())
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: result.output_text || "(No output returned)",
        },
      ])
      onTestCompleted()
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          text: error instanceof Error ? error.message : "Failed to run model test",
        },
      ])
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card className="h-full min-h-0 overflow-hidden">
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <span>Test</span>
          <span className="rounded bg-primary/10 px-2 py-0.5 text-xl font-semibold text-primary">
            {displayName}
          </span>
        </CardTitle>
        <CardDescription>
          Run an ad hoc prompt directly against the selected enabled model to validate output quality before assigning it to live processes.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-col gap-4 p-4">
        {selectedEnabledModel ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-muted/10 p-4">
              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <Message key={message.id} from={message.role}>
                      <MessageContent>{message.text}</MessageContent>
                    </Message>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Submit a prompt to test this model.
                </div>
              )}
            </div>

            <PromptInput
              onSubmit={async (message) => {
                await handleSubmit(message.text)
              }}
            >
              <PromptInputBody>
                <PromptInputTextarea
                  placeholder={`Try ${displayName} with a prompt...`}
                />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputTools>
                  <div className="text-xs text-muted-foreground">
                    Single-turn test prompt
                  </div>
                </PromptInputTools>
                <PromptInputSubmit status={running ? "submitted" : undefined} disabled={running}>
                  {!running ? <Play className="size-4" /> : undefined}
                </PromptInputSubmit>
              </PromptInputFooter>
            </PromptInput>
          </>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Select an enabled model to run a direct prompt test.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
