import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const session = await getServerSession(authOptions as any)

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center space-y-4 p-8">
      <h1 className="text-4xl font-bold">Welcome to Paperless</h1>
      <div className="rounded border p-4 text-sm text-gray-700 dark:text-gray-300">
        <p><strong>Username:</strong> {(session as any).user?.name}</p>
        <p><strong>API Token:</strong> {(session as any).accessToken ? "••••••••••••••••" : "Not Found"}</p>
        {(session as any).accessToken && (
          <p className="mt-2 text-xs text-green-600 dark:text-green-400">
            Authentication successfully verified against backend!
          </p>
        )}
      </div>
      <form action="/api/auth/signout" method="POST">
        <button
          type="submit"
          className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Logout
        </button>
      </form>
    </div>
  )
}
