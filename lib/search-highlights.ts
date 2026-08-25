export type SearchHighlightSegment = {
  matched: boolean
  text: string
}

export type SearchHighlight = {
  key: string | null
  segments: SearchHighlightSegment[]
}

const HTML_TOKEN_PATTERN = /<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>/g
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: "\u00a0",
  quot: '"',
}

function decodeHtmlEntities(value: string) {
  return value.replace(
    /&(#x[\da-f]+|#\d+|[a-z]+);/gi,
    (entity, encoded: string) => {
      if (encoded.startsWith("#x") || encoded.startsWith("#X")) {
        const codePoint = Number.parseInt(encoded.slice(2), 16)
        return Number.isNaN(codePoint) ? entity : String.fromCodePoint(codePoint)
      }
      if (encoded.startsWith("#")) {
        const codePoint = Number.parseInt(encoded.slice(1), 10)
        return Number.isNaN(codePoint) ? entity : String.fromCodePoint(codePoint)
      }
      return NAMED_ENTITIES[encoded.toLowerCase()] ?? entity
    }
  )
}

function appendSegment(
  segments: SearchHighlightSegment[],
  text: string,
  matched: boolean
) {
  if (!text) return

  const decodedText = decodeHtmlEntities(text)
  const previous = segments[segments.length - 1]
  if (previous?.matched === matched) {
    previous.text += decodedText
    return
  }

  segments.push({ matched, text: decodedText })
}

function parseHighlight(value: string): SearchHighlightSegment[] {
  const segments: SearchHighlightSegment[] = []
  const matchingTags: string[] = []
  let cursor = 0

  for (const match of value.matchAll(HTML_TOKEN_PATTERN)) {
    const token = match[0]
    const index = match.index
    appendSegment(
      segments,
      value.slice(cursor, index),
      matchingTags.length > 0
    )

    const closingTag = token.match(/^<\s*\/\s*(b|span)\b/i)
    if (closingTag) {
      const tagName = closingTag[1].toLowerCase()
      const matchingIndex = matchingTags.lastIndexOf(tagName)
      if (matchingIndex >= 0) matchingTags.splice(matchingIndex, 1)
    } else if (!token.endsWith("/>")) {
      const openingTag = token.match(/^<\s*(b|span)\b/i)
      if (openingTag) {
        const tagName = openingTag[1].toLowerCase()
        const isMatch =
          tagName === "b" ||
          /\bclass\s*=\s*(?:"[^"]*\bmatch\b[^"]*"|'[^']*\bmatch\b[^']*'|[^\s>]*\bmatch\b[^\s>]*)/i.test(
            token
          )
        if (isMatch) matchingTags.push(tagName)
      }
    }

    cursor = index + token.length
  }

  appendSegment(
    segments,
    value.slice(cursor),
    matchingTags.length > 0
  )
  return segments
}

function addStringHighlight(
  highlights: SearchHighlight[],
  key: string | null,
  value: string
) {
  const segments = parseHighlight(value)
  if (segments.some((segment) => segment.text.length > 0)) {
    highlights.push({ key, segments })
  }
}

export function normalizeSearchHighlights(value: unknown): SearchHighlight[] {
  const highlights: SearchHighlight[] = []

  if (typeof value === "string") {
    addStringHighlight(highlights, null, value)
    return highlights
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return highlights
  }

  for (const [key, keyedValue] of Object.entries(value)) {
    if (typeof keyedValue === "string") {
      addStringHighlight(highlights, key, keyedValue)
      continue
    }
    if (Array.isArray(keyedValue)) {
      keyedValue.forEach((item) => {
        if (typeof item === "string") addStringHighlight(highlights, key, item)
      })
    }
  }

  return highlights
}
