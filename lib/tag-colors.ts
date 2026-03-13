/**
 * Paperless-NGX tag colour utilities.
 *
 * The API historically returned `colour` as an integer (1-12), but in
 * recent versions of Paperless-NGX (v2+) it returns a hex string directly
 * (e.g. "#a6cee3"). We handle both formats.
 */
export const TAG_COLOUR_MAP: Record<number, string> = {
  1:  "#a6cee3", // Light Blue
  2:  "#1f78b4", // Blue
  3:  "#b2df8a", // Light Green
  4:  "#33a02c", // Green
  5:  "#fb9a99", // Pink / Light Red
  6:  "#e31a1c", // Red
  7:  "#fdbf6f", // Light Orange
  8:  "#ff7f00", // Orange
  9:  "#cab2d6", // Light Purple
  10: "#6a3d9a", // Purple
  11: "#ffff99", // Light Yellow
  12: "#b15928", // Brown
}

export const TAG_COLOUR_OPTIONS = Object.entries(TAG_COLOUR_MAP).map(
  ([id, hex]) => ({ id: Number(id), hex })
)

/**
 * Returns the hex colour string for a tag.
 * Accepts either:
 *   - A number (1-12): looks up in TAG_COLOUR_MAP
 *   - A hex string (e.g. "#a6cee3"): returned directly
 *   - null/undefined: returns fallback grey
 */
export function tagColourHex(colour: number | string | null | undefined): string {
  if (!colour) return "#6b7280"
  // Already a hex string (e.g. "#a6cee3" from Paperless NGX v2)
  if (typeof colour === "string") return colour
  // Integer ID from older API
  return TAG_COLOUR_MAP[colour] ?? "#6b7280"
}

/**
 * Returns a readable foreground colour for text on a tag background.
 * Checks luminance so light backgrounds get dark text.
 */
export function tagForeground(colour: number | string | null | undefined): string {
  const hex = tagColourHex(colour).replace("#", "")
  if (hex.length < 6) return "#ffffff"
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  // Perceived luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? "#1a1a1a" : "#ffffff"
}

export interface TagColourStyle {
  backgroundColor: string
  color: string
}

/** Returns React inline-style object for a tag pill. */
export function tagPillStyle(colour: number | string | null | undefined): TagColourStyle {
  return {
    backgroundColor: tagColourHex(colour),
    color: tagForeground(colour),
  }
}
