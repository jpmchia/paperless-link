import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getUiSettings } from "@/lib/api"
import { listThemePresetSummaries } from "@/lib/theme-presets"
import { requireRoutePermission } from "@/lib/server-permissions"
import { PreferencesForm } from "@/app/profile/preferences-form"

export default async function SettingsPage() {
  const permissions = await requireRoutePermission("/settings")
  const uiSettings = await getUiSettings<NonNullable<React.ComponentProps<typeof PreferencesForm>["initialSettings"]>>().catch(() => null)
  const themePresets = await listThemePresetSummaries().catch(() => [])

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Settings" />}>
      <div className="px-6 max-w-3xl">
        <p className="mb-8 mt-4 text-sm text-muted-foreground">
          Manage your display and notification preferences for this account.
        </p>
        <PreferencesForm initialSettings={uiSettings} themePresets={themePresets} />
      </div>
    </AppShell>
  )
}
