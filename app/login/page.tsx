"use client"

import { Suspense, useState } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const username = formData.get("username") as string
    const password = formData.get("password") as string
    const requestedCallbackUrl = searchParams.get("callbackUrl") || "/"

    try {
      const res = await signIn("credentials", {
        username,
        password,
        redirect: false,
        callbackUrl: requestedCallbackUrl,
      })

      if (res?.error) {
        toast.error("Authentication Failed", {
          description: "Invalid username or password.",
        })
        return
      }

      if (res?.ok) {
        let nextUrl = requestedCallbackUrl

        if (res.url) {
          try {
            const parsed = new URL(res.url, window.location.origin)
            nextUrl = `${parsed.pathname}${parsed.search}${parsed.hash}` || "/"
          } catch {
            nextUrl = res.url
          }
        }

        if (!nextUrl.startsWith("/")) {
          nextUrl = "/"
        }

        router.push(nextUrl)
        router.refresh()
        return
      }

      toast.error("Authentication Failed", {
        description: "Unable to complete sign in.",
      })
    } catch {
      toast.error("Error", {
        description: "An unexpected error occurred.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Enter your credentials to access Paperless.</CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" type="text" placeholder="admin" required disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required disabled={isLoading} />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageFallback() {
  return (
    <div className="flex h-screen w-full items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Enter your credentials to access Paperless.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">Loading sign-in form...</div>
        </CardContent>
      </Card>
    </div>
  )
}
