import { readFile } from "node:fs/promises"
import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi } from "@/lib/api"
import type { SystemStatus } from "@/lib/system-status"
import { requireRoutePermission } from "@/lib/server-permissions"
import { SystemStatusView } from "./system-status-view"

async function getFrontendVersion() {
  try {
    const packageJson = JSON.parse(
      await readFile(`${process.cwd()}/package.json`, "utf8")
    ) as { version?: string }
    return packageJson.version ?? "unknown"
  } catch {
    return "unknown"
  }
}

export default async function SystemStatusPage() {
  const permissions = await requireRoutePermission("/system-status")

  let initialStatus: SystemStatus | null = null
  try {
    initialStatus = (await getPaperlessApi("status/")) as SystemStatus
  } catch {
    initialStatus = null
  }

  const frontendVersion = await getFrontendVersion()

  return (
    <AppShell
      initialPermissions={permissions}
      topbar={<TopBar title="System Status" />}
    >
      <div className="p-6 flex flex-col gap-4 h-full overflow-y-auto">
        <SystemStatusView
          canRunTasks={permissions.isSuperuser}
          frontendVersion={frontendVersion}
          initialStatus={initialStatus}
        />
      </div>
    </AppShell>
  )
}
