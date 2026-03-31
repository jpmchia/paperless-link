import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { AIModel, AIProcessConfig, AIProvider } from "@/lib/link-iq-types"
import { requireRoutePermission } from "@/lib/server-permissions"
import { ProcessesPromptsView } from "./processes-prompts-view"

async function getInitialProviders() {
  try {
    const result = await invokeLinkIQAction<{ providers?: AIProvider[] }>({
      capability: "ai.provider.list",
    })
    return result.providers ?? []
  } catch {
    return []
  }
}

async function getInitialModels() {
  try {
    const result = await invokeLinkIQAction<{ models?: AIModel[] }>({
      capability: "ai.model.list",
    })
    return result.models ?? []
  } catch {
    return []
  }
}

async function getInitialProcesses() {
  try {
    const result = await invokeLinkIQAction<{ processes?: AIProcessConfig[] }>({
      capability: "ai.process.list",
    })
    return result.processes ?? []
  } catch {
    return []
  }
}

export default async function AINLPProcessesPage() {
  const permissions = await requireRoutePermission("/ai-nlp/processes")
  const [providers, models, processes] = await Promise.all([
    getInitialProviders(),
    getInitialModels(),
    getInitialProcesses(),
  ])

  return (
    <AppShell
      initialPermissions={permissions}
      topbar={<TopBar title="Processes & Prompts" />}
    >
      <ProcessesPromptsView
        initialModels={models}
        initialProcesses={processes}
        initialProviders={providers}
      />
    </AppShell>
  )
}
