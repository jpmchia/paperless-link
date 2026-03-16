import { AppSidebar } from "@/components/app-sidebar"
import { PermissionsProvider } from "@/components/permissions/provider"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { getSavedViews, getUiSettings } from "@/lib/api"
import {
  emptyPermissions,
  type CurrentUserPermissions,
  mapPermissionBootstrapPayload,
  type PermissionBootstrapPayload,
} from "@/lib/permissions"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

export interface AppShellProps {
  children: React.ReactNode
  initialPermissions?: CurrentUserPermissions
  topbar?: React.ReactNode
}

export interface TopBarProps {
  title?: string
}

interface SavedViewEntry {
  id: number
  name: string
  show_in_sidebar: boolean
}

export async function AppShell({
  children,
  initialPermissions,
  topbar,
}: AppShellProps) {
  // Fetch saved views server-side so the sidebar can show sidebar-pinned views
  let savedViews: SavedViewEntry[] = []
  let resolvedPermissions = initialPermissions ?? emptyPermissions
  try {
    const session = await getServerSession(authOptions)
    if (session) {
      savedViews = (await getSavedViews()) as SavedViewEntry[]

      if (!initialPermissions) {
        const uiSettings = await getUiSettings().catch(() => null)
        resolvedPermissions = mapPermissionBootstrapPayload(
          uiSettings as PermissionBootstrapPayload | null
        )
      }
    }
  } catch {
    // Not authenticated yet — sidebar just won't show views
  }

  return (
    <PermissionsProvider initialPermissions={resolvedPermissions}>
      <SidebarProvider className="h-full">
        <AppSidebar
          initialPermissions={resolvedPermissions}
          savedViews={savedViews}
        />
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
    </PermissionsProvider>
  )
}
