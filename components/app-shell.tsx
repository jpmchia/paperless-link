import type { CSSProperties } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { AgentRailLayout } from "@/components/agent-rail-layout"
import { ConfirmationDialogProvider } from "@/components/confirmation-dialog-provider"
import { NotificationPreferencesProvider } from "@/components/notifications/preferences-provider"
import { PermissionsProvider } from "@/components/permissions/provider"
import { SidebarManagementDialogProvider } from "@/components/sidebar-management-dialog"
import { UserPreferencesProvider } from "@/components/user-preferences-provider"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { SETTINGS_KEYS } from "@/data/ui-settings"
import { getSavedViews, getUiSettings } from "@/lib/api"
import { readSavedViewVisibility } from "@/lib/saved-view-visibility"
import { getThemePresetById } from "@/lib/theme-presets"
import {
  emptyPermissions,
  type CurrentUserPermissions,
  mapPermissionBootstrapPayload,
  type PermissionBootstrapPayload,
} from "@/lib/permissions"
import { defaultNotificationPreferences } from "@/lib/notifications"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import {
  readUserPreferences,
  type UserPreferences,
} from "@/lib/user-preferences"

export interface AppShellProps {
  children: React.ReactNode
  initialPermissions?: CurrentUserPermissions
  topbar?: React.ReactNode
  sidebar?: React.ReactNode
  mode?: "default" | "dataroom"
  /** When `mode` is `dataroom`, pass the room slug so the agent rail scopes sessions correctly. */
  dataroomSlug?: string
}

export interface TopBarProps {
  title?: string
}

interface SavedViewEntry {
  id: number
  name: string
  icon?: string
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
    ([key, value]) =>
      key.startsWith("--") && typeof value === "string" && value.length > 0
  )
  if (entries.length === 0) return ""

  const cssBody = entries
    .map(
      ([key, value]) => `${key}: ${value.replace(/<\/style/gi, "<\\\\/style")};`
    )
    .join(" ")

  return `:root { ${cssBody} }`
}

function readBooleanSetting(value: unknown) {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return value === "true"
  return false
}

function buildThemeOverrideVariables(
  baseVariables: Record<string, string>,
  preferences: UserPreferences
) {
  if (!preferences.themeColor.trim()) {
    return baseVariables
  }

  return {
    ...baseVariables,
    "--accent": preferences.themeColor,
    "--brand": preferences.themeColor,
    "--primary": preferences.themeColor,
    "--ring": preferences.themeColor,
    "--sidebar-primary": preferences.themeColor,
  }
}

export async function AppShell({
  children,
  initialPermissions,
  topbar,
  sidebar,
  mode = "default",
  dataroomSlug,
}: AppShellProps) {
  // Fetch saved views server-side so the sidebar can show sidebar-pinned views
  let savedViews: SavedViewEntry[] = []
  let resolvedPermissions = initialPermissions ?? emptyPermissions
  let notificationPreferences = defaultNotificationPreferences
  let appTitle: string | null = null
  let appLogo: string | null = null
  let initialTourComplete = false
  let sidebarViewSortOrder: number[] = []
  let userPreferences = readUserPreferences()
  let themeVariables: Record<string, string> = {}
  try {
    const session = await getServerSession(authOptions)
    if (session) {
      savedViews = await getSavedViews<SavedViewEntry>()
      const uiSettings = await getUiSettings<UiSettingsPayload>().catch(
        () => null
      )
      const uiSettingsValues =
        (uiSettings?.settings as Record<string, unknown> | undefined) ?? {}
      sidebarViewSortOrder =
        readSavedViewVisibility(uiSettingsValues).sidebar_views_sort_order
      appTitle =
        typeof uiSettingsValues.app_title === "string"
          ? uiSettingsValues.app_title
          : null
      appLogo = resolvePaperlessAssetUrl(
        typeof uiSettingsValues.app_logo === "string"
          ? uiSettingsValues.app_logo
          : null
      )
      initialTourComplete = readBooleanSetting(
        uiSettingsValues[SETTINGS_KEYS.TOUR_COMPLETE]
      )
      userPreferences = readUserPreferences(uiSettingsValues)
      const themePresetId = userPreferences.themePresetId ?? ""
      if (themePresetId) {
        const themePreset = await getThemePresetById(themePresetId).catch(
          () => null
        )
        themeVariables = buildThemeOverrideVariables(
          themePreset?.variables ?? {},
          userPreferences
        )
      } else {
        themeVariables = buildThemeOverrideVariables({}, userPreferences)
      }
      notificationPreferences = userPreferences.notifications

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
      <UserPreferencesProvider value={userPreferences}>
        <NotificationPreferencesProvider
          initialPreferences={notificationPreferences}
        >
          <ConfirmationDialogProvider>
            <SidebarManagementDialogProvider>
              {Object.keys(themeVariables).length > 0 ? (
                <style>{serializeThemeVariables(themeVariables)}</style>
              ) : null}
              <SidebarProvider
                className="h-full"
                defaultOpen={!userPreferences.slimSidebar}
                style={themeVariables as CSSProperties}
              >
                {sidebar ?? (
                  <AppSidebar
                    appLogo={appLogo}
                    appTitle={appTitle}
                    initialPermissions={resolvedPermissions}
                    savedViews={savedViews}
                    savedViewSortOrder={sidebarViewSortOrder}
                    slimSidebar={userPreferences.slimSidebar}
                  />
                )}
                <SidebarInset className="h-full bg-sidebar border-none shadow-none!">
                  <AgentRailLayout
                    savedViews={savedViews}
                    topbar={topbar}
                    sidebarTrigger={<SidebarTrigger />}
                    showGlobalControls={mode === "default"}
                    initialTourComplete={initialTourComplete}
                    showAgentRailToggle
                    agentSurface={mode === "dataroom" ? "dataroom" : "main"}
                    dataroomSlug={dataroomSlug ?? null}
                  >
                    {children}
                  </AgentRailLayout>
                </SidebarInset>
              </SidebarProvider>
            </SidebarManagementDialogProvider>
          </ConfirmationDialogProvider>
        </NotificationPreferencesProvider>
      </UserPreferencesProvider>
    </PermissionsProvider>
  )
}
