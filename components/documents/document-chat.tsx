"use client"

import * as React from "react"
import { Send } from "lucide-react"
import {
  type ChatMessage,
  createIncrementalChatParser,
  type ChatReference,
} from "@/data/chat"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai/message"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

type DocumentChatProps = {
  documentId: number
  documentTitle?: string
}

type ChatUiMessage = ChatMessage & {
  id: string
  references: ChatReference[]
}

function updateStreamingAssistant(
  messages: ChatUiMessage[],
  assistantId: string,
  next: Partial<ChatUiMessage>
) {
  return messages.map((message) =>
    message.id === assistantId ? { ...message, ...next } : message
  )
}

async function readErrorMessage(response: Response) {
  try {
    const text = await response.text()
    return text.trim() || response.statusText
  } catch {
    return response.statusText
  }
}

export function DocumentChat({
  documentId,
  documentTitle,
}: DocumentChatProps) {
  const [draft, setDraft] = React.useState("")
  const [messages, setMessages] = React.useState<ChatUiMessage[]>([])
  const [submitting, setSubmitting] = React.useState(false)

  const handleSubmit = React.useCallback(async () => {
    const question = draft.trim()
    if (!question || submitting) {
      return
    }

    const userMessageId = `${Date.now()}-user`
    const assistantMessageId = `${Date.now()}-assistant`

    setSubmitting(true)
    setDraft("")
    setMessages((current) => [
      ...current,
      {
        id: userMessageId,
        role: "user",
        content: question,
        references: [],
      },
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        isStreaming: true,
        references: [],
      },
    ])

    try {
      const response = await fetch("/api/documents/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_id: documentId,
          q: question,
        }),
      })

      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }

      if (!response.body) {
        throw new Error("Chat response did not include a stream")
      }

      const parser = createIncrementalChatParser()
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        const parsed = parser.push(chunk)
        setMessages((current) =>
          updateStreamingAssistant(current, assistantMessageId, {
            content: parsed.content,
            references: parsed.references,
          })
        )
      }

      const finalChunk = parser.finish()
      setMessages((current) =>
        updateStreamingAssistant(current, assistantMessageId, {
          content: finalChunk.content,
          isStreaming: false,
          references: finalChunk.references,
        })
      )
    } catch (error) {
      setMessages((current) =>
        current.filter((message) => message.id !== assistantMessageId)
      )
      toast.error("Document chat failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSubmitting(false)
    }
  }, [documentId, draft, submitting])

  return (
    <Card className="border border-border/70 bg-muted/10">
      <CardHeader className="border-b">
        <CardTitle>Document Q&amp;A</CardTitle>
        <CardDescription>
          Ask Paperless AI about this document{documentTitle ? `: ${documentTitle}` : "."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 pt-4">
        <ScrollArea className="max-h-80 rounded-md border bg-background">
          <div className="grid gap-4 p-4">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ask a question to summarize, explain, or extract details from this
                document.
              </p>
            ) : (
              messages.map((message) => (
                <Message key={message.id} from={message.role}>
                  <MessageContent className="max-w-full">
                    {message.role === "assistant" ? (
                      <MessageResponse>
                        {message.content || (message.isStreaming ? "Thinking…" : "")}
                      </MessageResponse>
                    ) : (
                      <p>{message.content}</p>
                    )}
                    {message.references.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.references.map((reference) => (
                          <Button
                            key={`${message.id}-${reference.id}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            aria-label={`Reference ${reference.title}`}
                          >
                            {reference.title}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </MessageContent>
                </Message>
              ))
            )}
          </div>
        </ScrollArea>

        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSubmit()
          }}
        >
          <Label htmlFor="document-chat-input">Ask about this document</Label>
          <Textarea
            id="document-chat-input"
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="What should I know about this document?"
            disabled={submitting}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting || !draft.trim()}>
              <Send className="mr-2 h-4 w-4" />
              {submitting ? "Asking…" : "Ask"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
