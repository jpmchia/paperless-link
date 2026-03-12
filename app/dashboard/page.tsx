import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { getDocumentStatistics, getRecentDocuments, getSavedViews } from "@/lib/api"
import { FileText, Inbox } from "lucide-react"
import { TopBar } from "./topbar"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions as any)

  if (!session) {
    redirect("/login")
  }

  const [stats, recentDocuments, savedViews] = await Promise.all([
    getDocumentStatistics(),
    getRecentDocuments(5),
    getSavedViews()
  ])

  return (
    <AppShell topbar={<TopBar title="Dashboard" />}>
      <div className="flex flex-col space-y-4 p-2 h-full">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="font-semibold leading-none tracking-tight">Welcome</h3>
            <div className="mt-4 text-sm text-muted-foreground">
              <p>User: {(session as any).user?.name}</p>
              {(session as any).accessToken && (
                <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                  Paperless API Connected
                </p>
              )}
            </div>
          </div>
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="tracking-tight text-sm font-medium">Total Documents</h3>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{(stats as any).documents_total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Documents in the system
            </p>
          </div>
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between pb-2">
              <h3 className="tracking-tight text-sm font-medium">Inbox</h3>
              <Inbox className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{(stats as any).documents_inbox || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Waiting in the inbox
            </p>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7 mt-8">
          <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow-sm p-6 min-h-[300px]">
            <h3 className="font-semibold leading-none tracking-tight mb-4">Saved Views</h3>
            <div className="space-y-4">
              {savedViews.length > 0 ? (
                savedViews.map((view: any) => (
                  <div key={view.id} className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{view.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {view.show_in_sidebar ? "Visible in sidebar" : ""}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground h-full flex items-center justify-center">
                  <p>No saved views available</p>
                </div>
              )}
            </div>
          </div>
          <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow-sm p-6 min-h-[300px]">
            <h3 className="font-semibold leading-none tracking-tight mb-4">Recent Documents</h3>
            <div className="space-y-4">
              {recentDocuments.length > 0 ? (
                recentDocuments.map((doc: any) => (
                  <div key={doc.id} className="flex flex-col gap-1 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium leading-none truncate pr-2" title={doc.title}>
                        {doc.title}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(doc.created).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground h-4">
                      {/* We will optionally show correspondent/doc type here later */}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground h-full flex items-center justify-center">
                  <p>No recent documents</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell >
  )
}
