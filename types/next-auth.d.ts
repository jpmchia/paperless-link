import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken?: string
  }

  interface User {
    token?: string
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string
  }
}
