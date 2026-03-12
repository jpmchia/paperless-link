import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export interface AppShellProps {
  children: React.ReactNode
  topbar?: React.ReactNode
}

export interface TopBarProps {
  title?: string
}


export function AppShell({ children, topbar }: AppShellProps) {
  return (
    <SidebarProvider className="h-full">
      <AppSidebar />
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
