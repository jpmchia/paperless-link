import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { SettingsForm } from "./settings-form"

export default async function SettingsPage() {
  const permissions = await requireRoutePermission("/settings")

  let config: any = {}
  try {
    config = await getPaperlessApi("config/")
  } catch {
    // config endpoint may not exist on older Paperless-NGX versions
  }

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Application Settings" />}>
      <div className="p-6 max-w-3xl">
        <SettingsForm initialConfig={config} />
      </div>
    </AppShell>
  )
}
