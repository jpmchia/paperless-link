import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware() {
    // Accessing token from req.nextauth.token
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        // Only require auth if not on login page
        const isOnLoginPage = req.nextUrl.pathname.startsWith("/login")
        const isOnPublicDataroomPath = req.nextUrl.pathname.startsWith("/dataroom/")
        if (isOnLoginPage || isOnPublicDataroomPath) {
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
