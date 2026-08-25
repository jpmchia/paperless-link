"use client"

import * as React from "react"
import { useAtomValue } from "jotai"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  Clock,
  FileText,
  Folder,
  Inbox,
  Loader2,
  Users,
} from "lucide-react"
import { CSS } from "@dnd-kit/utilities"
import { OpenDocumentLink } from "@/components/open-document-link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getJson } from "@/lib/paperless-client"
import {
  latestRealtimeEventAtom,
  realtimeConnectionAtom,
} from "@/lib/stores/realtime"
import { updateUiSettings } from "@/app/actions/ui-settings"
import { toast } from "sonner"
import { UploadWidget } from "./upload-widget"
import { SavedViewWidget } from "./saved-view-widget"
import { useUserPreferences } from "@/components/user-preferences-provider"
import { formatUserPreferenceDate } from "@/lib/user-preferences"
import type {
  DashboardSavedView,
  DashboardSavedViewWidget as DashboardSavedViewWidgetData,
} from "@/lib/dashboard-saved-views"

interface DashboardEntity {
  id: number
  name: string
}

interface DashboardDocument {
  correspondent?: number | null
  created: string
  document_type?: number | null
  id: number
  title: string
}

interface DashboardStatistics {
  documents_inbox?: number
  documents_total?: number
}

export interface DashboardData {
  correspondents: DashboardEntity[]
  documentTypes: DashboardEntity[]
  recentDocuments: DashboardDocument[]
  savedViews: DashboardSavedView[]
  savedViewWidgets: DashboardSavedViewWidgetData[]
  statistics: DashboardStatistics
}

function buildNameMap(items: DashboardEntity[]) {
  const map: Record<number, string> = {}
  items.forEach((item) => {
    map[item.id] = item.name
  })
  return map
}

function StatCard({
  description,
  icon: Icon,
  title,
  value,
}: {
  description: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  value: number
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between pb-1">
          <h3 className="text-sm font-medium tracking-tight text-muted-foreground">
            {title}
          </h3>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function SortableSavedViewWidget({
  correspondents,
  documentTypes,
  widget,
}: {
  correspondents: Record<number, string>
  documentTypes: Record<number, string>
  widget: DashboardSavedViewWidgetData
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: widget.view.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <SavedViewWidget
        correspondents={correspondents}
        documentTypes={documentTypes}
        dragHandleProps={{
          ...(attributes as React.ButtonHTMLAttributes<HTMLButtonElement>),
          ...(listeners as React.ButtonHTMLAttributes<HTMLButtonElement>),
        }}
        widget={widget}
      />
    </div>
  )
}

export function DashboardContent({
  initialData,
}: {
  initialData: DashboardData
}) {
  const latestRealtimeEvent = useAtomValue(latestRealtimeEventAtom)
  const realtimeConnection = useAtomValue(realtimeConnectionAtom)
  const preferences = useUserPreferences()
  const [data, setData] = React.useState(initialData)
  const [refreshing, setRefreshing] = React.useState(false)
  const handledEventRef = React.useRef<string | null>(null)
  const lastRefreshAtRef = React.useRef(0)
  const previousConnectionRef =
    React.useRef<typeof realtimeConnection>(realtimeConnection)

  const refreshDashboard = React.useCallback(async () => {
    setRefreshing(true)
    try {
      const nextData = await getJson<DashboardData>("/api/dashboard")
      setData(nextData)
    } finally {
      setRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    const previousConnection = previousConnectionRef.current
    previousConnectionRef.current = realtimeConnection

    if (
      realtimeConnection === "connected" &&
      previousConnection !== "connected" &&
      !refreshing
    ) {
      lastRefreshAtRef.current = Date.now()
      void refreshDashboard()
    }
  }, [realtimeConnection, refreshDashboard, refreshing])

  React.useEffect(() => {
    if (!latestRealtimeEvent || refreshing) return

    switch (latestRealtimeEvent.kind) {
      case "document-detected":
      case "document-consumed":
      case "document-failed":
      case "document-updated":
      case "document-deleted":
      case "documents-deleted":
        break
      default:
        return
    }

    const eventKey = JSON.stringify(latestRealtimeEvent)
    if (handledEventRef.current === eventKey) return
    handledEventRef.current = eventKey

    const now = Date.now()
    if (now - lastRefreshAtRef.current < 1000) return

    lastRefreshAtRef.current = now
    void refreshDashboard()
  }, [latestRealtimeEvent, refreshDashboard, refreshing])

  const corrMap = React.useMemo(
    () => buildNameMap(data.correspondents),
    [data.correspondents]
  )
  const typeMap = React.useMemo(
    () => buildNameMap(data.documentTypes),
    [data.documentTypes]
  )
  const dashboardWidgets = data.savedViewWidgets
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const statCards = [
    {
      description: "Documents in the system",
      icon: FileText,
      title: "Total Documents",
      value: data.statistics.documents_total || 0,
    },
    {
      description: "Waiting to be processed",
      icon: Inbox,
      title: "Inbox",
      value: data.statistics.documents_inbox || 0,
    },
    {
      description: "Unique correspondents",
      icon: Users,
      title: "Correspondents",
      value: data.correspondents.length,
    },
    {
      description: "Configured types",
      icon: Folder,
      title: "Document Types",
      value: data.documentTypes.length,
    },
  ]

  const handleDragEnd = React.useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = dashboardWidgets.findIndex(
        (widget) => widget.view.id === active.id
      )
      const newIndex = dashboardWidgets.findIndex(
        (widget) => widget.view.id === over.id
      )

      if (oldIndex < 0 || newIndex < 0) return

      const previousWidgets = dashboardWidgets
      const nextWidgets = arrayMove(previousWidgets, oldIndex, newIndex)

      setData((current) => ({
        ...current,
        savedViewWidgets: nextWidgets,
      }))

      try {
        await updateUiSettings({
          saved_views: {
            dashboard_views_sort_order: nextWidgets.map((widget) => widget.view.id),
          },
        })
      } catch {
        setData((current) => ({
          ...current,
          savedViewWidgets: previousWidgets,
        }))
        toast.error("Failed to save dashboard order")
      }
    },
    [dashboardWidgets]
  )

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <CardContent className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.statistics.documents_total || 0} documents managed
              {(data.statistics.documents_inbox ?? 0) > 0
                ? ` · ${data.statistics.documents_inbox} in inbox`
                : ""}
            </p>
          </div>
          {refreshing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <div className="flex flex-col gap-4 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Saved Views</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardWidgets.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => {
                    void handleDragEnd(event)
                  }}
                >
                  <SortableContext
                    items={dashboardWidgets.map((widget) => widget.view.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="grid grid-cols-1 gap-3">
                      {dashboardWidgets.map((widget) => (
                        <SortableSavedViewWidget
                          key={widget.view.id}
                          correspondents={corrMap}
                          documentTypes={typeMap}
                          widget={widget}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : data.savedViews.length > 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No dashboard widgets yet. Pin a saved view to the dashboard from
                  the Documents page.
                </p>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No saved views yet. Create one from the Documents page.
                </p>
              )}
            </CardContent>
          </Card>

          <UploadWidget />
        </div>

        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Recent Documents</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentDocuments.length > 0 ? (
                data.recentDocuments.map((doc) => (
                  <OpenDocumentLink
                    key={doc.id}
                    documentId={doc.id}
                    href={`/documents/${doc.id}`}
                    title={doc.title}
                    className="group flex flex-col gap-0.5 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate pr-2 text-sm font-medium leading-none transition-colors group-hover:text-primary">
                        {doc.title}
                      </p>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatUserPreferenceDate(doc.created, preferences, {
                          timeZone: "UTC",
                        })}
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
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No documents yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
