import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { getSavedViews } from "@/lib/api"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export interface AppShellProps {
  children: React.ReactNode
  topbar?: React.ReactNode
}

export interface TopBarProps {
  title?: string
}

export async function AppShell({ children, topbar }: AppShellProps) {
  // Fetch saved views server-side so the sidebar can show sidebar-pinned views
  let savedViews: any[] = []
  try {
    const session = await getServerSession(authOptions as any)
    if (session) {
      savedViews = await getSavedViews()
    }
  } catch {
    // Not authenticated yet — sidebar just won't show views
  }

  return (
    <SidebarProvider className="h-full">
      <AppSidebar savedViews={savedViews} />
      <SidebarInset className="h-full">
        <header className="sticky top-0 flex h-20 shrink-0 items-center justify-between gap-2 px-4 z-10 bg-transparent transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 w-[100%]">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            {topbar}
          </div>
        </header>
        <main className="flex flex-1 flex-col min-h-0 overflow-hidden h-[calc(100%-1rem)] mb-[1rem] rounded-lg">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
