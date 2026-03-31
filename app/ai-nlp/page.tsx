import { AppShell } from "@/components/app-shell"
import { TopBar } from "@/app/documents/topbar"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { AIModel, AIProvider } from "@/lib/link-iq-types"
import { requireRoutePermission } from "@/lib/server-permissions"
import { AINLPView } from "./ai-nlp-view"

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

export default async function AINLPPage() {
  const permissions = await requireRoutePermission("/ai-nlp")
  const [providers, models] = await Promise.all([
    getInitialProviders(),
    getInitialModels(),
  ])

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="AI & NLP" />}>
      <AINLPView initialModels={models} initialProviders={providers} />
    </AppShell>
  )
}
