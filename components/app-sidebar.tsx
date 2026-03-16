"use client"

import * as React from "react"
import { useAtomValue } from "jotai"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { KeyboardSensor } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
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
  GripVertical,
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
import { Badge } from "@/components/ui/badge"
import { NavUser } from "@/components/nav-user"
import { ModeToggle } from "@/components/theme-toggle"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { toast } from "sonner"
import {
  canManageConfig,
  currentUserCan,
  type PermissionType,
} from "@/lib/permissions"
import { getJson } from "@/lib/paperless-client"
import { currentUserPermissionsAtom } from "@/lib/stores/permissions"
import { updateUiSettings } from "@/lib/ui-settings"
import type { CurrentUserPermissions } from "@/lib/permissions"

interface SavedViewEntry {
  id: number
  name: string
  show_in_sidebar: boolean
}

interface SidebarTaskSummary {
  acknowledged: boolean
  status: string
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  initialPermissions?: CurrentUserPermissions
  savedViews?: SavedViewEntry[]
}

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  permissionType?: PermissionType
  title: string
  url: string
}

const navMain: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Documents", url: "/documents", icon: Files },
]

const navManagement: NavItem[] = [
  { title: "Tags", url: "/tags", icon: Tags, permissionType: "tag" },
  { title: "Correspondents", url: "/correspondents", icon: Users, permissionType: "correspondent" },
  { title: "Document Types", url: "/document-types", icon: FileType, permissionType: "documentType" },
  { title: "Storage Paths", url: "/storage-paths", icon: FolderOpen, permissionType: "storagePath" },
  { title: "Custom Fields", url: "/custom-fields", icon: FormInput, permissionType: "customField" },
  { title: "Saved Views", url: "/savedviews", icon: LayoutList, permissionType: "savedView" },
  { title: "Workflows", url: "/workflows", icon: GitBranch, permissionType: "workflow" },
  { title: "Mail", url: "/mail", icon: Mail, permissionType: "mailAccount" },
  { title: "Users", url: "/users", icon: Users },
]

const navSettings: NavItem[] = [
  { title: "Trash", url: "/trash", icon: Trash2 },
  { title: "Tasks", url: "/tasks", icon: Activity },
  { title: "Logs", url: "/logs", icon: ScrollText },
  { title: "Settings", url: "/settings", icon: Settings },
]

async function persistViewOrder(orderedIds: number[]) {
  try {
    await updateUiSettings({ sidebar_views_sort_order: orderedIds })
  } catch {
    // Silently fail — order just won't be persisted
  }
}

function SortableViewItem({
  view,
  isActive,
}: {
  view: SavedViewEntry
  isActive: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: view.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <SidebarMenuItem ref={setNodeRef} style={style}>
      <div className="flex items-center w-full group/view-item">
        <button
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover/view-item:opacity-100 transition-opacity flex-shrink-0"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          tabIndex={-1}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <SidebarMenuButton asChild isActive={isActive} className="flex-1 min-w-0">
          <Link href={`/view/${view.id}`}>
            <LayoutList className="h-4 w-4 shrink-0" />
            <span className="truncate">{view.name}</span>
          </Link>
        </SidebarMenuButton>
      </div>
    </SidebarMenuItem>
  )
}

export function AppSidebar({
  initialPermissions,
  savedViews = [],
  ...props
}: AppSidebarProps) {
  const pathname = usePathname()
  const hydratedPermissions = useAtomValue(currentUserPermissionsAtom)
  const [viewsOpen, setViewsOpen] = React.useState(true)
  const [pendingTaskCount, setPendingTaskCount] = React.useState(0)

  const currentUserPermissions =
    hydratedPermissions.isAuthenticated || !initialPermissions
      ? hydratedPermissions
      : initialPermissions

  React.useEffect(() => {
    const fetchCount = async () => {
      try {
        const data = await getJson<
          SidebarTaskSummary[] | { results?: SidebarTaskSummary[] }
        >("/api/tasks")
        const tasks = Array.isArray(data) ? data : data.results ?? []
        const count = tasks.filter(
          (task) =>
            !task.acknowledged &&
            (task.status === "PENDING" || task.status === "STARTED")
        ).length
        setPendingTaskCount(count)
      } catch {
        // silently ignore
      }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30_000)
    return () => clearInterval(interval)
  }, [])

  const initialSidebarViews = savedViews.filter((v) => v.show_in_sidebar)
  const [orderedViews, setOrderedViews] = React.useState<SavedViewEntry[]>(initialSidebarViews)

  // Re-sync when prop changes (e.g. after navigation)
  React.useEffect(() => {
    setOrderedViews(savedViews.filter((v) => v.show_in_sidebar))
  }, [savedViews.map((v) => v.id).join(",")]) // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const managementItems = navManagement.filter((item) => {
    if (item.title === "Users") {
      return (
        currentUserCan(currentUserPermissions, "view", "user") ||
        currentUserCan(currentUserPermissions, "view", "group") ||
        canManageConfig(currentUserPermissions)
      )
    }

    if (!item.permissionType) return true
    return currentUserCan(currentUserPermissions, "view", item.permissionType)
  })

  const systemItems = navSettings.filter((item) => {
    if (item.title === "Settings") {
      return canManageConfig(currentUserPermissions)
    }

    return true
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setOrderedViews((prev) => {
      const oldIdx = prev.findIndex((v) => v.id === active.id)
      const newIdx = prev.findIndex((v) => v.id === over.id)
      const next = arrayMove(prev, oldIdx, newIdx)
      persistViewOrder(next.map((v) => v.id)).catch(() =>
        toast.error("Failed to save view order")
      )
      return next
    })
  }

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
        {orderedViews.length > 0 && (
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
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={orderedViews.map((v) => v.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <SidebarMenu>
                        {orderedViews.map((view) => {
                          const isActive =
                            pathname === `/view/${view.id}` ||
                            pathname.includes(`view/${view.id}`)
                          return (
                            <SortableViewItem
                              key={view.id}
                              view={view}
                              isActive={isActive}
                            />
                          )
                        })}
                      </SidebarMenu>
                    </SortableContext>
                  </DndContext>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Management Navigation */}
        {managementItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementItems.map((item) => (
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
        )}

        {/* Settings Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                      {item.title === "Tasks" && pendingTaskCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="ml-auto h-5 min-w-[20px] px-1 text-[10px] leading-none"
                        >
                          {pendingTaskCount}
                        </Badge>
                      )}
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
