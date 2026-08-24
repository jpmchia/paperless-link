import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { ShareLinkBundlesPanel } from "@/components/share-links/share-link-bundles-panel"
import { requireRoutePermission } from "@/lib/server-permissions"

export default async function ShareLinkBundlesPage() {
  const permissions = await requireRoutePermission("/share-link-bundles")
  const paperlessBaseUrl =
    process.env.PAPERLESS_PUBLIC_URL?.trim() ||
    process.env.PAPERLESS_API_URL ||
    "http://localhost:8000/"

  return (
    <AppShell
      initialPermissions={permissions}
      topbar={<TopBar title="Share Link Bundles" />}
    >
      <div className="flex flex-col gap-4 p-6">
        <p className="text-sm text-muted-foreground">
          Manage multi-document share link bundles created from bulk selection
          or document share tabs.
        </p>
        <ShareLinkBundlesPanel paperlessBaseUrl={paperlessBaseUrl} />
      </div>
    </AppShell>
  )
}
