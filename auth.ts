import type { NextAuthOptions } from "next-auth"
import { encode } from "next-auth/jwt"
import CredentialsProvider from "next-auth/providers/credentials"

import { serializeCookie } from "@/lib/server-cookie"

type PaperlessUser = {
  id: string
  name: string
  email?: string | null
  image?: string | null
  token: string
}

type TokenWithAccessToken = {
  accessToken?: string
}

type SessionWithAccessToken = {
  accessToken?: string
}

const DEFAULT_SESSION_MAX_AGE = 30 * 24 * 60 * 60

function getNextAuthSecret() {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for Paperless Link auth.")
  }
  return secret
}

function shouldUseSecureAuthCookies() {
  const nextAuthUrl = process.env.NEXTAUTH_URL

  if (!nextAuthUrl) {
    return false
  }

  try {
    return new URL(nextAuthUrl).protocol === "https:"
  } catch {
    return false
  }
}

function getSessionCookieName() {
  return `${shouldUseSecureAuthCookies() ? "__Secure-" : ""}next-auth.session-token`
}

function getSessionCookieOptions() {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: shouldUseSecureAuthCookies(),
  }
}

export async function createLinkSessionCookie(user: PaperlessUser) {
  const token = await encode({
    maxAge: DEFAULT_SESSION_MAX_AGE,
    secret: getNextAuthSecret(),
    token: {
      accessToken: user.token,
      email: user.email ?? null,
      name: user.name,
      picture: user.image ?? null,
      sub: user.id,
    },
  })

  const expires = new Date(Date.now() + DEFAULT_SESSION_MAX_AGE * 1000)

  return serializeCookie(getSessionCookieName(), token, {
    ...getSessionCookieOptions(),
    expires,
  })
}

export function clearLinkSessionCookie() {
  return serializeCookie(getSessionCookieName(), "", {
    ...getSessionCookieOptions(),
    maxAge: 0,
  })
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Paperless-ngx",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        try {
          const baseUrl = process.env.PAPERLESS_API_URL || ""
          const response = await fetch(`${baseUrl}api/token/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password,
            }),
          })

          // Paperless returns { token: "..." }
          if (response.ok) {
            const data = (await response.json()) as { token?: string }
            if (data && data.token) {
              return {
                id: credentials.username as string,
                name: credentials.username as string,
                token: data.token,
              } as PaperlessUser
            }
          }
          return null
        } catch (error) {
          console.error("Paperless Authentication Error:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        ;(token as TokenWithAccessToken).accessToken = (user as PaperlessUser).token
      }
      return token
    },
    async session({ session, token }) {
      ;(session as SessionWithAccessToken).accessToken = (
        token as TokenWithAccessToken
      ).accessToken
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
}
