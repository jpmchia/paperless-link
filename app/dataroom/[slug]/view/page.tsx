import { TopBar } from "@/app/documents/topbar"
import { AppShell } from "@/components/app-shell"
import { getUiSettings } from "@/lib/api"
import { DataroomSidebar } from "@/app/dataroom/components/dataroom-sidebar"
import { DataroomViewerSurface } from "@/app/dataroom/components/dataroom-viewer-surface"

type UiSettingsPayload = {
  settings?: Record<string, unknown>
}

function resolvePaperlessAssetUrl(value: string | null) {
  if (!value) return null

  try {
    return new URL(value).toString()
  } catch {
    const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"
    return new URL(value, baseUrl).toString()
  }
}

export default async function DataroomViewerPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const uiSettings = await getUiSettings<UiSettingsPayload>().catch(() => null)
  const settingsValues = (uiSettings?.settings as Record<string, unknown> | undefined) ?? {}
  const appLogoUrl = resolvePaperlessAssetUrl(
    typeof settingsValues.app_logo === "string" ? settingsValues.app_logo : null,
  )

  return (
    <AppShell
      topbar={<TopBar title="Dataroom" />}
      sidebar={<DataroomSidebar slug={slug} appLogoUrl={appLogoUrl} />}
      mode="dataroom"
    >
      <DataroomViewerSurface slug={slug} />
    </AppShell>
  )
}
