import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const from = await searchParams.then((params) => params.from).catch(() => undefined)

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Unauthorized</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to access this area.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Requested route: <code>{String(from)}</code>
        </p>
        <div className="mt-6 flex gap-3">
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/documents">Go to documents</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
