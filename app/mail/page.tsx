import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getPaperlessApi, getUiSettings } from "@/lib/api"
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
  const session = await getServerSession(authOptions as any)
  if (!session) redirect("/login")

  const [accounts, rules, processedMail, uiSettings] = await Promise.all([
    getMailAccounts(),
    getMailRules(),
    getProcessedMail(),
    getUiSettings(),
  ])

  const gmailOAuthUrl = (uiSettings as any)?.gmail_oauth_url ?? null
  const outlookOAuthUrl = (uiSettings as any)?.outlook_oauth_url ?? null

  return (
    <AppShell topbar={<TopBar title="Mail Configuration" />}>
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
