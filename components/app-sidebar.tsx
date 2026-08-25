"use client"

import * as React from "react"
import { useAtomValue, useSetAtom } from "jotai"
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
  SlidersHorizontal,
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
  HeartPulse,
  FileCode2,
  BrainCircuit,
  Building2,
  Share2,
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
import { SidebarOpenDocuments } from "@/components/sidebar-open-documents"
import {
  type SidebarManagementDialogKind,
  useSidebarManagementDialog,
} from "@/components/sidebar-management-dialog"
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
import {
  latestRealtimeEventAtom,
  realtimeConnectionAtom,
} from "@/lib/stores/realtime"
import {
  adjustPendingTaskCountAtom,
  countPendingTasks,
  setPendingTaskCountAtom,
  pendingTaskCountAtom,
} from "@/lib/stores/tasks"
import { updateUiSettings } from "@/app/actions/ui-settings"
import type { CurrentUserPermissions } from "@/lib/permissions"
import { getSavedViewIcon } from "@/data/saved-view-icons"
import { orderSavedViewsBySortOrder } from "@/lib/saved-view-visibility"

interface SavedViewEntry {
  id: number
  name: string
  icon?: string
  show_in_sidebar: boolean
}

interface SidebarTaskSummary {
  acknowledged: boolean
  status: string
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  appLogo?: string | null
  appTitle?: string | null
  initialPermissions?: CurrentUserPermissions
  savedViews?: SavedViewEntry[]
  savedViewSortOrder?: number[]
  slimSidebar?: boolean
}

interface NavItem {
  adminOnly?: boolean
  icon: React.ComponentType<{ className?: string }>
  managementDialogKind?: SidebarManagementDialogKind
  permissionType?: PermissionType
  title: string
  url: string
}

function SavedViewIcon({
  icon,
  className,
}: {
  icon?: string
  className?: string
}) {
  return React.createElement(getSavedViewIcon(icon), { className })
}

const navMain: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Documents", url: "/documents", icon: Files },
]

const navManagement: NavItem[] = [
  { title: "Taxonomy", url: "/taxonomy", icon: GitBranch, adminOnly: true },
  { title: "Datarooms", url: "/datarooms", icon: FolderOpen, adminOnly: true },
  { title: "Domain Models", url: "/domain-models", icon: FileCode2, adminOnly: true },
  { title: "Business Context", url: "/business-context", icon: Building2, adminOnly: true },
  { title: "Tags", url: "/tags", icon: Tags, managementDialogKind: "tags", permissionType: "tag" },
  { title: "Correspondents", url: "/correspondents", icon: Users, managementDialogKind: "correspondents", permissionType: "correspondent" },
  { title: "Document Types", url: "/document-types", icon: FileType, managementDialogKind: "documentTypes", permissionType: "documentType" },
  { title: "Custom Fields", url: "/custom-fields", icon: FormInput, managementDialogKind: "customFields", permissionType: "customField" },
]

const navSystem: NavItem[] = [
  { title: "AI & NLP", url: "/ai-nlp", icon: BrainCircuit, adminOnly: true },
  { title: "Mail", url: "/mail", icon: Mail, permissionType: "mailAccount" },
  { title: "Users", url: "/users", icon: Users },
  { title: "Saved Views", url: "/savedviews", icon: LayoutList, permissionType: "savedView" },
  { title: "Share Bundles", url: "/share-link-bundles", icon: Share2, permissionType: "shareLink" },
  { title: "Storage Paths", url: "/storage-paths", icon: FolderOpen, permissionType: "storagePath" },
  { title: "Workflows", url: "/workflows", icon: GitBranch, permissionType: "workflow" },
  { title: "Trash", url: "/trash", icon: Trash2 },
  { title: "Tasks", url: "/tasks", icon: Activity },
  { title: "Logs", url: "/logs", icon: ScrollText },
  { title: "System Status", url: "/system-status", icon: HeartPulse },
  { title: "Settings", url: "/settings", icon: Settings, permissionType: "uiSettings" },
  { title: "Configuration", url: "/config", icon: SlidersHorizontal },
]

const APPLICATION_SECTION_CONTENT_ID = "sidebar-section-application-content"
const VIEWS_SECTION_CONTENT_ID = "sidebar-section-views-content"
const MANAGEMENT_SECTION_CONTENT_ID = "sidebar-section-management-content"
const SYSTEM_SECTION_CONTENT_ID = "sidebar-section-system-content"
const SYSTEM_SECTION_OPEN_STORAGE_KEY = "paperless.sidebar.system.open"

async function persistViewOrder(orderedIds: number[]) {
  try {
    await updateUiSettings({
      saved_views: {
        sidebar_views_sort_order: orderedIds,
      },
    })
  } catch {
    // Silently fail — order just won't be persisted
  }
}

function getOrderedSidebarViews(
  savedViews: SavedViewEntry[],
  savedViewSortOrder: number[]
) {
  return orderSavedViewsBySortOrder(
    savedViews.filter((view) => view.show_in_sidebar),
    savedViewSortOrder
  )
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
            <SavedViewIcon icon={view.icon} className="h-4 w-4 shrink-0" />
            <span className="truncate">{view.name}</span>
          </Link>
        </SidebarMenuButton>
      </div>
    </SidebarMenuItem>
  )
}

export function AppSidebar({
  appLogo,
  appTitle,
  initialPermissions,
  savedViews = [],
  savedViewSortOrder = [],
  slimSidebar = false,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname()
  const pathnameValue = pathname ?? ""
  const hydratedPermissions = useAtomValue(currentUserPermissionsAtom)
  const pendingTaskCount = useAtomValue(pendingTaskCountAtom)
  const latestRealtimeEvent = useAtomValue(latestRealtimeEventAtom)
  const realtimeConnection = useAtomValue(realtimeConnectionAtom)
  const setPendingTaskCount = useSetAtom(setPendingTaskCountAtom)
  const adjustPendingTaskCount = useSetAtom(adjustPendingTaskCountAtom)
  const { activeDialogKind, openManagementDialog } = useSidebarManagementDialog()
  const [applicationOpen, setApplicationOpen] = React.useState(true)
  const [managementOpen, setManagementOpen] = React.useState(true)
  const [systemOpen, setSystemOpen] = React.useState(false)
  const [viewsOpen, setViewsOpen] = React.useState(true)
  const [hasMounted, setHasMounted] = React.useState(false)

  const currentUserPermissions =
    hydratedPermissions.isAuthenticated || !initialPermissions
      ? hydratedPermissions
      : initialPermissions

  const syncPendingTasks = React.useCallback(async () => {
    try {
      const data = await getJson<{ count?: number; results?: SidebarTaskSummary[] }>(
        "/api/tasks/active"
      )
      const tasks = data.results ?? []
      setPendingTaskCount(
        typeof data.count === "number" ? data.count : countPendingTasks(tasks)
      )
    } catch {
      // Silently ignore shell task-count sync failures.
    }
  }, [setPendingTaskCount])

  React.useEffect(() => {
    setHasMounted(true)
  }, [])

  React.useEffect(() => {
    if (!hasMounted) return
    let stored: string | null = null
    try {
      stored = window.localStorage.getItem(SYSTEM_SECTION_OPEN_STORAGE_KEY)
    } catch {
      // Some browser/privacy contexts block storage access.
      return
    }
    if (stored == null) return
    setSystemOpen(stored === "true")
  }, [hasMounted])

  React.useEffect(() => {
    if (!hasMounted) return
    try {
      window.localStorage.setItem(
        SYSTEM_SECTION_OPEN_STORAGE_KEY,
        systemOpen ? "true" : "false"
      )
    } catch {
      // Some browser/privacy contexts block storage access.
    }
  }, [hasMounted, systemOpen])

  React.useEffect(() => {
    void syncPendingTasks()
  }, [syncPendingTasks])

  React.useEffect(() => {
    if (realtimeConnection === "connected") {
      void syncPendingTasks()
    }
  }, [realtimeConnection, syncPendingTasks])

  React.useEffect(() => {
    if (!latestRealtimeEvent) return

    switch (latestRealtimeEvent.kind) {
      case "document-detected":
        adjustPendingTaskCount(1)
        break
      case "document-consumed":
      case "document-failed":
        adjustPendingTaskCount(-1)
        break
      default:
        break
    }
  }, [adjustPendingTaskCount, latestRealtimeEvent])

  const [orderedViews, setOrderedViews] = React.useState<SavedViewEntry[]>(() =>
    getOrderedSidebarViews(savedViews, savedViewSortOrder)
  )

  React.useEffect(() => {
    setOrderedViews(getOrderedSidebarViews(savedViews, savedViewSortOrder))
  }, [savedViewSortOrder, savedViews])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const managementItems = navManagement.filter((item) => {
    if (item.adminOnly) {
      return canManageConfig(currentUserPermissions)
    }
    if (!item.permissionType) return true
    return currentUserCan(currentUserPermissions, "view", item.permissionType)
  })

  const systemItems = navSystem.filter((item) => {
    if (item.adminOnly) {
      return canManageConfig(currentUserPermissions)
    }

    if (item.title === "Users") {
      return (
        currentUserCan(currentUserPermissions, "view", "user") ||
        currentUserCan(currentUserPermissions, "view", "group") ||
        canManageConfig(currentUserPermissions)
      )
    }

    if (item.title === "Configuration" || item.title === "System Status") {
      return canManageConfig(currentUserPermissions)
    }

    if (item.permissionType) {
      return currentUserCan(currentUserPermissions, "view", item.permissionType)
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
    <Sidebar
      variant="inset"
      collapsible={slimSidebar ? "icon" : "offcanvas"}
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="min-h-[5rem]" asChild>
              <Link href="/dashboard" className="flex flex-col items-start gap-0">
                {appLogo ? (
                  <div
                    className="flex w-full justify-start"
                    aria-hidden="true"
                  >
                    <img
                      src={appLogo}
                      alt=""
                      className="max-h-[4rem] object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Files className="size-4" />
                  </div>
                )}
                <div className="grid max-w-full text-left leading-tight">
                  <span className="truncate text-sm font-semibold">
                    {appTitle?.trim() || "Paperless"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <Collapsible open={applicationOpen} onOpenChange={setApplicationOpen}>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger
                aria-controls={APPLICATION_SECTION_CONTENT_ID}
                className="flex cursor-pointer items-center justify-between transition-colors hover:text-foreground"
              >
                <span>Application</span>
                {applicationOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent id={APPLICATION_SECTION_CONTENT_ID}>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navMain.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={pathnameValue === item.url || (item.url !== "/dashboard" && pathnameValue.startsWith(item.url))}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        <SidebarOpenDocuments />

        {/* Saved Views — shown only when there are sidebar views */}
        {orderedViews.length > 0 && (
          <SidebarGroup>
            <Collapsible open={viewsOpen} onOpenChange={setViewsOpen}>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger
                  aria-controls={VIEWS_SECTION_CONTENT_ID}
                  className="flex cursor-pointer items-center justify-between transition-colors hover:text-foreground"
                >
                  <span>Saved Views</span>
                  {viewsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent id={VIEWS_SECTION_CONTENT_ID}>
                <SidebarGroupContent>
                  {hasMounted ? (
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
                              pathnameValue.includes(`view/${view.id}`)
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
                  ) : (
                    <SidebarMenu>
                      {orderedViews.map((view) => {
                        const isActive =
                          pathname === `/view/${view.id}` ||
                          pathnameValue.includes(`view/${view.id}`)
                        const ViewIcon = getSavedViewIcon(view.icon)
                        return (
                          <SidebarMenuItem key={view.id}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              className="min-w-0"
                            >
                              <Link href={`/view/${view.id}`}>
                                <ViewIcon className="h-4 w-4 shrink-0" />
                                <span className="truncate">{view.name}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )
                      })}
                    </SidebarMenu>
                  )}
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Management Navigation */}
        {managementItems.length > 0 && (
          <SidebarGroup>
            <Collapsible open={managementOpen} onOpenChange={setManagementOpen}>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger
                  aria-controls={MANAGEMENT_SECTION_CONTENT_ID}
                  className="flex cursor-pointer items-center justify-between transition-colors hover:text-foreground"
                >
                  <span>Management</span>
                  {managementOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                )}
              </CollapsibleTrigger>
            </SidebarGroupLabel>
              <CollapsibleContent id={MANAGEMENT_SECTION_CONTENT_ID}>
              <SidebarGroupContent>
                  <SidebarMenu>
                    {managementItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        {item.managementDialogKind ? (
                          <SidebarMenuButton
                            isActive={activeDialogKind === item.managementDialogKind}
                            onClick={() =>
                              openManagementDialog(item.managementDialogKind ?? "tags")
                            }
                          >
                            <item.icon />
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                        ) : (
                          <SidebarMenuButton asChild isActive={pathnameValue.startsWith(item.url)}>
                            <Link href={item.url}>
                              <item.icon />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* System Navigation */}
        <SidebarGroup>
          <Collapsible open={systemOpen} onOpenChange={setSystemOpen}>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger
                aria-controls={SYSTEM_SECTION_CONTENT_ID}
                className="flex cursor-pointer items-center justify-between transition-colors hover:text-foreground"
              >
                <span>System</span>
                {systemOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent id={SYSTEM_SECTION_CONTENT_ID}>
              <SidebarGroupContent>
                <SidebarMenu>
                  {systemItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={pathnameValue.startsWith(item.url)}>
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
            </CollapsibleContent>
          </Collapsible>
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
