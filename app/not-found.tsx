import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileQuestion } from "lucide-react"

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="rounded-full bg-muted p-6">
        <FileQuestion className="h-12 w-12 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground max-w-md">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Return to Dashboard</Link>
      </Button>
    </div>
  )
}
