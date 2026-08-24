export type ChatRole = "user" | "assistant"

export interface ChatReference {
  id: number
  title: string
}

export interface ChatMessage {
  role: ChatRole
  content: string
  isStreaming?: boolean
  references?: ChatReference[]
}

export interface ParsedChatResponse {
  content: string
  references?: ChatReference[]
}

export interface IncrementalChatParseResult {
  content: string
  done: boolean
  raw: string
  references: ChatReference[]
}

export const CHAT_METADATA_DELIMITER = "\n\n__PAPERLESS_CHAT_METADATA__"

function normalizeReferences(value: unknown): ChatReference[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((entry) => {
    if (
      entry &&
      typeof entry === "object" &&
      typeof entry.id === "number" &&
      typeof entry.title === "string"
    ) {
      return [{ id: entry.id, title: entry.title }]
    }

    return []
  })
}

export function parseChatResponse(response: string): ParsedChatResponse {
  const delimiterIndex = response.indexOf(CHAT_METADATA_DELIMITER)

  if (delimiterIndex === -1) {
    return { content: response }
  }

  const metadataString = response.slice(
    delimiterIndex + CHAT_METADATA_DELIMITER.length
  )

  try {
    const metadata = JSON.parse(metadataString) as {
      references?: unknown
    }

    return {
      content: response.slice(0, delimiterIndex),
      references: normalizeReferences(metadata.references),
    }
  } catch {
    return {
      content: response.slice(0, delimiterIndex),
    }
  }
}

function getDelimiterPrefixOverlap(value: string) {
  const maxLength = Math.min(value.length, CHAT_METADATA_DELIMITER.length - 1)

  for (let length = maxLength; length > 0; length -= 1) {
    if (CHAT_METADATA_DELIMITER.startsWith(value.slice(-length))) {
      return length
    }
  }

  return 0
}

export function createIncrementalChatParser(initialRaw = "") {
  let raw = initialRaw
  let finished = false

  function snapshot(done: boolean): IncrementalChatParseResult {
    const delimiterIndex = raw.indexOf(CHAT_METADATA_DELIMITER)

    if (delimiterIndex === -1) {
      const overlap = getDelimiterPrefixOverlap(raw)
      return {
        content: raw.slice(0, raw.length - overlap),
        done,
        raw,
        references: [],
      }
    }

    const parsed = parseChatResponse(raw)

    return {
      content: parsed.content,
      done,
      raw,
      references: parsed.references ?? [],
    }
  }

  return {
    finish() {
      finished = true
      return snapshot(true)
    },
    push(chunk: string) {
      if (finished) {
        throw new Error("Cannot push additional chat chunks after finishing")
      }

      raw += chunk
      return snapshot(false)
    },
  }
}
