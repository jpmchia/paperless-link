import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getPaperlessApi } from "@/lib/api"
import { currentUserCan } from "@/lib/permissions"
import { requireRoutePermission } from "@/lib/server-permissions"
import { SettingsForm } from "@/app/settings/settings-form"

export default async function ConfigPage() {
  const permissions = await requireRoutePermission("/config")
  const canEditConfig = currentUserCan(permissions, "change", "appConfig")

  let config: Record<string, unknown> = {}
  try {
    config = (await getPaperlessApi("config/")) as Record<string, unknown>
  } catch {
    // config endpoint may not exist on older Paperless-NGX versions
  }

  return (
    <AppShell
      initialPermissions={permissions}
      topbar={<TopBar title="Application Configuration" />}
    >
      <div className="max-w-7xl space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preferences</CardTitle>
            <CardDescription>
              Open the visual hierarchy style guide and preferences lab used to shape future screen design without changing the live theme.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Sparkles className="size-4 text-primary" />
              Review heading scales, helper text contrast, accent roles, and surface rules in a safe preview environment.
            </div>
            <Button asChild>
              <Link href="/config/preferences">
                Open Preferences Lab
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <SettingsForm initialConfig={config} canEdit={canEditConfig} />
      </div>
    </AppShell>
  )
}
