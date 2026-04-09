import type { CSSProperties } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { AgentRailLayout } from "@/components/agent-rail-layout"
import { ConfirmationDialogProvider } from "@/components/confirmation-dialog-provider"
import { NotificationPreferencesProvider } from "@/components/notifications/preferences-provider"
import { PermissionsProvider } from "@/components/permissions/provider"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getSavedViews, getUiSettings } from "@/lib/api"
import { getThemePresetById } from "@/lib/theme-presets"
import {
  emptyPermissions,
  type CurrentUserPermissions,
  mapPermissionBootstrapPayload,
  type PermissionBootstrapPayload,
} from "@/lib/permissions"
import {
  defaultNotificationPreferences,
  mapNotificationPreferences,
} from "@/lib/notifications"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export interface AppShellProps {
  children: React.ReactNode
  initialPermissions?: CurrentUserPermissions
  topbar?: React.ReactNode
  sidebar?: React.ReactNode
  mode?: "default" | "dataroom"
}

export interface TopBarProps {
  title?: string
}

interface SavedViewEntry {
  id: number
  name: string
  show_in_sidebar: boolean
}

type UiSettingsPayload = {
  settings?: Record<string, unknown>
}

function resolvePaperlessAssetUrl(value: string | null) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("/")) return `/api/proxy${trimmed}`

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      // Serve via current origin to avoid mixed-content on HTTPS frontends.
      return `/api/proxy${parsed.pathname}${parsed.search}${parsed.hash}`
    }
    return parsed.toString()
  } catch {
    const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"
    const parsed = new URL(trimmed, baseUrl)
    return `/api/proxy${parsed.pathname}${parsed.search}${parsed.hash}`
  }
}

function serializeThemeVariables(variables: Record<string, string>) {
  const entries = Object.entries(variables).filter(
    ([key, value]) => key.startsWith("--") && typeof value === "string" && value.length > 0
  )
  if (entries.length === 0) return ""

  const cssBody = entries
    .map(([key, value]) => `${key}: ${value.replace(/<\/style/gi, "<\\\\/style")};`)
    .join(" ")

  return `:root { ${cssBody} }`
}

export async function AppShell({
  children,
  initialPermissions,
  topbar,
  sidebar,
  mode = "default",
}: AppShellProps) {
  // Fetch saved views server-side so the sidebar can show sidebar-pinned views
  let savedViews: SavedViewEntry[] = []
  let resolvedPermissions = initialPermissions ?? emptyPermissions
  let notificationPreferences = defaultNotificationPreferences
  let appTitle: string | null = null
  let appLogo: string | null = null
  let themeVariables: Record<string, string> = {}
  try {
    const session = await getServerSession(authOptions)
    if (session) {
      savedViews = await getSavedViews<SavedViewEntry>()
      const uiSettings = await getUiSettings<UiSettingsPayload>().catch(() => null)
      const uiSettingsValues =
        (uiSettings?.settings as Record<string, unknown> | undefined) ?? {}
      appTitle =
        typeof uiSettingsValues.app_title === "string"
          ? uiSettingsValues.app_title
          : null
      appLogo = resolvePaperlessAssetUrl(
        typeof uiSettingsValues.app_logo === "string"
          ? uiSettingsValues.app_logo
          : null
      )
      const themePresetId =
        typeof uiSettingsValues.theme_preset_id === "string"
          ? uiSettingsValues.theme_preset_id
          : ""
      if (themePresetId) {
        const themePreset = await getThemePresetById(themePresetId).catch(() => null)
        themeVariables = themePreset?.variables ?? {}
      }
      notificationPreferences = mapNotificationPreferences(
        uiSettingsValues
      )

      if (!initialPermissions) {
        resolvedPermissions = mapPermissionBootstrapPayload(
          uiSettings as PermissionBootstrapPayload | null
        )
      }
    }
  } catch {
    // Not authenticated yet — sidebar just won't show views
  }

  return (
    <PermissionsProvider initialPermissions={resolvedPermissions}>
      <NotificationPreferencesProvider
        initialPreferences={notificationPreferences}
      >
        <ConfirmationDialogProvider>
          {Object.keys(themeVariables).length > 0 ? (
            <style>{serializeThemeVariables(themeVariables)}</style>
          ) : null}
          <SidebarProvider
            className="h-full"
            style={themeVariables as CSSProperties}
          >
            {sidebar ?? (
              <AppSidebar
                appLogo={appLogo}
                appTitle={appTitle}
                initialPermissions={resolvedPermissions}
                savedViews={savedViews}
              />
            )}
            <SidebarInset className="h-full bg-sidebar border-none shadow-none!">
              <AgentRailLayout
                savedViews={savedViews}
                topbar={topbar}
                sidebarTrigger={<SidebarTrigger />}
                showGlobalControls={mode === "default"}
                showAgentRailToggle={mode === "default"}
              >
                {children}
              </AgentRailLayout>
            </SidebarInset>
          </SidebarProvider>
        </ConfirmationDialogProvider>
      </NotificationPreferencesProvider>
    </PermissionsProvider>
  )
}
