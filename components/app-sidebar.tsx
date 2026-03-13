"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Files,
  Settings,
  Tags,
  Users,
  LayoutList,
  ChevronDown,
  ChevronRight,
  FileType,
  FolderOpen,
  FormInput,
  Trash2,
  Activity,
  ScrollText,
  GitBranch,
  Mail,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/nav-user"
import { ModeToggle } from "@/components/theme-toggle"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface SavedViewEntry {
  id: number
  name: string
  show_in_sidebar: boolean
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  savedViews?: SavedViewEntry[]
}

const navMain = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Documents", url: "/documents", icon: Files },
]

const navManagement = [
  { title: "Tags", url: "/tags", icon: Tags },
  { title: "Correspondents", url: "/correspondents", icon: Users },
  { title: "Document Types", url: "/document-types", icon: FileType },
  { title: "Storage Paths", url: "/storage-paths", icon: FolderOpen },
  { title: "Custom Fields", url: "/custom-fields", icon: FormInput },
  { title: "Saved Views", url: "/savedviews", icon: LayoutList },
  { title: "Workflows", url: "/workflows", icon: GitBranch },
  { title: "Mail", url: "/mail", icon: Mail },
]

const navSettings = [
  { title: "Trash", url: "/trash", icon: Trash2 },
  { title: "Tasks", url: "/tasks", icon: Activity },
  { title: "Logs", url: "/logs", icon: ScrollText },
  { title: "Settings", url: "/settings", icon: Settings },
]

export function AppSidebar({ savedViews = [], ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const [viewsOpen, setViewsOpen] = React.useState(true)

  const sidebarViews = savedViews.filter((v) => v.show_in_sidebar)

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Files className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-lg">Paperless</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url || (item.url !== "/dashboard" && pathname.startsWith(item.url))}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Saved Views — shown only when there are sidebar views */}
        {sidebarViews.length > 0 && (
          <SidebarGroup>
            <Collapsible open={viewsOpen} onOpenChange={setViewsOpen}>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:text-foreground transition-colors">
                  <span>Saved Views</span>
                  {viewsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {sidebarViews.map((view) => {
                      const viewPath = `/view/${view.id}`
                      const viewQs = `/documents?view=${view.id}`
                      const isActive = pathname === viewPath || pathname.includes(`view/${view.id}`)
                      return (
                        <SidebarMenuItem key={view.id}>
                          <SidebarMenuButton asChild isActive={isActive}>
                            <Link href={viewPath}>
                              <LayoutList className="h-4 w-4" />
                              <span className="truncate">{view.name}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Management Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navManagement.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navSettings.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center justify-between">
          <NavUser />
          <ModeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
