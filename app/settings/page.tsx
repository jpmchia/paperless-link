import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi } from "@/lib/api"
import { SettingsForm } from "./settings-form"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions as any)
  if (!session) redirect("/login")

  let config: any = {}
  try {
    config = await getPaperlessApi("config/")
  } catch {
    // config endpoint may not exist on older Paperless-NGX versions
  }

  return (
    <AppShell topbar={<TopBar title="Application Settings" />}>
      <div className="p-6 max-w-3xl">
        <SettingsForm initialConfig={config} />
      </div>
    </AppShell>
  )
}
