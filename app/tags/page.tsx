import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi, type PaginatedResults } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { TagsTable } from "./tags-table"

type TagTableItem = React.ComponentProps<typeof TagsTable>["initialTags"][number]

async function getTagsWithCounts() {
  try {
    const [tags] = await Promise.all([
      getPaperlessApi<PaginatedResults<TagTableItem>>("tags/?page_size=100000"),
      getPaperlessApi("statistics/").catch(() => null),
    ])
    return tags.results || []
  } catch {
    return []
  }
}

export default async function TagsPage() {
  const permissions = await requireRoutePermission("/tags")

  const tags = await getTagsWithCounts()

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Tags" />}>
      <div className="flex-1 min-h-0 overflow-auto p-6 flex flex-col gap-4">
        <TagsTable initialTags={tags} />
      </div>
    </AppShell>
  )
}
