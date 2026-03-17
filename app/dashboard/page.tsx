import { AppShell } from "@/components/app-shell"
import {
  getCorrespondents,
  getDocumentStatistics,
  getDocumentTypes,
  getRecentDocuments,
  getSavedViews,
} from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { TopBar } from "./topbar"
import { DashboardContent, type DashboardData } from "./dashboard-content"

export default async function DashboardPage() {
  const permissions = await requireRoutePermission("/dashboard")

  const [statistics, recentDocuments, savedViews, correspondents, documentTypes] =
    await Promise.all([
      getDocumentStatistics(),
      getRecentDocuments(8),
      getSavedViews(),
      getCorrespondents(),
      getDocumentTypes(),
    ])

  const initialData: DashboardData = {
    correspondents,
    documentTypes,
    recentDocuments,
    savedViews,
    statistics,
  }

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Dashboard" />}>
      <DashboardContent initialData={initialData} />
    </AppShell>
  )
}
