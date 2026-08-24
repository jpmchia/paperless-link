type SameSite = "lax" | "none" | "strict"

type SerializeCookieOptions = {
  expires?: Date
  httpOnly?: boolean
  maxAge?: number
  path?: string
  sameSite?: SameSite
  secure?: boolean
}

export function serializeCookie(
  name: string,
  value: string,
  options: SerializeCookieOptions = {}
) {
  const encoded = encodeURIComponent(value)
  const parts = [`${name}=${encoded}`]

  if (typeof options.maxAge === "number") {
    parts.push(`Max-Age=${options.maxAge}`)
  }
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`)
  }
  parts.push(`Path=${options.path ?? "/"}`)
  if (options.httpOnly) {
    parts.push("HttpOnly")
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`)
  }
  if (options.secure) {
    parts.push("Secure")
  }

  return parts.join("; ")
}
