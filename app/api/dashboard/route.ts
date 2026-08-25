import { NextResponse } from "next/server"
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
import type { DashboardData } from "@/app/dashboard/dashboard-content"

export async function GET() {
  const [
    statistics,
    recentDocuments,
    savedViews,
    correspondents,
    documentTypes,
    uiSettings,
  ] =
    await Promise.all([
      getDocumentStatistics(),
      getRecentDocuments(8),
      getSavedViews<DashboardData["savedViews"][number]>(),
      getCorrespondents(),
      getDocumentTypes(),
      getUiSettings<UiSettingsRecord>(),
    ])

  const savedViewWidgets = await loadDashboardSavedViewWidgets(
    savedViews,
    uiSettings.settings
  )

  return NextResponse.json({
    correspondents,
    documentTypes,
    recentDocuments,
    savedViews,
    savedViewWidgets,
    statistics,
  })
}
