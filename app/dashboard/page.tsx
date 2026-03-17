import { AppShell } from "@/components/app-shell"
import { OpenDocumentLink } from "@/components/open-document-link"
import { getDocumentStatistics, getRecentDocuments, getSavedViews, getCorrespondents, getDocumentTypes } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"
import { FileText, Inbox, Tags, Users, Folder, Clock } from "lucide-react"
import { TopBar } from "./topbar"
import { UploadWidget } from "./upload-widget"
import Link from "next/link"

export default async function DashboardPage() {
  const permissions = await requireRoutePermission("/dashboard")

  const [stats, recentDocuments, savedViews, correspondents, documentTypes] = await Promise.all([
    getDocumentStatistics(),
    getRecentDocuments(8),
    getSavedViews(),
    getCorrespondents(),
    getDocumentTypes(),
  ])

  // Build lookup maps for display
  const corrMap: Record<number, string> = {}
  correspondents.forEach((c: any) => { corrMap[c.id] = c.name })
  const typeMap: Record<number, string> = {}
  documentTypes.forEach((dt: any) => { typeMap[dt.id] = dt.name })

  const dashboardViews = savedViews.filter((v: any) => v.show_on_dashboard)

  const statCards = [
    { title: "Total Documents", value: (stats as any).documents_total || 0, icon: FileText, description: "Documents in the system" },
    { title: "Inbox", value: (stats as any).documents_inbox || 0, icon: Inbox, description: "Waiting to be processed" },
    { title: "Correspondents", value: correspondents.length, icon: Users, description: "Unique correspondents" },
    { title: "Document Types", value: documentTypes.length, icon: Folder, description: "Configured types" },
  ]

  return (
    <AppShell initialPermissions={permissions} topbar={<TopBar title="Dashboard" />}>
      <div className="flex flex-col gap-6 p-4 h-full overflow-y-auto">
        {/* Welcome Banner */}
        <div className="rounded-xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {(stats as any).documents_total || 0} documents managed
              {(stats as any).documents_inbox > 0 ? ` · ${(stats as any).documents_inbox} in inbox` : ""}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.title} className="rounded-xl border bg-card text-card-foreground shadow-sm p-5">
              <div className="flex items-center justify-between pb-1">
                <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{card.title}</h3>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{card.description}</p>
            </div>
          ))}
        </div>

        {/* Main Grid: Saved Views + Upload | Recent Docs */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
          {/* Left column */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Dashboard Saved Views */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="font-semibold leading-none tracking-tight mb-4">Saved Views</h3>
              {dashboardViews.length > 0 ? (
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                  {dashboardViews.map((view: any) => (
                    <Link
                      key={view.id}
                      href={`/view/${view.id}`}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <Tags className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none truncate">{view.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {view.show_in_sidebar ? "Sidebar" : "Dashboard only"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : savedViews.length > 0 ? (
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                  {savedViews.slice(0, 6).map((view: any) => (
                    <Link
                      key={view.id}
                      href={`/view/${view.id}`}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <Tags className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none truncate">{view.name}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No saved views yet. Create one from the Documents page.
                </p>
              )}
            </div>

            {/* Upload Widget */}
            <UploadWidget />
          </div>

          {/* Right column: Recent Documents */}
          <div className="lg:col-span-3 rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold leading-none tracking-tight">Recent Documents</h3>
            </div>
            <div className="space-y-2">
              {recentDocuments.length > 0 ? (
                recentDocuments.map((doc: any) => (
                  <OpenDocumentLink
                    key={doc.id}
                    documentId={doc.id}
                    href={`/documents/${doc.id}`}
                    title={doc.title}
                    className="flex flex-col gap-0.5 p-3 border rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium leading-none truncate pr-2 group-hover:text-primary transition-colors">
                        {doc.title}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(doc.created).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {doc.correspondent && corrMap[doc.correspondent] && (
                        <span>{corrMap[doc.correspondent]}</span>
                      )}
                      {doc.document_type && typeMap[doc.document_type] && (
                        <>
                          {doc.correspondent && <span>·</span>}
                          <span>{typeMap[doc.document_type]}</span>
                        </>
                      )}
                    </div>
                  </OpenDocumentLink>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No documents yet
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
