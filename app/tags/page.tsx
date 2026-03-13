import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi } from "@/lib/api"
import { TagsTable } from "./tags-table"

async function getTagsWithCounts() {
  try {
    const [tags, stats] = await Promise.all([
      getPaperlessApi("tags/?page_size=100000"),
      getPaperlessApi("statistics/").catch(() => null),
    ])
    return (tags.results || []) as any[]
  } catch {
    return []
  }
}

export default async function TagsPage() {
  const session = await getServerSession(authOptions as any)
  if (!session) redirect("/login")

  const tags = await getTagsWithCounts()

  return (
    <AppShell topbar={<TopBar title="Tags" />}>
      <div className="p-6 flex flex-col gap-4">
        <TagsTable initialTags={tags} />
      </div>
    </AppShell>
  )
}
