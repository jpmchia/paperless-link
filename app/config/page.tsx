import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { SettingsForm } from "@/app/settings/settings-form"

export default async function ConfigPage() {
  const permissions = await requireRoutePermission("/config")

  let config: Record<string, unknown> = {}
  try {
    config = (await getPaperlessApi("config/")) as Record<string, unknown>
  } catch {
    // config endpoint may not exist on older Paperless-NGX versions
  }

  return (
    <AppShell
      initialPermissions={permissions}
      topbar={<TopBar title="Application Configuration" />}
    >
      <div className="max-w-3xl p-6">
        <SettingsForm initialConfig={config} />
      </div>
    </AppShell>
  )
}
