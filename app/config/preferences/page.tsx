import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { canManageConfig } from "@/lib/permissions"
import { listThemePresets } from "@/lib/theme-presets"
import { requireRoutePermission } from "@/lib/server-permissions"
import { PreferencesStyleLab } from "./preferences-style-lab"

export default async function ConfigPreferencesPage() {
  const permissions = await requireRoutePermission("/config/preferences")
  const themePresets = await listThemePresets().catch(() => [])

  return (
    <AppShell
      initialPermissions={permissions}
      topbar={<TopBar title="Configuration / Preferences" />}
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden p-6">
        <div className="mb-6 max-w-4xl">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Visual Hierarchy Style Guide
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Use this screen as the shared reference for future UI work. It is a safe mock-up and tuning area for hierarchy, emphasis, and surface rules before we apply those decisions across the live application.
          </p>
        </div>
        <div className="min-h-0 flex-1">
          <PreferencesStyleLab
            canManageThemes={canManageConfig(permissions)}
            initialThemePresets={themePresets}
          />
        </div>
      </div>
    </AppShell>
  )
}
