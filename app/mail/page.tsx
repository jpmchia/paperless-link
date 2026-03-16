import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi, getUiSettings } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { MailTable } from "./mail-table"

async function getMailAccounts() {
  try {
    const data = await getPaperlessApi("mail_accounts/?page_size=100000") as any
    return (data.results || data || []) as any[]
  } catch {
    return []
  }
}

async function getMailRules() {
  try {
    const data = await getPaperlessApi("mail_rules/?page_size=100000") as any
    return (data.results || data || []) as any[]
  } catch {
    return []
  }
}

async function getProcessedMail() {
  try {
    const data = await getPaperlessApi("processed_mail/?page_size=100&ordering=-received") as any
    return (data.results || data || []) as any[]
  } catch {
    return []
  }
}

export default async function MailPage() {
  const permissions = await requireRoutePermission("/mail")

  const [accounts, rules, processedMail, uiSettings] = await Promise.all([
    getMailAccounts(),
    getMailRules(),
    getProcessedMail(),
    getUiSettings(),
  ])

  const gmailOAuthUrl = (uiSettings as any)?.gmail_oauth_url ?? null
  const outlookOAuthUrl = (uiSettings as any)?.outlook_oauth_url ?? null

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Mail Configuration" />}>
      <div className="p-6 flex flex-col gap-6">
        <MailTable
          accounts={accounts}
          rules={rules}
          processedMail={processedMail}
          gmailOAuthUrl={gmailOAuthUrl}
          outlookOAuthUrl={outlookOAuthUrl}
        />
      </div>
    </AppShell>
  )
}
