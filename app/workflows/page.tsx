import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { getCorrespondents, getCustomFields, getDocumentTypes, getPaperlessApi, getStoragePaths, getTags, getUsers, getGroups } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import {
  readRemoteOcrSettings,
  remoteOcrIsSelectable,
} from "@/data/ui-settings"
import { WorkflowsTable } from "./workflows-table"

type WorkflowRecord = React.ComponentProps<typeof WorkflowsTable>["initialItems"][number]
type PaginatedWorkflowList = { results?: WorkflowRecord[] } | WorkflowRecord[]
type MailRuleRecord = { id: number; name: string }
type PaginatedMailRuleList = { results?: MailRuleRecord[] } | MailRuleRecord[]
type UiSettingsRecord = {
  settings?: Record<string, unknown>
}

async function getWorkflows() {
  try {
    const data = (await getPaperlessApi("workflows/?page_size=100000")) as PaginatedWorkflowList
    return Array.isArray(data) ? data : data.results ?? []
  } catch {
    return [] as WorkflowRecord[]
  }
}

async function getMailRules() {
  try {
    const data = (await getPaperlessApi("mail_rules/?page_size=100000")) as PaginatedMailRuleList
    return Array.isArray(data) ? data : data.results ?? []
  } catch {
    return [] as MailRuleRecord[]
  }
}

export default async function WorkflowsPage() {
  const permissions = await requireRoutePermission("/workflows")
  type Lookups = React.ComponentProps<typeof WorkflowsTable>["lookups"]

  const [workflows, tags, correspondents, documentTypes, storagePaths, customFields, users, groups, mailRules, uiSettings] = await Promise.all([
    getWorkflows(),
    getTags<Lookups["tags"][number]>(),
    getCorrespondents<Lookups["correspondents"][number]>(),
    getDocumentTypes<Lookups["documentTypes"][number]>(),
    getStoragePaths<Lookups["storagePaths"][number]>(),
    getCustomFields<Lookups["customFields"][number]>(),
    getUsers<Lookups["users"][number]>(),
    getGroups<Lookups["groups"][number]>(),
    getMailRules(),
    getPaperlessApi("ui_settings/") as Promise<UiSettingsRecord>,
  ])
  const remoteOcrConfigured = remoteOcrIsSelectable(
    readRemoteOcrSettings(uiSettings.settings)
  )

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Workflows" />}>
      <div className="flex-1 min-h-0 overflow-auto p-6 flex flex-col gap-4">
        <WorkflowsTable
          initialItems={workflows}
          remoteOcrConfigured={remoteOcrConfigured}
          lookups={{
            correspondents,
            customFields,
            documentTypes,
            groups,
            storagePaths,
            tags,
            users,
            mailRules,
          }}
        />
      </div>
    </AppShell>
  )
}
