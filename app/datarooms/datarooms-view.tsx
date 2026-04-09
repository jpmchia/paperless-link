"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { toast } from "sonner"
import { deleteJson, getJson, postJson, putJson } from "@/lib/paperless-client"
import type {
  Dataroom,
  DataroomEmailTemplate,
  DataroomDocumentPlacement,
  DataroomFolder,
  DataroomInvitee,
  DataroomInviteeStats,
  DataroomOwner,
  DataroomRelease,
  DataroomReleaseItem,
  DataroomSummaryCount,
} from "@/lib/link-iq-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog as DraggableDialog,
  DialogBody as DraggableDialogBody,
  DialogContent as DraggableDialogContent,
  DialogFooter as DraggableDialogFooter,
  DialogHeader as DraggableDialogHeader,
  DialogTitle as DraggableDialogTitle,
} from "@/components/draggable-dialog"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Building2,
  ChevronRightIcon,
  FileType,
  FolderIcon,
  GitBranch,
  PauseCircleIcon,
  PlayCircleIcon,
  Trash2Icon,
  Users,
} from "lucide-react"
import { DataroomConfigurationCard } from "./components/dataroom-configuration-card"
import { FolderHierarchyCard } from "@/app/datarooms/components/folder-hierarchy-card"
import { AuthorisedMembersCard } from "./components/authorised-members-card"

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false })

type DataroomListResponse = { datarooms?: Dataroom[] }
type OwnersResponse = { owners?: DataroomOwner[] }
type FoldersResponse = { folders?: DataroomFolder[]; folder_counts?: Record<string, number> }
type InviteesResponse = { invitees?: DataroomInvitee[] }
type AnalyticsResponse = {
  summary?: DataroomSummaryCount[]
  invitees?: DataroomInviteeStats[]
}
type PlacementsResponse = { placements?: DataroomDocumentPlacement[] }
type ReleasesResponse = { releases?: DataroomRelease[] }
type ReleaseItemsResponse = { items?: DataroomReleaseItem[] }
type Paginated<T> = { results?: T[] } | T[]
type PaperlessUser = {
  id: number
  username?: string
  first_name?: string
  last_name?: string
  email?: string
  last_login?: string
}
type TaxonomyNodeOption = { taxonomy_node_id?: string; label?: string; path?: string }
type DocumentTypeOption = { id: number; name?: string }
type CorrespondentOption = { id: number; name?: string }
type EntityTypeOption = { entity_type_id?: string; label?: string }
type CustomFieldOption = { id: number; name?: string }
type PaperlessDocument = {
  id: number
  title?: string
  content?: string
  created?: string
  correspondent?: number | null
  document_type?: number | null
  original_md5?: string
  archive_md5?: string
  original_file_size?: number
  archive_file_size?: number
}

const STANDARD_METADATA_FIELDS = [
  { key: "title", label: "Title" },
  { key: "content", label: "Content" },
  { key: "created", label: "Created date" },
  { key: "correspondent", label: "Correspondent" },
  { key: "document_type", label: "Document type" },
  { key: "tags", label: "Tags" },
  { key: "archive_serial_number", label: "Archive serial number" },
  { key: "storage_path", label: "Storage path" },
  { key: "original_md5", label: "Original MD5 checksum" },
  { key: "archive_md5", label: "Archive MD5 checksum" },
  { key: "original_file_size", label: "Original file size (bytes)" },
  { key: "archive_file_size", label: "Archive file size (bytes)" },
] as const

function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function normalizeUsersResponse(payload: unknown): PaperlessUser[] {
  if (Array.isArray(payload)) return payload as PaperlessUser[]
  if (!payload || typeof payload !== "object") return []
  const record = payload as Record<string, unknown>
  if (Array.isArray(record.results)) return record.results as PaperlessUser[]
  if (Array.isArray(record.users)) return record.users as PaperlessUser[]
  if (Array.isArray(record.all)) return record.all as PaperlessUser[]
  return []
}

function normalizePaginatedArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (!payload || typeof payload !== "object") return []
  const record = payload as Record<string, unknown>
  if (Array.isArray(record.results)) return record.results as T[]
  if (Array.isArray(record.nodes)) return record.nodes as T[]
  if (Array.isArray(record.entity_types)) return record.entity_types as T[]
  if (Array.isArray(record.correspondents)) return record.correspondents as T[]
  if (Array.isArray(record.document_types)) return record.document_types as T[]
  if (Array.isArray(record.documentTypes)) return record.documentTypes as T[]
  if (Array.isArray(record.tags)) return record.tags as T[]
  if (Array.isArray(record.custom_fields)) return record.custom_fields as T[]
  if (Array.isArray(record.customFields)) return record.customFields as T[]
  if (Array.isArray(record.all)) return record.all as T[]
  return []
}

const ACCESS_PRESETS = [
  "one-time access",
  "12 hours",
  "24 hours",
  "48 hours",
  "5 days",
  "1 week",
  "2 weeks",
  "1 month",
  "3 months",
  "indefinitely",
]

const EMAIL_TEMPLATE_DEFINITIONS = [
  {
    key: "activation",
    name: "Activation",
    variables: ["{{MagicURL}}", "{{DataroomTitle}}", "{{InviteeEmail}}", "{{BrandingLogoURL}}"],
  },
  {
    key: "magic_link_login",
    name: "Magic Link Login",
    variables: ["{{MagicURL}}", "{{DataroomTitle}}", "{{InviteeEmail}}", "{{BrandingLogoURL}}"],
  },
] as const

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["link"],
    ["clean"],
  ],
}

const QUILL_FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "bullet",
  "align",
  "link",
]

const AUTO_PUBLISH_TIMES = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, "0")
  const minute = index % 2 === 0 ? "00" : "30"
  return `${hour}:${minute}`
})

type FolderTreeNode = {
  folder: DataroomFolder
  children: FolderTreeNode[]
}

type PublishWorkspaceView = "immediate" | "scheduled" | "manual"

function linkedItemIconForType(type?: DataroomFolder["linked_item_type"]) {
  switch (type) {
    case "taxonomy":
      return GitBranch
    case "document_type":
      return FileType
    case "correspondent":
      return Users
    case "domain_entity":
      return Building2
    default:
      return null
  }
}

function buildFolderTree(folders: DataroomFolder[]): FolderTreeNode[] {
  const byID = new Map<string, FolderTreeNode>()
  folders.forEach((folder) => {
    byID.set(folder.folder_id, { folder, children: [] })
  })

  const roots: FolderTreeNode[] = []
  byID.forEach((node) => {
    const parentID = node.folder.parent_folder_id
    if (parentID && byID.has(parentID) && parentID !== node.folder.folder_id) {
      byID.get(parentID)?.children.push(node)
      return
    }
    roots.push(node)
  })

  const sortNodes = (nodes: FolderTreeNode[]) => {
    nodes.sort((left, right) => left.folder.label.localeCompare(right.folder.label))
    nodes.forEach((node) => sortNodes(node.children))
  }
  sortNodes(roots)
  return roots
}

function FolderTreeItem({
  node,
  level,
  selectedFolderID,
  folderCounts,
  fallbackImmediate,
  fallbackScheduledTime,
  savingFolderID,
  deletingFolderID,
  onSelectFolder,
  onToggleFolderHold,
  onRemoveFolder,
}: {
  node: FolderTreeNode
  level: number
  selectedFolderID?: string
  folderCounts: Record<string, number>
  fallbackImmediate: boolean
  fallbackScheduledTime?: string
  savingFolderID?: string | null
  deletingFolderID?: string | null
  onSelectFolder: (folder: DataroomFolder) => void
  onToggleFolderHold: (folder: DataroomFolder) => void
  onRemoveFolder: (folder: DataroomFolder) => void
}) {
  const [open, setOpen] = React.useState(level < 1)
  const hasChildren = node.children.length > 0
  const isSelected = selectedFolderID === node.folder.folder_id
  const resolvedScheduledTime =
    node.folder.auto_publish_scheduled_time || fallbackScheduledTime || "00:00"
  const scheduleMode: "default" | "immediate" | "scheduled" =
    node.folder.auto_publish_immediately == null
      ? "default"
      : node.folder.auto_publish_immediately
        ? "immediate"
        : "scheduled"
  const isSaving = savingFolderID === node.folder.folder_id
  const isDeleting = deletingFolderID === node.folder.folder_id
  const LinkedTypeIcon = linkedItemIconForType(node.folder.linked_item_type)

  return (
    <div className="space-y-1">
      <div
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_180px] items-center gap-1 rounded-md px-1 py-0.5 text-sm",
          isSelected && "bg-sidebar-accent/35 text-sidebar-foreground ring-1 ring-sidebar-border/60",
        )}
      >
        <div className="flex min-w-0 items-center gap-1">
          {hasChildren ? (
            <Collapsible open={open} onOpenChange={setOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="inline-flex size-6 items-center justify-center rounded hover:bg-muted"
                >
                  <ChevronRightIcon
                    className={cn("size-4 transition-transform duration-200", open && "rotate-90")}
                  />
                </button>
              </CollapsibleTrigger>
            </Collapsible>
          ) : (
            <span className="inline-flex size-6 items-center justify-center" />
          )}
          <SidebarMenuButton asChild className="h-7 min-w-0 px-1">
            <button
              type="button"
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 rounded-sm px-1 text-left transition-colors",
                "hover:bg-muted/50",
              )}
              onClick={() => onSelectFolder(node.folder)}
            >
              <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-[15px] leading-5">{node.folder.label}</span>
              {LinkedTypeIcon ? (
                <LinkedTypeIcon className="size-3.5 shrink-0 text-muted-foreground" />
              ) : null}
              <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                fields{" "}
                {(node.folder.published_metadata_fields?.length ?? 0) +
                  (node.folder.published_custom_field_ids?.length ?? 0)}
              </span>
              <span className="ml-auto text-muted-foreground text-xs">
                ({folderCounts[node.folder.folder_id] ?? 0})
              </span>
            </button>
          </SidebarMenuButton>
        </div>
        <div className="flex items-center justify-end gap-1">
          <Badge variant="outline" className="h-6 text-[10px]">
            {scheduleMode === "default"
              ? `Default ${fallbackImmediate ? "Immediate" : `${fallbackScheduledTime || "00:00"}`}`
              : scheduleMode === "immediate"
                ? "Immediate"
                : `${resolvedScheduledTime}`}
          </Badge>
          <Button
            type="button"
            variant={node.folder.publishing_on_hold ? "secondary" : "outline"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onToggleFolderHold(node.folder)}
            disabled={isSaving || isDeleting}
            title={node.folder.publishing_on_hold ? "Enable publishing" : "Disable / hold publishing"}
            aria-label={node.folder.publishing_on_hold ? "Enable publishing" : "Disable publishing"}
          >
            {node.folder.publishing_on_hold ? (
              <PlayCircleIcon className="size-3.5" />
            ) : (
              <PauseCircleIcon className="size-3.5" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={() => onRemoveFolder(node.folder)}
            disabled={isSaving || isDeleting}
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      </div>
      {hasChildren && open ? (
        <div className="ml-4 border-muted/50 border-l pl-2">
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.folder.folder_id}
              node={child}
              level={level + 1}
              selectedFolderID={selectedFolderID}
              folderCounts={folderCounts}
              fallbackImmediate={fallbackImmediate}
              fallbackScheduledTime={fallbackScheduledTime}
              savingFolderID={savingFolderID}
              deletingFolderID={deletingFolderID}
              onSelectFolder={onSelectFolder}
              onToggleFolderHold={onToggleFolderHold}
              onRemoveFolder={onRemoveFolder}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function DataroomsView() {
  const [rooms, setRooms] = React.useState<Dataroom[]>([])
  const [selectedId, setSelectedId] = React.useState<string>("")
  const [roomDraft, setRoomDraft] = React.useState<Partial<Dataroom>>({})
  const [owners, setOwners] = React.useState<DataroomOwner[]>([])
  const [users, setUsers] = React.useState<PaperlessUser[]>([])
  const [folders, setFolders] = React.useState<DataroomFolder[]>([])
  const [folderCounts, setFolderCounts] = React.useState<Record<string, number>>({})
  const [placements, setPlacements] = React.useState<DataroomDocumentPlacement[]>([])
  const [invitees, setInvitees] = React.useState<DataroomInvitee[]>([])
  const [summary, setSummary] = React.useState<DataroomSummaryCount[]>([])
  const [inviteeStats, setInviteeStats] = React.useState<DataroomInviteeStats[]>([])
  const [ownerSearch, setOwnerSearch] = React.useState("")
  const [ownerToAdd, setOwnerToAdd] = React.useState("")
  const [brandingLogoFileName, setBrandingLogoFileName] = React.useState("")
  const [brandingLogoDarkFileName, setBrandingLogoDarkFileName] = React.useState("")
  const [folderDraft, setFolderDraft] = React.useState<Partial<DataroomFolder>>({})
  const [taxonomyNodes, setTaxonomyNodes] = React.useState<TaxonomyNodeOption[]>([])
  const [documentTypes, setDocumentTypes] = React.useState<DocumentTypeOption[]>([])
  const [correspondents, setCorrespondents] = React.useState<CorrespondentOption[]>([])
  const [domainEntities, setDomainEntities] = React.useState<EntityTypeOption[]>([])
  const [customFields, setCustomFields] = React.useState<CustomFieldOption[]>([])
  const [selectedTaxonomyNodeID, setSelectedTaxonomyNodeID] = React.useState("")
  const [selectedDocumentTypeID, setSelectedDocumentTypeID] = React.useState("")
  const [selectedCorrespondentID, setSelectedCorrespondentID] = React.useState("")
  const [selectedDomainEntityID, setSelectedDomainEntityID] = React.useState("")
  const [includeAllTaxonomyItems, setIncludeAllTaxonomyItems] = React.useState(false)
  const [includeAllDocumentTypeItems, setIncludeAllDocumentTypeItems] = React.useState(false)
  const [includeAllCorrespondentItems, setIncludeAllCorrespondentItems] = React.useState(false)
  const [includeAllDomainEntityItems, setIncludeAllDomainEntityItems] = React.useState(false)
  const [inviteeDraft, setInviteeDraft] = React.useState<Partial<DataroomInvitee>>({
    magic_link_mode: "one_time",
    access_preset: "24 hours",
    magic_link_ttl_minutes: 15,
  })
  const [templateEditorKey, setTemplateEditorKey] = React.useState<string | null>(null)
  const [memberDetailKey, setMemberDetailKey] = React.useState<string | null>(null)
  const [scheduledInviteDates, setScheduledInviteDates] = React.useState<Record<string, string>>({})
  const [sendingInviteKey, setSendingInviteKey] = React.useState<string | null>(null)
  const [savingFolderID, setSavingFolderID] = React.useState<string | null>(null)
  const [deletingFolderID, setDeletingFolderID] = React.useState<string | null>(null)
  const [memberActionKey, setMemberActionKey] = React.useState<string | null>(null)
  const [sourceDocuments, setSourceDocuments] = React.useState<PaperlessDocument[]>([])
  const [documentsLoading, setDocumentsLoading] = React.useState(false)
  const [documentSearch, setDocumentSearch] = React.useState("")
  const [selectedDocumentIDs, setSelectedDocumentIDs] = React.useState<Record<string, boolean>>({})
  const [publishTargetFolderID, setPublishTargetFolderID] = React.useState("")
  const [selectedHierarchyFolderID, setSelectedHierarchyFolderID] = React.useState("")
  const [publishingDocuments, setPublishingDocuments] = React.useState(false)
  const [publishMode, setPublishMode] = React.useState<"immediate" | "scheduled">("immediate")
  const [scheduledPublishAt, setScheduledPublishAt] = React.useState("")
  const [publishWorkspaceView, setPublishWorkspaceView] =
    React.useState<PublishWorkspaceView>("manual")
  const [releases, setReleases] = React.useState<DataroomRelease[]>([])
  const [publishedReleaseItems, setPublishedReleaseItems] = React.useState<DataroomReleaseItem[]>([])
  const [scheduledReleaseItems, setScheduledReleaseItems] = React.useState<DataroomReleaseItem[]>([])
  const [selectedReleaseDocumentID, setSelectedReleaseDocumentID] = React.useState<string>("")
  const [loading, setLoading] = React.useState(false)
  const pendingInviteCount = React.useMemo(
    () => invitees.filter((invitee) => !invitee.activated_at).length,
    [invitees],
  )

  const formatDateTime = React.useCallback((value?: string) => {
    if (!value) return "n/a"
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleString()
  }, [])

  const formatDateInputValue = React.useCallback((value?: string) => {
    if (!value) return ""
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ""
    return parsed.toISOString().slice(0, 10)
  }, [])

  const toISODateString = React.useCallback((value: string) => {
    if (!value) return undefined
    return `${value}T00:00:00Z`
  }, [])

  const hasValidDateWindow = React.useCallback((draft: Partial<Dataroom>) => {
    if (!draft.commencement_date || !draft.closure_date) return true
    const start = new Date(draft.commencement_date)
    const end = new Date(draft.closure_date)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return true
    return end.getTime() >= start.getTime()
  }, [])

  const formatUserLabel = React.useCallback((user: PaperlessUser) => {
    const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
    if (fullName) return `${fullName} (${user.username || user.id})`
    return user.username || String(user.id)
  }, [])

  const usersById = React.useMemo(
    () =>
      users.reduce<Record<string, PaperlessUser>>((accumulator, user) => {
        accumulator[String(user.id)] = user
        return accumulator
      }, {}),
    [users],
  )

  const ownerRows = React.useMemo(
    () =>
      owners.map((owner) => ({
        owner,
        user: usersById[owner.subject_id],
      })),
    [owners, usersById],
  )

  const filteredUsers = React.useMemo(() => {
    const query = ownerSearch.trim().toLowerCase()
    const owned = new Set(owners.map((owner) => owner.subject_id))
    return users.filter((user) => {
      const userId = String(user.id)
      if (owned.has(userId)) return false
      if (!query) return true
      const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim().toLowerCase()
      return (
        userId.includes(query) ||
        (user.username ?? "").toLowerCase().includes(query) ||
        (user.email ?? "").toLowerCase().includes(query) ||
        fullName.includes(query)
      )
    })
  }, [ownerSearch, owners, users])

  const activeTemplate = React.useMemo(
    () => EMAIL_TEMPLATE_DEFINITIONS.find((template) => template.key === templateEditorKey) ?? null,
    [templateEditorKey],
  )

  const activeTemplateValue = React.useMemo(
    () => (templateEditorKey ? roomDraft.email_templates?.[templateEditorKey] ?? {} : null),
    [roomDraft.email_templates, templateEditorKey],
  )
  const selectedTaxonomyNodeLabel = React.useMemo(() => {
    const node = taxonomyNodes.find(
      (item) => (item.taxonomy_node_id || item.label) === selectedTaxonomyNodeID,
    )
    return node?.path || node?.label || ""
  }, [taxonomyNodes, selectedTaxonomyNodeID])
  const selectedDocumentTypeLabel = React.useMemo(() => {
    const item = documentTypes.find((entry) => String(entry.id) === selectedDocumentTypeID)
    return item?.name || ""
  }, [documentTypes, selectedDocumentTypeID])
  const selectedCorrespondentLabel = React.useMemo(() => {
    const item = correspondents.find((entry) => String(entry.id) === selectedCorrespondentID)
    return item?.name || ""
  }, [correspondents, selectedCorrespondentID])
  const selectedDomainEntityLabel = React.useMemo(() => {
    const item = domainEntities.find(
      (entry) => (entry.entity_type_id || entry.label) === selectedDomainEntityID,
    )
    return item?.label || item?.entity_type_id || ""
  }, [domainEntities, selectedDomainEntityID])
  const generatedFolderRulesText = React.useMemo(() => {
    const sources: string[] = []
    if (includeAllTaxonomyItems && selectedTaxonomyNodeLabel) {
      sources.push(`all documents under taxonomy node "${selectedTaxonomyNodeLabel}"`)
    }
    if (includeAllDocumentTypeItems && selectedDocumentTypeLabel) {
      sources.push(`all documents with document type "${selectedDocumentTypeLabel}"`)
    }
    if (includeAllCorrespondentItems && selectedCorrespondentLabel) {
      sources.push(`all documents from correspondent "${selectedCorrespondentLabel}"`)
    }
    if (includeAllDomainEntityItems && selectedDomainEntityLabel) {
      sources.push(`all documents linked to domain entity "${selectedDomainEntityLabel}"`)
    }
    if (sources.length === 0 && folderDraft.label?.trim()) {
      sources.push(`documents manually assigned to folder "${folderDraft.label.trim()}"`)
    }
    if (sources.length === 0) {
      sources.push("documents explicitly selected and assigned to this folder")
    }

    const immediate =
      folderDraft.auto_publish_immediately ??
      roomDraft.auto_publish_immediately ??
      true
    const scheduleTime =
      folderDraft.auto_publish_scheduled_time ||
      roomDraft.auto_publish_scheduled_time ||
      "00:00"
    const publishSentence = immediate
      ? "Publishing occurs immediately after matching or assignment."
      : `Publishing occurs on the scheduled release window at ${scheduleTime}.`
    return `Include ${sources.join(" and ")}. ${publishSentence}`
  }, [
    includeAllTaxonomyItems,
    includeAllDocumentTypeItems,
    includeAllCorrespondentItems,
    includeAllDomainEntityItems,
    selectedTaxonomyNodeLabel,
    selectedDocumentTypeLabel,
    selectedCorrespondentLabel,
    selectedDomainEntityLabel,
    folderDraft.label,
    folderDraft.auto_publish_immediately,
    folderDraft.auto_publish_scheduled_time,
    roomDraft.auto_publish_immediately,
    roomDraft.auto_publish_scheduled_time,
  ])
  const inviteeStatsByKey = React.useMemo(() => {
    const map = new Map<string, DataroomInviteeStats>()
    inviteeStats.forEach((entry) => {
      if (entry.invitee_id) map.set(entry.invitee_id, entry)
      if (entry.email) map.set(`email:${entry.email.toLowerCase()}`, entry)
    })
    return map
  }, [inviteeStats])
  const selectedInviteeDetail = React.useMemo(() => {
    if (!memberDetailKey) return null
    const invitee =
      invitees.find((entry) => entry.invitee_id === memberDetailKey || entry.email === memberDetailKey) ??
      null
    if (!invitee) return null
    const stats =
      (invitee.invitee_id && inviteeStatsByKey.get(invitee.invitee_id)) ||
      inviteeStatsByKey.get(`email:${invitee.email.toLowerCase()}`) ||
      null
    return { invitee, stats }
  }, [invitees, inviteeStatsByKey, memberDetailKey])
  const summaryCountsByType = React.useMemo(() => {
    const map = new Map<string, number>()
    summary.forEach((entry) => map.set(entry.event_type, entry.count))
    return map
  }, [summary])
  const getSummaryCount = React.useCallback(
    (...keys: string[]) => keys.reduce((count, key) => count + (summaryCountsByType.get(key) ?? 0), 0),
    [summaryCountsByType],
  )
  const folderTree = React.useMemo(() => buildFolderTree(folders), [folders])
  const selectedHierarchyFolder = React.useMemo(
    () => folders.find((folder) => folder.folder_id === selectedHierarchyFolderID) ?? null,
    [folders, selectedHierarchyFolderID],
  )
  const isManualSelectedFolder = React.useMemo(
    () => Boolean(selectedHierarchyFolder && !selectedHierarchyFolder.linked_item_type),
    [selectedHierarchyFolder],
  )
  const effectivePublishWorkspaceView: PublishWorkspaceView = isManualSelectedFolder
    ? "manual"
    : publishWorkspaceView
  const selectedDocumentCount = React.useMemo(
    () => Object.values(selectedDocumentIDs).filter(Boolean).length,
    [selectedDocumentIDs],
  )
  const placementCountsByFolder = React.useMemo(() => {
    const map = new Map<string, number>()
    ;[...publishedReleaseItems, ...scheduledReleaseItems].forEach((item) => {
      const key = item.folder_id || "__unknown__"
      map.set(key, (map.get(key) ?? 0) + 1)
    })
    return map
  }, [publishedReleaseItems, scheduledReleaseItems])

  const loadRooms = React.useCallback(async () => {
    const data = await getJson<DataroomListResponse>("/api/link-iq/datarooms")
    const nextRooms = data.datarooms ?? []
    setRooms(nextRooms)
    setSelectedId((current) => (current || nextRooms.length === 0 ? current : nextRooms[0].dataroom_id))
  }, [])

  const loadUsers = React.useCallback(async () => {
    try {
      const response = await getJson<{ users?: PaperlessUser[] }>("/api/link-iq/datarooms/users")
      const nextUsers = normalizeUsersResponse(response)
      if (nextUsers.length === 0) {
        throw new Error("No users returned from users directory")
      }
      setUsers(nextUsers)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load users")
    }
  }, [])

  const loadHierarchySourceOptions = React.useCallback(async () => {
    const [taxonomyResult, documentTypeResult, correspondentsResult, entityResult, customFieldsResult] =
      await Promise.allSettled([
        getJson<{ nodes?: TaxonomyNodeOption[] }>("/api/link-iq/taxonomy/nodes"),
        getJson<{ results?: DocumentTypeOption[] } | DocumentTypeOption[]>(
          "/api/management/lookups?kind=document-types",
        ),
        getJson<{ results?: CorrespondentOption[] } | CorrespondentOption[]>(
          "/api/management/lookups?kind=correspondents",
        ),
        getJson<{ entity_types?: EntityTypeOption[] }>("/api/link-iq/entity-types"),
        getJson<{ results?: CustomFieldOption[] } | CustomFieldOption[]>(
          "/api/management/lookups?kind=custom-fields",
        ),
      ])

    if (taxonomyResult.status === "fulfilled") {
      setTaxonomyNodes(normalizePaginatedArray<TaxonomyNodeOption>(taxonomyResult.value))
    }
    if (documentTypeResult.status === "fulfilled") {
      setDocumentTypes(normalizePaginatedArray<DocumentTypeOption>(documentTypeResult.value))
    }
    if (correspondentsResult.status === "fulfilled") {
      setCorrespondents(normalizePaginatedArray<CorrespondentOption>(correspondentsResult.value))
    }
    if (entityResult.status === "fulfilled") {
      setDomainEntities(normalizePaginatedArray<EntityTypeOption>(entityResult.value))
    }
    if (customFieldsResult.status === "fulfilled") {
      setCustomFields(normalizePaginatedArray<CustomFieldOption>(customFieldsResult.value))
    }

    const failed = [
      taxonomyResult,
      documentTypeResult,
      correspondentsResult,
      entityResult,
      customFieldsResult,
    ].filter(
      (result) => result.status === "rejected",
    )
    if (failed.length > 0) {
      toast.error("Some hierarchy source lists could not be loaded")
    }
  }, [])

  const loadDetail = React.useCallback(async (id: string) => {
    if (!id) return null
    setLoading(true)
    try {
      const [room, ownerData, folderData, inviteeData, analyticsData, placementsData, releasesData, publishedItemsData, scheduledItemsData] = await Promise.all([
        getJson<Dataroom>(`/api/link-iq/datarooms/${id}`),
        getJson<OwnersResponse>(`/api/link-iq/datarooms/${id}/owners`),
        getJson<FoldersResponse>(`/api/link-iq/datarooms/${id}/folders`),
        getJson<InviteesResponse>(`/api/link-iq/datarooms/${id}/invitees`),
        getJson<AnalyticsResponse>(`/api/link-iq/datarooms/${id}/analytics`),
        getJson<PlacementsResponse>(`/api/link-iq/datarooms/${id}/documents`),
        getJson<ReleasesResponse>(`/api/link-iq/datarooms/${id}/releases`),
        getJson<ReleaseItemsResponse>(`/api/link-iq/datarooms/${id}/releases/items?status=published`),
        getJson<ReleaseItemsResponse>(`/api/link-iq/datarooms/${id}/releases/items?status=scheduled`),
      ])
      setRoomDraft({
        ...room,
        auto_publish_immediately: room.auto_publish_immediately !== false,
        auto_publish_scheduled_time: room.auto_publish_scheduled_time || "00:00",
      })
      setOwners(ownerData.owners ?? [])
      setOwnerToAdd("")
      setOwnerSearch("")
      setBrandingLogoFileName("")
      setBrandingLogoDarkFileName("")
      setFolders(folderData.folders ?? [])
      setFolderCounts(folderData.folder_counts ?? {})
      setPlacements(placementsData.placements ?? [])
      setInvitees(inviteeData.invitees ?? [])
      setSummary(analyticsData.summary ?? [])
      setInviteeStats(analyticsData.invitees ?? [])
      setReleases(releasesData.releases ?? [])
      setPublishedReleaseItems(publishedItemsData.items ?? [])
      setScheduledReleaseItems(scheduledItemsData.items ?? [])
      return {
        room,
        owners: ownerData.owners ?? [],
        folders: folderData.folders ?? [],
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load dataroom details")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSourceDocuments = React.useCallback(async () => {
    setDocumentsLoading(true)
    try {
      const payload = await getJson<Paginated<PaperlessDocument>>("/api/proxy/documents/?page_size=200")
      setSourceDocuments(normalizePaginatedArray<PaperlessDocument>(payload))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load source documents")
      setSourceDocuments([])
    } finally {
      setDocumentsLoading(false)
    }
  }, [])

  const buildRoomPayload = React.useCallback(
    (draft: Partial<Dataroom>): Partial<Dataroom> => ({
      ...draft,
      auto_publish_immediately: draft.auto_publish_immediately !== false,
      auto_publish_scheduled_time: draft.auto_publish_scheduled_time || "00:00",
    }),
    [],
  )

  React.useEffect(() => {
    void loadRooms().catch(() => {})
  }, [loadRooms])

  React.useEffect(() => {
    void loadUsers().catch(() => {})
  }, [loadUsers])

  React.useEffect(() => {
    void loadHierarchySourceOptions().catch(() => {})
  }, [loadHierarchySourceOptions])

  React.useEffect(() => {
    void loadSourceDocuments().catch(() => {})
  }, [loadSourceDocuments])

  React.useEffect(() => {
    void loadDetail(selectedId)
  }, [selectedId, loadDetail])

  React.useEffect(() => {
    const missingOwnerIDs = owners
      .map((owner) => owner.subject_id)
      .filter((subjectID) => subjectID && !usersById[subjectID])
    if (missingOwnerIDs.length === 0) return
    void loadUsers()
  }, [owners, usersById, loadUsers])

  const createDataroom = async () => {
    if (!roomDraft.title?.trim()) {
      toast.error("Dataroom title is required")
      return
    }
    if (!hasValidDateWindow(roomDraft)) {
      toast.error("End date must be on or after start date")
      return
    }
    try {
      const created = await postJson<Dataroom>("/api/link-iq/datarooms", buildRoomPayload(roomDraft))
      toast.success("Dataroom created")
      await loadRooms()
      if (created.dataroom_id) {
        setSelectedId(created.dataroom_id)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create dataroom")
    }
  }

  const saveDataroom = async () => {
    if (!selectedId) return
    if (!hasValidDateWindow(roomDraft)) {
      toast.error("End date must be on or after start date")
      return
    }
    try {
      await putJson<Dataroom>(`/api/link-iq/datarooms/${selectedId}`, buildRoomPayload(roomDraft))
      toast.success("Dataroom updated")
      await loadRooms()
      await loadDetail(selectedId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update dataroom")
    }
  }

  const handleLogoUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    key: "login_logo_url" | "login_logo_dark_url",
    setFileName: (value: string) => void,
    label: string,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    const isSVG = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")
    const isImage = file.type.startsWith("image/")
    if (!isSVG && !isImage) {
      toast.error("Please upload an SVG or image file")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== "string") {
        toast.error(`Failed to read ${label} file`)
        return
      }
      setRoomDraft((previous) => ({ ...previous, [key]: result }))
      setFileName(file.name)
      toast.success(`${label} uploaded`)
    }
    reader.onerror = () => {
      toast.error(`Failed to read ${label} file`)
    }
    reader.readAsDataURL(file)
  }

  const handleBrandingLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleLogoUpload(event, "login_logo_url", setBrandingLogoFileName, "Branding light logo")
  }

  const handleBrandingLogoDarkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleLogoUpload(event, "login_logo_dark_url", setBrandingLogoDarkFileName, "Branding dark logo")
  }

  const startCreateNewDataroom = () => {
    setSelectedId("")
    setRoomDraft({
      auto_publish_immediately: true,
      auto_publish_scheduled_time: "00:00",
    })
    setOwners([])
    setFolders([])
    setFolderCounts({})
    setInvitees([])
    setSummary([])
    setInviteeStats([])
    setOwnerSearch("")
    setOwnerToAdd("")
    setBrandingLogoFileName("")
    setBrandingLogoDarkFileName("")
    setSelectedTaxonomyNodeID("")
    setSelectedDocumentTypeID("")
    setSelectedCorrespondentID("")
    setSelectedDomainEntityID("")
    setIncludeAllTaxonomyItems(false)
    setIncludeAllDocumentTypeItems(false)
    setIncludeAllCorrespondentItems(false)
    setIncludeAllDomainEntityItems(false)
    setFolderDraft({})
    setInviteeDraft({
      magic_link_mode: "one_time",
      access_preset: "24 hours",
      magic_link_ttl_minutes: 15,
    })
    setTemplateEditorKey(null)
  }

  const addOwner = async () => {
    if (!selectedId || !ownerToAdd.trim()) return
    try {
      const data = await postJson<OwnersResponse>(`/api/link-iq/datarooms/${selectedId}/owners`, {
        subject_id: ownerToAdd.trim(),
      })
      setOwners(data.owners ?? [])
      setOwnerToAdd("")
      setOwnerSearch("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add owner")
    }
  }

  const removeOwner = async (subjectID: string) => {
    if (!selectedId) return
    try {
      await deleteJson<{ deleted: boolean }>(`/api/link-iq/datarooms/${selectedId}/owners`, {
        body: { subject_id: subjectID },
      })
      setOwners((previous) => previous.filter((owner) => owner.subject_id !== subjectID))
      toast.success("Owner removed")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove owner")
    }
  }

  const sendInviteNow = async (invitee: DataroomInvitee) => {
    if (!selectedId || !roomDraft.slug || !invitee.email) {
      toast.error("Dataroom slug and invitee email are required to send invite")
      return
    }
    const rowKey = invitee.invitee_id || invitee.email
    setSendingInviteKey(rowKey)
    try {
      await postJson<DataroomInvitee>(`/api/link-iq/datarooms/${selectedId}/invitees`, {
        ...invitee,
        access_start: new Date().toISOString(),
        access_end: undefined,
      })
      await postJson<{ issued?: boolean }>("/api/link-iq/dataroom-public/request-link", {
        slug: roomDraft.slug,
        email: invitee.email,
        purpose: "login",
      })
      toast.success("Invite sent")
      await loadDetail(selectedId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invite")
    } finally {
      setSendingInviteKey(null)
    }
  }

  const scheduleInviteDate = async (invitee: DataroomInvitee, localValue: string) => {
    const rowKey = invitee.invitee_id || invitee.email
    setScheduledInviteDates((previous) => ({ ...previous, [rowKey]: localValue }))
    if (!selectedId || !invitee.email || !localValue) return
    try {
      await postJson<DataroomInvitee>(`/api/link-iq/datarooms/${selectedId}/invitees`, {
        ...invitee,
        access_start: new Date(localValue).toISOString(),
      })
      await loadDetail(selectedId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to schedule invite date")
    }
  }

  const saveFolder = async () => {
    if (!selectedId || !folderDraft.label?.trim()) return
    try {
      const folderIDForSave = folderDraft.folder_id || selectedHierarchyFolderID || ""
      const isUpdate = Boolean(folderIDForSave)
      const existingFolder = folderIDForSave
        ? (folders.find((entry) => entry.folder_id === folderIDForSave) ?? selectedHierarchyFolder ?? undefined)
        : undefined
      const draftDescription = folderDraft.description ?? existingFolder?.description ?? ""
      const nextDescription =
        isUpdate && draftDescription.trim() === "" && (existingFolder?.description ?? "").trim() !== ""
          ? existingFolder?.description || ""
          : draftDescription
      const nextRules =
        folderDraft.rules?.trim()
          ? folderDraft.rules
          : existingFolder?.rules || generatedFolderRulesText
      const nextLinkedItem = {
        linked_item_type: folderDraft.linked_item_type ?? existingFolder?.linked_item_type,
        linked_item_id: folderDraft.linked_item_id ?? existingFolder?.linked_item_id,
        linked_item_label: folderDraft.linked_item_label ?? existingFolder?.linked_item_label,
      }

      const savedFolder = await postJson<DataroomFolder>(`/api/link-iq/datarooms/${selectedId}/folders`, {
        ...existingFolder,
        ...folderDraft,
        folder_id: folderIDForSave || undefined,
        ...nextLinkedItem,
        description: nextDescription,
        rules: nextRules,
      })

      if (isUpdate && savedFolder?.folder_id) {
        setSelectedHierarchyFolderID(savedFolder.folder_id)
        setPublishTargetFolderID(savedFolder.folder_id)
      } else {
        setFolderDraft({})
        setPublishTargetFolderID("")
      }
      const detail = await loadDetail(selectedId)
      if (isUpdate && savedFolder?.folder_id) {
        const refreshed =
          detail?.folders.find((entry) => entry.folder_id === savedFolder.folder_id) ||
          detail?.folders.find((entry) => entry.folder_id === folderIDForSave) ||
          null
        if (refreshed) {
          hydrateFolderDraftFromSelection(refreshed)
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save folder")
    }
  }

  const addFolderFromCatalog = async (
    label: string,
    sourceType?: DataroomFolder["linked_item_type"],
    sourceID?: string,
    sourceLabel?: string,
  ) => {
    const nextLabel = label.trim()
    if (!nextLabel || !selectedId) return
    try {
      await postJson<DataroomFolder>(`/api/link-iq/datarooms/${selectedId}/folders`, {
        label: nextLabel,
        parent_folder_id: folderDraft.parent_folder_id,
        linked_item_type: sourceType,
        linked_item_id: sourceID,
        linked_item_label: sourceLabel,
        rules: generatedFolderRulesText,
        description: folderDraft.description,
        auto_publish_immediately: folderDraft.auto_publish_immediately,
        auto_publish_scheduled_time: folderDraft.auto_publish_scheduled_time,
        publishing_on_hold: folderDraft.publishing_on_hold,
      })
      setPublishTargetFolderID("")
      await loadDetail(selectedId)
      toast.success(`Added "${nextLabel}" to hierarchy`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add item to hierarchy")
    }
  }

  const toggleFolderHold = async (folder: DataroomFolder) => {
    if (!selectedId) return
    setSavingFolderID(folder.folder_id)
    try {
      await postJson<DataroomFolder>(`/api/link-iq/datarooms/${selectedId}/folders`, {
        ...folder,
        publishing_on_hold: !folder.publishing_on_hold,
      })
      await loadDetail(selectedId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update folder hold")
    } finally {
      setSavingFolderID(null)
    }
  }

  const removeFolder = async (folder: DataroomFolder) => {
    if (!selectedId || !folder.folder_id) return
    setDeletingFolderID(folder.folder_id)
    try {
      await deleteJson<{ deleted: boolean }>(`/api/link-iq/datarooms/${selectedId}/folders`, {
        body: { folder_id: folder.folder_id },
      })
      setPublishTargetFolderID((current) => (current === folder.folder_id ? "" : current))
      await loadDetail(selectedId)
      toast.success("Folder removed from dataroom")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove folder")
    } finally {
      setDeletingFolderID(null)
    }
  }

  const filteredSourceDocuments = React.useMemo(() => {
    const effectiveDocumentTypeFilter =
      selectedHierarchyFolder?.linked_item_type === "document_type"
        ? selectedHierarchyFolder.linked_item_id || ""
        : selectedDocumentTypeID
    const effectiveCorrespondentFilter =
      selectedHierarchyFolder?.linked_item_type === "correspondent"
        ? selectedHierarchyFolder.linked_item_id || ""
        : selectedCorrespondentID
    const query = documentSearch.trim().toLowerCase()
    return sourceDocuments.filter((doc) => {
      if (effectiveDocumentTypeFilter && String(doc.document_type ?? "") !== effectiveDocumentTypeFilter) {
        return false
      }
      if (effectiveCorrespondentFilter && String(doc.correspondent ?? "") !== effectiveCorrespondentFilter) {
        return false
      }
      if (!query) return true
      return (
        String(doc.id).includes(query) ||
        (doc.title ?? "").toLowerCase().includes(query)
      )
    })
  }, [
    sourceDocuments,
    documentSearch,
    selectedDocumentTypeID,
    selectedCorrespondentID,
    selectedHierarchyFolder,
  ])

  const sourceDocumentByID = React.useMemo(() => {
    return sourceDocuments.reduce<Record<string, PaperlessDocument>>((accumulator, doc) => {
      accumulator[String(doc.id)] = doc
      return accumulator
    }, {})
  }, [sourceDocuments])

  const releaseItemStatusByDocumentID = React.useMemo(() => {
    const map = new Map<string, "published" | "scheduled">()
    publishedReleaseItems.forEach((item) => map.set(String(item.document_id), "published"))
    scheduledReleaseItems.forEach((item) => {
      if (!map.has(String(item.document_id))) map.set(String(item.document_id), "scheduled")
    })
    return map
  }, [publishedReleaseItems, scheduledReleaseItems])

  const metadataHash = React.useCallback((doc?: PaperlessDocument) => {
    if (!doc) return ""
    return JSON.stringify({
      title: doc.title ?? "",
      content: asString(doc.content),
      created: doc.created ?? "",
      correspondent: doc.correspondent ?? null,
      document_type: doc.document_type ?? null,
      original_md5: asString(doc.original_md5),
      archive_md5: asString(doc.archive_md5),
      original_file_size: asNumber(doc.original_file_size),
      archive_file_size: asNumber(doc.archive_file_size),
    })
  }, [])

  const latestPublishedItemByDocumentID = React.useMemo(() => {
    const map = new Map<string, DataroomReleaseItem>()
    publishedReleaseItems.forEach((item) => {
      const key = String(item.document_id)
      if (!map.has(key)) map.set(key, item)
    })
    return map
  }, [publishedReleaseItems])

  const upstreamChangedDocumentIDs = React.useMemo(() => {
    const changed = new Set<string>()
    latestPublishedItemByDocumentID.forEach((item, documentID) => {
      const currentHash = metadataHash(sourceDocumentByID[documentID])
      const publishedHash =
        item.last_upstream_metadata_hash ||
        JSON.stringify(item.metadata_snapshot ?? {})
      if (currentHash && publishedHash && currentHash !== publishedHash) {
        changed.add(documentID)
      }
    })
    return changed
  }, [latestPublishedItemByDocumentID, metadataHash, sourceDocumentByID])

  const selectedFolderPublishedItems = React.useMemo(
    () =>
      publishedReleaseItems.filter((item) =>
        selectedHierarchyFolderID ? item.folder_id === selectedHierarchyFolderID : true,
      ),
    [publishedReleaseItems, selectedHierarchyFolderID],
  )

  const selectedFolderScheduledItems = React.useMemo(
    () =>
      scheduledReleaseItems.filter((item) =>
        selectedHierarchyFolderID ? item.folder_id === selectedHierarchyFolderID : true,
      ),
    [scheduledReleaseItems, selectedHierarchyFolderID],
  )

  const publishedItemByDocumentID = React.useMemo(() => {
    const map = new Map<string, DataroomReleaseItem>()
    selectedFolderPublishedItems.forEach((item) => {
      const key = String(item.document_id)
      const existing = map.get(key)
      const existingTs = existing?.published_at ? new Date(existing.published_at).getTime() : 0
      const nextTs = item.published_at ? new Date(item.published_at).getTime() : 0
      if (!existing || nextTs >= existingTs) {
        map.set(key, item)
      }
    })
    return map
  }, [selectedFolderPublishedItems])

  const scheduledItemByDocumentID = React.useMemo(() => {
    const map = new Map<string, DataroomReleaseItem>()
    selectedFolderScheduledItems.forEach((item) => {
      const key = String(item.document_id)
      const existing = map.get(key)
      const existingTs = existing?.scheduled_at ? new Date(existing.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER
      const nextTs = item.scheduled_at ? new Date(item.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER
      if (!existing || nextTs <= existingTs) {
        map.set(key, item)
      }
    })
    return map
  }, [selectedFolderScheduledItems])

  const lastPublishedAtForSelectedFolder = React.useMemo(() => {
    let latest = 0
    selectedFolderPublishedItems.forEach((item) => {
      const ts = item.published_at ? new Date(item.published_at).getTime() : 0
      if (ts > latest) latest = ts
    })
    return latest > 0 ? new Date(latest).toISOString() : undefined
  }, [selectedFolderPublishedItems])

  const scheduledDefaultTime = React.useMemo(() => {
    if (selectedHierarchyFolder?.auto_publish_immediately === false) {
      return selectedHierarchyFolder.auto_publish_scheduled_time || roomDraft.auto_publish_scheduled_time || "00:00"
    }
    return roomDraft.auto_publish_scheduled_time || "00:00"
  }, [
    selectedHierarchyFolder?.auto_publish_immediately,
    selectedHierarchyFolder?.auto_publish_scheduled_time,
    roomDraft.auto_publish_scheduled_time,
  ])

  const immediateWorkspaceRows = React.useMemo(
    () =>
      filteredSourceDocuments.map((doc) => {
        const key = String(doc.id)
        const published = publishedItemByDocumentID.get(key)
        const scheduled = scheduledItemByDocumentID.get(key)
        return {
          id: key,
          title: doc.title || `Document ${doc.id}`,
          publishedAt: published?.published_at,
          status: scheduled ? "scheduled" : published ? "published" : "not published",
          scheduledAt: scheduled?.scheduled_at,
        }
      }),
    [filteredSourceDocuments, publishedItemByDocumentID, scheduledItemByDocumentID],
  )

  const scheduledWorkspaceRows = React.useMemo(() => {
    const lastPublishedTs = lastPublishedAtForSelectedFolder
      ? new Date(lastPublishedAtForSelectedFolder).getTime()
      : 0
    return filteredSourceDocuments
      .map((doc) => {
        const key = String(doc.id)
        const published = publishedItemByDocumentID.get(key)
        const scheduled = scheduledItemByDocumentID.get(key)
        const createdTs = doc.created ? new Date(doc.created).getTime() : 0
        const isNewSinceLastPublish = Boolean(lastPublishedTs && createdTs > lastPublishedTs && !published)

        if (!published && !scheduled && !isNewSinceLastPublish) return null

        return {
          id: key,
          title: doc.title || `Document ${doc.id}`,
          status: scheduled
            ? "scheduled"
            : isNewSinceLastPublish
              ? "new since last publish"
              : "published",
          referenceTime: scheduled?.scheduled_at || published?.published_at,
        }
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
  }, [
    filteredSourceDocuments,
    lastPublishedAtForSelectedFolder,
    publishedItemByDocumentID,
    scheduledItemByDocumentID,
  ])

  const toggleDocumentSelection = (documentID: number) => {
    const key = String(documentID)
    setSelectedDocumentIDs((previous) => ({ ...previous, [key]: !previous[key] }))
  }

  const publishSelectedDocuments = async (options?: {
    mode?: "immediate" | "scheduled"
    scheduledAtISO?: string
  }) => {
    if (!selectedId) return
    const effectiveMode = options?.mode ?? publishMode
    const targetFolderID =
      publishTargetFolderID || selectedHierarchyFolderID || folderDraft.parent_folder_id || folders[0]?.folder_id
    if (!targetFolderID) {
      toast.error("Select or create a target folder before publishing documents")
      return
    }
    const selectedIDs = Object.entries(selectedDocumentIDs)
      .filter(([, checked]) => checked)
      .map(([id]) => id)
    if (selectedIDs.length === 0) {
      toast.error("Select at least one document to publish")
      return
    }
    setPublishingDocuments(true)
    try {
      const scheduledAtISO =
        effectiveMode === "scheduled"
          ? options?.scheduledAtISO ||
            (scheduledPublishAt ? new Date(scheduledPublishAt).toISOString() : undefined)
          : undefined
      const items: DataroomReleaseItem[] = selectedIDs.map((documentID) => {
        const sourceDocument = sourceDocumentByID[documentID]
        const folder = folders.find((entry) => entry.folder_id === targetFolderID)
        const metadataSnapshot = {
          title: sourceDocument?.title ?? "",
          content: asString(sourceDocument?.content),
          created: sourceDocument?.created ?? "",
          correspondent: sourceDocument?.correspondent ?? null,
          document_type: sourceDocument?.document_type ?? null,
          original_md5: asString(sourceDocument?.original_md5),
          archive_md5: asString(sourceDocument?.archive_md5),
          original_file_size: asNumber(sourceDocument?.original_file_size),
          archive_file_size: asNumber(sourceDocument?.archive_file_size),
        }
        return {
          folder_id: targetFolderID,
          document_id: documentID,
          source_id: selectedTaxonomyNodeID || selectedDocumentTypeID || selectedCorrespondentID || "",
          metadata_snapshot: metadataSnapshot,
          published_metadata_fields: folder?.published_metadata_fields ?? [],
          published_custom_field_ids: folder?.published_custom_field_ids ?? [],
          last_upstream_metadata_hash: JSON.stringify(metadataSnapshot),
        }
      })
      await postJson<DataroomRelease>(`/api/link-iq/datarooms/${selectedId}/releases`, {
        items,
        scheduled_at: scheduledAtISO,
      })
      toast.success(
        `${effectiveMode === "scheduled" ? "Scheduled" : "Published"} ${selectedIDs.length} document${selectedIDs.length === 1 ? "" : "s"}`,
      )
      setSelectedDocumentIDs({})
      await loadDetail(selectedId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create release")
    } finally {
      setPublishingDocuments(false)
    }
  }

  const nextScheduledISOForTime = React.useCallback((hhmm?: string) => {
    if (!hhmm || !hhmm.includes(":")) {
      return new Date(Date.now() + 60 * 1000).toISOString()
    }
    const [hourRaw, minuteRaw] = hhmm.split(":")
    const hour = Number(hourRaw)
    const minute = Number(minuteRaw)
    const now = new Date()
    const candidate = new Date(now)
    candidate.setHours(Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0, 0, 0)
    if (candidate.getTime() <= now.getTime()) {
      candidate.setDate(candidate.getDate() + 1)
    }
    return candidate.toISOString()
  }, [])

  const scheduleSelectedDocuments = async () => {
    const preferredTime =
      selectedHierarchyFolder?.auto_publish_immediately === false
        ? selectedHierarchyFolder.auto_publish_scheduled_time
        : roomDraft.auto_publish_scheduled_time
    await publishSelectedDocuments({
      mode: "scheduled",
      scheduledAtISO: nextScheduledISOForTime(preferredTime || "00:00"),
    })
  }

  const saveInvitee = async () => {
    if (!selectedId || !inviteeDraft.email?.trim()) return
    try {
      await postJson<DataroomInvitee>(`/api/link-iq/datarooms/${selectedId}/invitees`, inviteeDraft)
      setInviteeDraft({
        magic_link_mode: "one_time",
        access_preset: "24 hours",
        magic_link_ttl_minutes: 15,
      })
      await loadDetail(selectedId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save invitee")
    }
  }

  const toggleInviteeDisabled = async (invitee: DataroomInvitee) => {
    if (!selectedId || !invitee.email) return
    const rowKey = invitee.invitee_id || invitee.email
    setMemberActionKey(rowKey)
    try {
      await postJson<DataroomInvitee>(`/api/link-iq/datarooms/${selectedId}/invitees`, {
        ...invitee,
        disabled: !invitee.disabled,
      })
      await loadDetail(selectedId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update member status")
    } finally {
      setMemberActionKey(null)
    }
  }

  const removeInvitee = async (invitee: DataroomInvitee) => {
    if (!selectedId || !invitee.invitee_id) return
    const rowKey = invitee.invitee_id || invitee.email
    setMemberActionKey(rowKey)
    try {
      await deleteJson<{ deleted: boolean }>(`/api/link-iq/datarooms/${selectedId}/invitees`, {
        body: { invitee_id: invitee.invitee_id },
      })
      await loadDetail(selectedId)
      toast.success("Member removed")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member")
    } finally {
      setMemberActionKey(null)
    }
  }

  const updateEmailTemplate = React.useCallback(
    (templateKey: string, updates: Partial<DataroomEmailTemplate>) => {
      setRoomDraft((previous) => {
        const nextTemplates = { ...(previous.email_templates ?? {}) }
        nextTemplates[templateKey] = { ...(nextTemplates[templateKey] ?? {}), ...updates }
        return { ...previous, email_templates: nextTemplates }
      })
    },
    [],
  )

  const hydrateFolderDraftFromSelection = React.useCallback((folder: DataroomFolder) => {
    setFolderDraft({
      folder_id: folder.folder_id,
      dataroom_id: folder.dataroom_id,
      parent_folder_id: folder.parent_folder_id || "",
      label: folder.label || "",
      linked_item_type: folder.linked_item_type,
      linked_item_id: folder.linked_item_id,
      linked_item_label: folder.linked_item_label,
      rules: folder.rules || "",
      description: folder.description || "",
      auto_publish_immediately: folder.auto_publish_immediately,
      auto_publish_scheduled_time: folder.auto_publish_scheduled_time || "00:00",
      publishing_on_hold: folder.publishing_on_hold ?? false,
      published_metadata_fields: (folder.published_metadata_fields ?? []).map((value) => String(value)),
      published_custom_field_ids: (folder.published_custom_field_ids ?? []).map((value) => String(value)),
    })

    const linkedType = folder.linked_item_type
    const linkedID = folder.linked_item_id || ""
    setSelectedTaxonomyNodeID(linkedType === "taxonomy" ? linkedID : "")
    setSelectedDocumentTypeID(linkedType === "document_type" ? linkedID : "")
    setSelectedCorrespondentID(linkedType === "correspondent" ? linkedID : "")
    setSelectedDomainEntityID(linkedType === "domain_entity" ? linkedID : "")

    setIncludeAllTaxonomyItems(linkedType === "taxonomy")
    setIncludeAllDocumentTypeItems(linkedType === "document_type")
    setIncludeAllCorrespondentItems(linkedType === "correspondent")
    setIncludeAllDomainEntityItems(linkedType === "domain_entity")
  }, [])

  React.useEffect(() => {
    if (!selectedHierarchyFolder) return
    hydrateFolderDraftFromSelection(selectedHierarchyFolder)
  }, [selectedHierarchyFolder, hydrateFolderDraftFromSelection])

  const folderTreeContent = (
    <div className="min-h-0 flex-1 overflow-auto px-0 py-2">
      <div className="mb-1 grid grid-cols-[minmax(0,1fr)_180px] items-center gap-1 px-1 pb-2 text-[11px] text-blue-400 tracking-wide my-2.5">
        <span>Folder (No. of items)</span>
        <span className="text-right">Publish / Hold / Remove</span>
      </div>
      {folderTree.length === 0 ? (
        <p className="py-2 text-muted-foreground text-xs">No folders yet.</p>
      ) : (
        <div className="space-y-1">
          {folderTree.map((node) => (
            <FolderTreeItem
              key={node.folder.folder_id}
              node={node}
              level={0}
              selectedFolderID={selectedHierarchyFolderID}
              folderCounts={folderCounts}
              fallbackImmediate={roomDraft.auto_publish_immediately !== false}
              fallbackScheduledTime={roomDraft.auto_publish_scheduled_time || "00:00"}
              savingFolderID={savingFolderID}
              deletingFolderID={deletingFolderID}
              onSelectFolder={(folder) =>
                {
                  setSelectedHierarchyFolderID(folder.folder_id)
                  setPublishTargetFolderID(folder.folder_id)
                  setPublishWorkspaceView(folder.linked_item_type ? "immediate" : "manual")
                  hydrateFolderDraftFromSelection(folder)
                }
              }
              onToggleFolderHold={(folder) => void toggleFolderHold(folder)}
              onRemoveFolder={(folder) => void removeFolder(folder)}
            />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="relative flex h-full min-h-0 flex-1 gap-0 overflow-hidden px-4 py-4">
      <Carousel className="h-full w-full" opts={{ align: "start" }}>
        <CarouselPrevious className="-left-2 top-1/2 z-20" />
        <CarouselNext className="-right-2 top-1/2 z-20" />
        <CarouselContent className="ml-0 h-full">
          <CarouselItem className="h-full basis-full pl-0">
            <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
              <div className="min-h-0 overflow-auto">
                <DataroomConfigurationCard
                  selectedId={selectedId}
                  rooms={rooms}
                  roomDraft={roomDraft}
                  setSelectedId={setSelectedId}
                  setRoomDraft={setRoomDraft}
                  startCreateNewDataroom={startCreateNewDataroom}
                  onSave={() => void (selectedId ? saveDataroom() : createDataroom())}
                  formatDateInputValue={formatDateInputValue}
                  toISODateString={toISODateString}
                  autoPublishTimes={AUTO_PUBLISH_TIMES}
                  handleBrandingLogoUpload={handleBrandingLogoUpload}
                  handleBrandingLogoDarkUpload={handleBrandingLogoDarkUpload}
                  brandingLogoFileName={brandingLogoFileName}
                  brandingLogoDarkFileName={brandingLogoDarkFileName}
                  setBrandingLogoFileName={setBrandingLogoFileName}
                  setBrandingLogoDarkFileName={setBrandingLogoDarkFileName}
                  ownerSearch={ownerSearch}
                  setOwnerSearch={setOwnerSearch}
                  ownerToAdd={ownerToAdd}
                  setOwnerToAdd={setOwnerToAdd}
                  filteredUsers={filteredUsers}
                  formatUserLabel={formatUserLabel}
                  addOwner={() => void addOwner()}
                  ownerRows={ownerRows}
                  formatDateTime={formatDateTime}
                  removeOwner={(subjectID) => void removeOwner(subjectID)}
                  emailTemplateDefinitions={EMAIL_TEMPLATE_DEFINITIONS}
                  onOpenTemplateEditor={setTemplateEditorKey}
                />
              </div>
              <div className="min-h-0 overflow-auto">
                <AuthorisedMembersCard
                  pendingInviteCount={pendingInviteCount}
                  inviteeDraft={inviteeDraft}
                  setInviteeDraft={setInviteeDraft}
                  accessPresets={ACCESS_PRESETS}
                  saveInvitee={() => void saveInvitee()}
                  selectedId={selectedId}
                  invitees={invitees}
                  inviteeStatsByKey={inviteeStatsByKey}
                  formatDateTime={formatDateTime}
                  scheduledInviteDates={scheduledInviteDates}
                  scheduleInviteDate={(invitee, value) => void scheduleInviteDate(invitee, value)}
                  sendingInviteKey={sendingInviteKey}
                  roomSlug={roomDraft.slug}
                  sendInviteNow={(invitee) => void sendInviteNow(invitee)}
                  getSummaryCount={getSummaryCount}
                  memberActionKey={memberActionKey}
                  toggleInviteeDisabled={(invitee) => void toggleInviteeDisabled(invitee)}
                  removeInvitee={(invitee) => void removeInvitee(invitee)}
                  setMemberDetailKey={setMemberDetailKey}
                />
              </div>
            </div>
          </CarouselItem>

          <CarouselItem className="h-full basis-full pl-0">
            <div className="grid h-full min-h-0 grid-cols-4 grid-rows-2 gap-4">
              <div className="col-span-2 row-span-2 min-h-0 overflow-auto">
                <FolderHierarchyCard
                  selectedId={selectedId}
                  treeContent={folderTreeContent}
                  folderDraft={folderDraft}
                  setFolderDraft={setFolderDraft}
                  saveFolder={() => void saveFolder()}
                  resetFolderDraft={() => {
                    setFolderDraft({})
                    setSelectedTaxonomyNodeID("")
                    setSelectedDocumentTypeID("")
                    setSelectedCorrespondentID("")
                    setSelectedDomainEntityID("")
                    setIncludeAllTaxonomyItems(false)
                    setIncludeAllDocumentTypeItems(false)
                    setIncludeAllCorrespondentItems(false)
                    setIncludeAllDomainEntityItems(false)
                  }}
                  folders={folders}
                  selectedTaxonomyNodeID={selectedTaxonomyNodeID}
                  setSelectedTaxonomyNodeID={setSelectedTaxonomyNodeID}
                  taxonomyNodes={taxonomyNodes}
                  addFolderFromCatalog={(label: string) => void addFolderFromCatalog(label)}
                  includeAllTaxonomyItems={includeAllTaxonomyItems}
                  setIncludeAllTaxonomyItems={setIncludeAllTaxonomyItems}
                  selectedTaxonomyNodeLabel={selectedTaxonomyNodeLabel}
                  selectedDocumentTypeID={selectedDocumentTypeID}
                  setSelectedDocumentTypeID={setSelectedDocumentTypeID}
                  documentTypes={documentTypes}
                  includeAllDocumentTypeItems={includeAllDocumentTypeItems}
                  setIncludeAllDocumentTypeItems={setIncludeAllDocumentTypeItems}
                  selectedDocumentTypeLabel={selectedDocumentTypeLabel}
                  selectedCorrespondentID={selectedCorrespondentID}
                  setSelectedCorrespondentID={setSelectedCorrespondentID}
                  correspondents={correspondents}
                  includeAllCorrespondentItems={includeAllCorrespondentItems}
                  setIncludeAllCorrespondentItems={setIncludeAllCorrespondentItems}
                  selectedCorrespondentLabel={selectedCorrespondentLabel}
                  selectedDomainEntityID={selectedDomainEntityID}
                  setSelectedDomainEntityID={setSelectedDomainEntityID}
                  domainEntities={domainEntities}
                  includeAllDomainEntityItems={includeAllDomainEntityItems}
                  setIncludeAllDomainEntityItems={setIncludeAllDomainEntityItems}
                  selectedDomainEntityLabel={selectedDomainEntityLabel}
                  customFields={customFields}
                  standardMetadataFields={STANDARD_METADATA_FIELDS.map((field) => ({
                    key: field.key,
                    label: field.label,
                  }))}
                  generatedRulesText={generatedFolderRulesText}
                  autoPublishTimes={AUTO_PUBLISH_TIMES}
                  applyGeneratedRules={() =>
                    setFolderDraft((previous) => ({ ...previous, rules: generatedFolderRulesText }))
                  }
                />
              </div>
              {effectivePublishWorkspaceView === "manual" ? (
                <>
                  <Card className="col-span-2 min-h-0">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <CardTitle>Source documents</CardTitle>
                          <CardDescription>
                            {selectedHierarchyFolder
                              ? `Context: ${selectedHierarchyFolder.label} (${selectedHierarchyFolder.linked_item_label || "manual folder"})`
                              : "Select a folder in the tree to apply context, then choose source documents."}
                          </CardDescription>
                        </div>
                        <Select
                          value={effectivePublishWorkspaceView}
                          onValueChange={(value) => setPublishWorkspaceView(value as PublishWorkspaceView)}
                          disabled={isManualSelectedFolder}
                        >
                          <SelectTrigger className="w-[190px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate">Immediate view</SelectItem>
                            <SelectItem value="scheduled">Scheduled view</SelectItem>
                            <SelectItem value="manual">Manual schedule view</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={() => void scheduleSelectedDocuments()}
                          disabled={!selectedId || selectedDocumentCount === 0 || publishingDocuments}
                          className="min-w-[152px]"
                        >
                          {publishingDocuments ? "Scheduling..." : "Schedule selected"}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Input
                          value={documentSearch}
                          onChange={(event) => setDocumentSearch(event.target.value)}
                          placeholder="Search by title or ID"
                        />
                        <Button variant="outline" onClick={() => void loadSourceDocuments()} disabled={documentsLoading}>
                          Refresh
                        </Button>
                      </div>
                      <div className="max-h-44 overflow-auto rounded-md border p-2">
                        {documentsLoading ? (
                          <p className="text-muted-foreground text-xs">Loading documents...</p>
                        ) : filteredSourceDocuments.length === 0 ? (
                          <p className="text-muted-foreground text-xs">No matching documents.</p>
                        ) : (
                          <div className="space-y-1">
                            {filteredSourceDocuments.slice(0, 150).map((doc) => (
                              <label key={doc.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-muted/60">
                                <input
                                  type="checkbox"
                                  checked={Boolean(selectedDocumentIDs[String(doc.id)])}
                                  onChange={() => toggleDocumentSelection(doc.id)}
                                />
                                <span className="font-mono text-[11px] text-muted-foreground">{doc.id}</span>
                                <span className="truncate text-xs">{doc.title || `Document ${doc.id}`}</span>
                                {releaseItemStatusByDocumentID.get(String(doc.id)) ? (
                                  <Badge variant="outline" className="ml-auto h-5 text-[10px]">
                                    {releaseItemStatusByDocumentID.get(String(doc.id))}
                                  </Badge>
                                ) : null}
                                {upstreamChangedDocumentIDs.has(String(doc.id)) ? (
                                  <Badge variant="secondary" className="h-5 text-[10px]">
                                    changes available
                                  </Badge>
                                ) : null}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1 text-[10px]"
                                  onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    setSelectedReleaseDocumentID(String(doc.id))
                                  }}
                                >
                                  history
                                </Button>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="col-span-2 min-h-0">
                    <CardHeader>
                      <CardTitle>Published and scheduled</CardTitle>
                      <CardDescription>
                        {selectedHierarchyFolder
                          ? `Showing release items for ${selectedHierarchyFolder.label}.`
                          : "Select a folder in the tree to scope release items."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-44 overflow-auto text-sm">
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <p className="text-[11px] text-muted-foreground">Published</p>
                          {selectedFolderPublishedItems.length === 0 ? (
                            <p className="text-muted-foreground text-xs">No published release items.</p>
                          ) : (
                            selectedFolderPublishedItems.slice(0, 80).map((item) => (
                              <div
                                key={`pub-${item.folder_id}-${item.document_id}`}
                                className="grid grid-cols-[84px_minmax(0,1fr)_120px] gap-2 rounded border px-2 py-1 text-xs"
                              >
                                <span className="font-mono text-muted-foreground">{item.document_id}</span>
                                <span className="truncate">
                                  {folders.find((folder) => folder.folder_id === item.folder_id)?.label || item.folder_id}
                                </span>
                                <span className="text-right text-muted-foreground">
                                  {item.published_at ? formatDateTime(item.published_at) : "published"}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] text-muted-foreground">Scheduled</p>
                          {selectedFolderScheduledItems.length === 0 ? (
                            <p className="text-muted-foreground text-xs">No scheduled release items.</p>
                          ) : (
                            selectedFolderScheduledItems.slice(0, 80).map((item) => (
                              <div
                                key={`sch-${item.folder_id}-${item.document_id}`}
                                className="grid grid-cols-[84px_minmax(0,1fr)_120px] gap-2 rounded border bg-muted/30 px-2 py-1 text-xs"
                              >
                                <span className="font-mono text-muted-foreground">{item.document_id}</span>
                                <span className="truncate">
                                  {folders.find((folder) => folder.folder_id === item.folder_id)?.label || item.folder_id}
                                </span>
                                <span className="text-right text-muted-foreground">
                                  {item.scheduled_at ? formatDateTime(item.scheduled_at) : "scheduled"}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="col-span-2 row-span-2 min-h-0">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <CardTitle>
                          {effectivePublishWorkspaceView === "immediate"
                            ? "Immediate view"
                            : "Scheduled view"}
                        </CardTitle>
                        <CardDescription>
                          {effectivePublishWorkspaceView === "immediate"
                            ? "One list of included documents with dataroom publish timestamps."
                            : `One list showing already published documents and new documents queued for ${scheduledDefaultTime}.`}
                        </CardDescription>
                      </div>
                      <Select
                        value={effectivePublishWorkspaceView}
                        onValueChange={(value) => setPublishWorkspaceView(value as PublishWorkspaceView)}
                        disabled={isManualSelectedFolder}
                      >
                        <SelectTrigger className="w-[190px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate view</SelectItem>
                          <SelectItem value="scheduled">Scheduled view</SelectItem>
                          <SelectItem value="manual">Manual schedule view</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Input
                        value={documentSearch}
                        onChange={(event) => setDocumentSearch(event.target.value)}
                        placeholder="Search by title or ID"
                      />
                      <Button variant="outline" onClick={() => void loadSourceDocuments()} disabled={documentsLoading}>
                        Refresh
                      </Button>
                    </div>
                    {effectivePublishWorkspaceView === "scheduled" && lastPublishedAtForSelectedFolder ? (
                      <p className="text-muted-foreground text-xs">
                        Last published in selected scope: {formatDateTime(lastPublishedAtForSelectedFolder)}
                      </p>
                    ) : null}
                    <div className="max-h-[460px] overflow-auto rounded-md border p-2">
                      {documentsLoading ? (
                        <p className="text-muted-foreground text-xs">Loading documents...</p>
                      ) : effectivePublishWorkspaceView === "immediate" && immediateWorkspaceRows.length === 0 ? (
                        <p className="text-muted-foreground text-xs">No included documents in scope.</p>
                      ) : effectivePublishWorkspaceView === "scheduled" && scheduledWorkspaceRows.length === 0 ? (
                        <p className="text-muted-foreground text-xs">
                          No published items or newly detected documents since the last release.
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {(effectivePublishWorkspaceView === "immediate"
                            ? immediateWorkspaceRows
                            : scheduledWorkspaceRows
                          )
                            .slice(0, 220)
                            .map((row) => (
                              <div
                                key={`workspace-${row.id}`}
                                className="grid grid-cols-[84px_minmax(0,1fr)_150px_164px] items-center gap-2 rounded border px-2 py-1 text-xs"
                              >
                                <span className="font-mono text-muted-foreground">{row.id}</span>
                                <span className="truncate">{row.title}</span>
                                <Badge
                                  variant={row.status === "published" ? "outline" : "secondary"}
                                  className="h-5 w-fit text-[10px]"
                                >
                                  {row.status}
                                </Badge>
                                <span className="text-right text-muted-foreground">
                                  {"publishedAt" in row
                                    ? row.publishedAt
                                      ? formatDateTime(row.publishedAt)
                                      : row.scheduledAt
                                        ? `Scheduled ${formatDateTime(row.scheduledAt)}`
                                        : "Not yet published"
                                    : row.referenceTime
                                      ? formatDateTime(row.referenceTime)
                                      : `Scheduled ${scheduledDefaultTime}`}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CarouselItem>

          <CarouselItem className="h-full basis-full pl-0">
            <div className="grid h-full min-h-0 grid-cols-2 gap-4">
              <Card className="min-h-0">
                <CardHeader>
                  <CardTitle>Publish selection</CardTitle>
                  <CardDescription>Choose target folder and publish selected documents.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Label className="min-w-[96px]">Target folder</Label>
                    <Select
                      value={publishTargetFolderID || "__auto__"}
                      onValueChange={(value) => setPublishTargetFolderID(value === "__auto__" ? "" : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select target folder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__auto__">Auto (selected parent / first folder)</SelectItem>
                        {folders.map((folder) => (
                          <SelectItem key={folder.folder_id} value={folder.folder_id}>
                            {folder.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Selected documents: {selectedDocumentCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <Label className="min-w-[96px]">Method</Label>
                    <Select
                      value={publishMode}
                      onValueChange={(value) => setPublishMode(value as "immediate" | "scheduled")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="scheduled">Scheduled date/time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {publishMode === "scheduled" ? (
                    <div className="flex items-center gap-2">
                      <Label className="min-w-[96px]">Scheduled at</Label>
                      <Input
                        type="datetime-local"
                        value={scheduledPublishAt}
                        onChange={(event) => setScheduledPublishAt(event.target.value)}
                      />
                    </div>
                  ) : null}
                  <Button
                    onClick={() => void publishSelectedDocuments()}
                    disabled={!selectedId || selectedDocumentCount === 0 || publishingDocuments}
                  >
                    {publishingDocuments
                      ? publishMode === "scheduled"
                        ? "Scheduling..."
                        : "Publishing..."
                      : publishMode === "scheduled"
                        ? "Schedule selected"
                        : "Publish selected"}
                  </Button>
                </CardContent>
              </Card>
              <Card className="min-h-0">
                <CardHeader>
                  <CardTitle>Publishing summary</CardTitle>
                  <CardDescription>Folder-level publishing totals.</CardDescription>
                </CardHeader>
                <CardContent className="max-h-44 overflow-auto text-sm">
                  {folders.length === 0 ? (
                    <p className="text-muted-foreground text-xs">No folders configured.</p>
                  ) : (
                    <div className="space-y-1">
                      {folders.map((folder) => (
                        <div
                          key={folder.folder_id}
                          className="grid grid-cols-[minmax(0,1fr)_50px] items-center rounded border px-2 py-1 text-xs"
                        >
                          <span className="truncate">{folder.label}</span>
                          <span className="text-right text-muted-foreground">
                            {placementCountsByFolder.get(folder.folder_id) ?? 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
          <CarouselItem className="h-full basis-full pl-0">
            <div className="grid h-full min-h-0 grid-cols-3 gap-4">
              <Card className="col-span-2 min-h-0">
                <CardHeader>
                  <CardTitle>Document list view</CardTitle>
                  <CardDescription>
                    Select a document to view release and audit history.
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-h-[70vh] space-y-1 overflow-auto">
                  {filteredSourceDocuments.slice(0, 200).map((doc) => {
                    const docID = String(doc.id)
                    const isSelected = selectedReleaseDocumentID === docID
                    const status = releaseItemStatusByDocumentID.get(docID)
                    const hasChanges = upstreamChangedDocumentIDs.has(docID)
                    return (
                      <button
                        type="button"
                        key={`history-doc-${docID}`}
                        className={cn(
                          "flex w-full items-center gap-2 rounded border px-2 py-1 text-left text-xs",
                          isSelected && "border-primary bg-muted/40",
                        )}
                        onClick={() => setSelectedReleaseDocumentID(docID)}
                      >
                        <span className="font-mono text-muted-foreground">{docID}</span>
                        <span className="truncate">{doc.title || `Document ${docID}`}</span>
                        {status ? (
                          <Badge variant="outline" className="ml-auto h-5 text-[10px]">
                            {status}
                          </Badge>
                        ) : null}
                        {hasChanges ? (
                          <Badge variant="secondary" className="h-5 text-[10px]">
                            upstream changed
                          </Badge>
                        ) : null}
                      </button>
                    )
                  })}
                </CardContent>
              </Card>
              <Card className="min-h-0">
                <CardHeader>
                  <CardTitle>Release / Audit history</CardTitle>
                  <CardDescription>
                    Immutable snapshots and publish actions for the selected document.
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-h-[70vh] space-y-2 overflow-auto text-xs">
                  {releases.length === 0 ? (
                    <p className="text-muted-foreground">No releases yet.</p>
                  ) : (
                    releases.map((release) => {
                      const relevantItems = (release.manifest ?? []).filter(
                        (item) =>
                          !selectedReleaseDocumentID ||
                          String(item.document_id) === String(selectedReleaseDocumentID),
                      )
                      if (selectedReleaseDocumentID && relevantItems.length === 0) return null
                      return (
                        <div key={release.release_id} className="space-y-1 rounded border p-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">v{release.version}</Badge>
                            <Badge variant="secondary">{release.status}</Badge>
                          </div>
                          <p className="text-muted-foreground">
                            Actor: {release.published_by_subject_id || "system"}
                          </p>
                          <p className="text-muted-foreground">
                            Created: {formatDateTime(release.created_at)}
                          </p>
                          <p className="text-muted-foreground">
                            Published: {formatDateTime(release.published_at)}
                          </p>
                          <p className="text-muted-foreground">
                            Snapshot immutable; upstream updates require explicit republish.
                          </p>
                          {relevantItems.length > 0 ? (
                            <p className="text-muted-foreground">
                              Items in scope: {relevantItems.length}
                            </p>
                          ) : null}
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        </CarouselContent>
      </Carousel>

      <DraggableDialog
        open={Boolean(templateEditorKey)}
        onOpenChange={(open) => {
          if (!open) setTemplateEditorKey(null)
        }}
      >
        <DraggableDialogContent initialWidth={760} initialHeight={640}>
          <DraggableDialogHeader>
            <DraggableDialogTitle>
              {activeTemplate ? `${activeTemplate.name} template` : "Email template"}
            </DraggableDialogTitle>
          </DraggableDialogHeader>
          <DraggableDialogBody className="space-y-4">
            {activeTemplate && activeTemplateValue ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Subject</Label>
                  <Input
                    className="h-8 text-sm"
                    placeholder="Subject override (optional)"
                    value={activeTemplateValue.subject ?? ""}
                    onChange={(event) =>
                      updateEmailTemplate(activeTemplate.key, { subject: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Body text</Label>
                  <Textarea
                    rows={8}
                    className="font-mono text-sm"
                    placeholder="Plain text body override (optional)"
                    value={activeTemplateValue.body_text ?? ""}
                    onChange={(event) =>
                      updateEmailTemplate(activeTemplate.key, { body_text: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Body HTML</Label>
                  <div className="overflow-hidden rounded-md border bg-background">
                    <ReactQuill
                      theme="snow"
                      value={activeTemplateValue.body_html ?? ""}
                      onChange={(value) =>
                        updateEmailTemplate(activeTemplate.key, { body_html: value })
                      }
                      modules={QUILL_MODULES}
                      formats={QUILL_FORMATS}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeTemplate.variables.map((variable) => (
                    <Badge key={variable} variant="secondary" className="font-mono text-xs">
                      {variable}
                    </Badge>
                  ))}
                </div>
              </>
            ) : null}
          </DraggableDialogBody>
          <DraggableDialogFooter>
            <Button variant="secondary" onClick={() => setTemplateEditorKey(null)}>
              Done
            </Button>
          </DraggableDialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>

      <DraggableDialog
        open={Boolean(memberDetailKey)}
        onOpenChange={(open) => {
          if (!open) setMemberDetailKey(null)
        }}
      >
        <DraggableDialogContent initialWidth={760} initialHeight={620}>
          <DraggableDialogHeader>
            <DraggableDialogTitle>
              {selectedInviteeDetail?.invitee.email ?? "Member"} detailed records
            </DraggableDialogTitle>
          </DraggableDialogHeader>
          <DraggableDialogBody className="space-y-4">
            {selectedInviteeDetail ? (
              <>
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invite stage / metric</TableHead>
                        <TableHead>Detail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Invite issued</TableCell>
                        <TableCell>
                          {selectedInviteeDetail.stats?.invited_at || selectedInviteeDetail.invitee.created_at
                            ? `\u2705 ${formatDateTime(
                                selectedInviteeDetail.stats?.invited_at ||
                                  selectedInviteeDetail.invitee.created_at,
                              )}`
                            : "\ud83d\udd50 Pending schedule"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Valid until</TableCell>
                        <TableCell>
                          {selectedInviteeDetail.invitee.access_end
                            ? `${new Date(selectedInviteeDetail.invitee.access_end).getTime() < Date.now() ? "\ud83d\udd34" : "\ud83d\dfe0"} ${formatDateTime(selectedInviteeDetail.invitee.access_end)}`
                            : "No expiry"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Invite #</TableCell>
                        <TableCell>{selectedInviteeDetail.stats?.links_issued ?? 0}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>First acceptance / activation</TableCell>
                        <TableCell>
                          {selectedInviteeDetail.stats?.activated_at ||
                          selectedInviteeDetail.invitee.activated_at
                            ? `\u2705 ${formatDateTime(
                                selectedInviteeDetail.stats?.activated_at ||
                                  selectedInviteeDetail.invitee.activated_at,
                              )}`
                            : "Pending"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Magic links issued</TableCell>
                        <TableCell>{selectedInviteeDetail.stats?.links_issued ?? 0}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Magic links used to login</TableCell>
                        <TableCell>{selectedInviteeDetail.stats?.access_count ?? 0}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Date of last login</TableCell>
                        <TableCell>
                          {selectedInviteeDetail.stats?.last_access_at
                            ? formatDateTime(selectedInviteeDetail.stats.last_access_at)
                            : "n/a"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Documents viewed (cumulative)</TableCell>
                        <TableCell>{selectedInviteeDetail.stats?.documents_viewed ?? 0}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Downloaded (cumulative)</TableCell>
                        <TableCell>{getSummaryCount("document_downloaded", "dataroom.document.downloaded")}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Printed (cumulative)</TableCell>
                        <TableCell>{getSummaryCount("document_printed", "dataroom.document.printed")}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">No member details available.</p>
            )}
          </DraggableDialogBody>
          <DraggableDialogFooter>
            <Button variant="secondary" onClick={() => setMemberDetailKey(null)}>
              Close
            </Button>
          </DraggableDialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>

      {loading ? (
        <div className="sr-only" aria-live="polite">
          Loading dataroom details
        </div>
      ) : null}
    </div>
  )
}
