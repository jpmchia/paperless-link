import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getCorrespondents, getDocumentTypes, getPaperlessApi, getTags, getUiSettings } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { MailTable } from "./mail-table"

type MailAccountRecord = React.ComponentProps<typeof MailTable>["accounts"][number]
type MailRuleRecord = React.ComponentProps<typeof MailTable>["rules"][number]
type ProcessedMailRecord = NonNullable<React.ComponentProps<typeof MailTable>["processedMail"]>[number]
type PaginatedList<T> = { results?: T[] } | T[]
type UiSettingsPayload = {
  gmail_oauth_url?: string | null
  outlook_oauth_url?: string | null
}

async function getMailAccounts() {
  try {
    const data = (await getPaperlessApi("mail_accounts/?page_size=100000")) as PaginatedList<MailAccountRecord>
    return Array.isArray(data) ? data : data.results ?? []
  } catch {
    return [] as MailAccountRecord[]
  }
}

async function getMailRules() {
  try {
    const data = (await getPaperlessApi("mail_rules/?page_size=100000")) as PaginatedList<MailRuleRecord>
    return Array.isArray(data) ? data : data.results ?? []
  } catch {
    return [] as MailRuleRecord[]
  }
}

async function getProcessedMail() {
  try {
    const data = (await getPaperlessApi("processed_mail/?page_size=100&ordering=-received")) as PaginatedList<ProcessedMailRecord>
    return Array.isArray(data) ? data : data.results ?? []
  } catch {
    return [] as ProcessedMailRecord[]
  }
}

export default async function MailPage() {
  const permissions = await requireRoutePermission("/mail")
  type Lookups = React.ComponentProps<typeof MailTable>

  const [accounts, rules, processedMail, uiSettings, tags, correspondents, documentTypes] = await Promise.all([
    getMailAccounts(),
    getMailRules(),
    getProcessedMail(),
    getUiSettings<UiSettingsPayload>(),
    getTags<Lookups["tags"][number]>(),
    getCorrespondents<Lookups["correspondents"][number]>(),
    getDocumentTypes<Lookups["documentTypes"][number]>(),
  ])

  const gmailOAuthUrl = uiSettings.gmail_oauth_url ?? null
  const outlookOAuthUrl = uiSettings.outlook_oauth_url ?? null

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Mail Configuration" />}>
      <div className="p-6 flex flex-col gap-6">
        <MailTable
          accounts={accounts}
          rules={rules}
          processedMail={processedMail}
          gmailOAuthUrl={gmailOAuthUrl}
          outlookOAuthUrl={outlookOAuthUrl}
          tags={tags}
          correspondents={correspondents}
          documentTypes={documentTypes}
        />
      </div>
    </AppShell>
  )
}
