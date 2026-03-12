import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Accessing token from req.nextauth.token
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        // Only require auth if not on login page
        const isOnLoginPage = req.nextUrl.pathname.startsWith("/login")
        if (isOnLoginPage) {
          return true
        }
        return !!token
      },
    },
    pages: {
      signIn: "/login",
    },
  }
)

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
