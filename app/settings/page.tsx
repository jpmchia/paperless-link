import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getUiSettings } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { PreferencesForm } from "@/app/profile/preferences-form"

export default async function SettingsPage() {
  const permissions = await requireRoutePermission("/settings")
  const uiSettings = await getUiSettings().catch(() => null)

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Settings" />}>
      <div className="p-6 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your display and notification preferences for this account.
          </p>
        </div>
        <PreferencesForm initialSettings={uiSettings} />
      </div>
    </AppShell>
  )
}
