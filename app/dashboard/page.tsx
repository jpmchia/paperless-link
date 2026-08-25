import { AppShell } from "@/components/app-shell"
import {
  getCorrespondents,
  getDocumentStatistics,
  getDocumentTypes,
  getRecentDocuments,
  getSavedViews,
  getUiSettings,
} from "@/lib/api"
import { loadDashboardSavedViewWidgets } from "@/lib/dashboard-saved-views"
import type { UiSettingsRecord } from "@/lib/ui-settings"
import { requireRoutePermission } from "@/lib/server-permissions"
import { TopBar } from "./topbar"
import { DashboardContent, type DashboardData } from "./dashboard-content"

export default async function DashboardPage() {
  const permissions = await requireRoutePermission("/dashboard")

  const [
    statistics,
    recentDocuments,
    savedViews,
    correspondents,
    documentTypes,
    uiSettings,
  ] =
    await Promise.all([
      getDocumentStatistics<DashboardData["statistics"]>(),
      getRecentDocuments<DashboardData["recentDocuments"][number]>(8),
      getSavedViews<DashboardData["savedViews"][number]>(),
      getCorrespondents<DashboardData["correspondents"][number]>(),
      getDocumentTypes<DashboardData["documentTypes"][number]>(),
      getUiSettings<UiSettingsRecord>(),
    ])

  const savedViewWidgets = await loadDashboardSavedViewWidgets(
    savedViews,
    uiSettings.settings
  )

  const initialData: DashboardData = {
    correspondents,
    documentTypes,
    recentDocuments,
    savedViews,
    savedViewWidgets,
    statistics,
  }

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Dashboard" />}>
      <DashboardContent initialData={initialData} />
    </AppShell>
  )
}
