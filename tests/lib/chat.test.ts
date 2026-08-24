import { describe, expect, it } from "vitest"
import {
  CHAT_METADATA_DELIMITER,
  createIncrementalChatParser,
  parseChatResponse,
} from "@/data/chat"

describe("chat response parsing", () => {
  it("parses chat references from the metadata trailer", () => {
    expect(
      parseChatResponse(
        `Answer body${CHAT_METADATA_DELIMITER}${JSON.stringify({
          references: [{ id: 7, title: "Invoice.pdf" }],
        })}`
      )
    ).toEqual({
      content: "Answer body",
      references: [{ id: 7, title: "Invoice.pdf" }],
    })
  })

  it("falls back to plain content when metadata is invalid", () => {
    expect(
      parseChatResponse(`Answer body${CHAT_METADATA_DELIMITER}not-json`)
    ).toEqual({
      content: "Answer body",
    })
  })
})

describe("incremental chat parsing", () => {
  it("hides a split metadata delimiter while streaming", () => {
    const parser = createIncrementalChatParser()

    expect(parser.push("Hello world\n\n__PAPER")).toEqual({
      content: "Hello world",
      done: false,
      raw: "Hello world\n\n__PAPER",
      references: [],
    })

    expect(
      parser.push(
        `LESS_CHAT_METADATA__${JSON.stringify({
          references: [{ id: 3, title: "Receipt" }],
        })}`
      )
    ).toEqual({
      content: "Hello world",
      done: false,
      raw:
        `Hello world${CHAT_METADATA_DELIMITER}` +
        JSON.stringify({ references: [{ id: 3, title: "Receipt" }] }),
      references: [{ id: 3, title: "Receipt" }],
    })
  })

  it("keeps plain text visible while chunks continue", () => {
    const parser = createIncrementalChatParser()

    expect(parser.push("First chunk")).toEqual({
      content: "First chunk",
      done: false,
      raw: "First chunk",
      references: [],
    })

    expect(parser.push(" and second chunk")).toEqual({
      content: "First chunk and second chunk",
      done: false,
      raw: "First chunk and second chunk",
      references: [],
    })
  })

  it("finalizes invalid metadata without leaking the trailer", () => {
    const parser = createIncrementalChatParser()

    parser.push(`Answer${CHAT_METADATA_DELIMITER}{`)

    expect(parser.finish()).toEqual({
      content: "Answer",
      done: true,
      raw: `Answer${CHAT_METADATA_DELIMITER}{`,
      references: [],
    })
  })
})
