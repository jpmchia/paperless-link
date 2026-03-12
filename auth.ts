import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Paperless-ngx",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
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
              }
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
    async jwt({ token, user }: any) {
      // Initial sign in
      if (user) {
        token.accessToken = user.token
      }
      return token
    },
    async session({ session, token }: any) {
      session.accessToken = token.accessToken as string
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
}

