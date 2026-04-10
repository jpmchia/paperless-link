"use client"

import * as React from "react"
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
import {
  DataroomsCarouselFoldersWorkspaceSlide,
  DataroomsCarouselOverviewSlide,
  DataroomsCarouselPublishSlide,
  DataroomsCarouselReleaseHistorySlide,
  DataroomsCarouselShell,
} from "./carousel"
import type { Document as DocumentsTableRow, LookupMaps as DocumentsLookupMaps } from "@/app/documents/columns"
import {
  ACCESS_PRESETS,
  AUTO_PUBLISH_TIMES,
  EMAIL_TEMPLATE_DEFINITIONS,
  STANDARD_METADATA_FIELDS,
} from "./datarooms-constants"
import { getDefaultEmailTemplateBundle } from "./email-template-defaults/verbatim-templates"
import { asNumber, asString, normalizePaginatedArray, normalizeUsersResponse } from "./datarooms-normalize"
import type {
  AnalyticsResponse,
  CorrespondentOption,
  CustomFieldOption,
  DataroomListResponse,
  DocumentTypeOption,
  EntityTypeOption,
  FoldersResponse,
  InviteesResponse,
  OwnersResponse,
  PaginatedWithCount,
  PaperlessDocument,
  PaperlessUser,
  PlacementsResponse,
  PublishWorkspaceView,
  ReleaseItemsResponse,
  ReleasesResponse,
  StoragePathOption,
  TagOption,
  TaxonomyNodeOption,
} from "./datarooms-types"
import { buildFolderTree, FolderTreeItem } from "./components/folder-tree"

/**
 * Bisect carousel issues (e.g. “Maximum update depth”): set to an object with the slides you
 * want mounted (`true` / `false`). Use one `true` at a time to find the bad slide.
 * Keep as `null` for normal behavior (all four slides).
 *
 * Example — only the overview slide:
 * `{ overview: true, folders: false, publish: false, history: false }`
 */
const DEBUG_DATAROOM_CAROUSEL_SLIDES: {
  overview: boolean
  folders: boolean
  publish: boolean
  history: boolean
} | null = null

export function DataroomsView() {
  const carouselSlides = DEBUG_DATAROOM_CAROUSEL_SLIDES ?? {
    overview: true,
    folders: true,
    publish: false,
    history: false,
  }

  const [hasMounted, setHasMounted] = React.useState(false)
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
  const [tags, setTags] = React.useState<TagOption[]>([])
  const [storagePaths, setStoragePaths] = React.useState<StoragePathOption[]>([])
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

  const formatDateTime = React.useCallback((value?: string | null) => {
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
    const [taxonomyResult, documentTypeResult, correspondentsResult, tagsResult, storagePathsResult, entityResult, customFieldsResult] =
      await Promise.allSettled([
        getJson<{ nodes?: TaxonomyNodeOption[] }>("/api/link-iq/taxonomy/nodes"),
        getJson<{ results?: DocumentTypeOption[] } | DocumentTypeOption[]>(
          "/api/management/lookups?kind=document-types",
        ),
        getJson<{ results?: CorrespondentOption[] } | CorrespondentOption[]>(
          "/api/management/lookups?kind=correspondents",
        ),
        getJson<{ results?: TagOption[] } | TagOption[]>(
          "/api/management/lookups?kind=tags",
        ),
        getJson<{ results?: StoragePathOption[] } | StoragePathOption[]>(
          "/api/proxy/storage_paths/?page_size=100000",
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
    if (tagsResult.status === "fulfilled") {
      setTags(normalizePaginatedArray<TagOption>(tagsResult.value))
    }
    if (storagePathsResult.status === "fulfilled") {
      setStoragePaths(normalizePaginatedArray<StoragePathOption>(storagePathsResult.value))
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
      tagsResult,
      storagePathsResult,
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
      const pageSize = 500
      const maxPages = 60
      const allDocuments: PaperlessDocument[] = []
      let page = 1
      let totalCount = Number.POSITIVE_INFINITY

      while (page <= maxPages && allDocuments.length < totalCount) {
        const payload = await getJson<PaginatedWithCount<PaperlessDocument>>(
          `/api/proxy/documents/?page_size=${pageSize}&page=${page}`,
        )
        const pageResults = normalizePaginatedArray<PaperlessDocument>(payload)
        if (pageResults.length === 0) {
          break
        }

        allDocuments.push(...pageResults)
        totalCount =
          typeof payload.count === "number" && Number.isFinite(payload.count)
            ? payload.count
            : allDocuments.length

        if (!payload.next || allDocuments.length >= totalCount) {
          break
        }
        page += 1
      }

      setSourceDocuments(allDocuments)
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
    setHasMounted(true)
  }, [])

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

  const documentsTableData = React.useMemo<DocumentsTableRow[]>(
    () =>
      filteredSourceDocuments.map((doc) => ({
        id: doc.id,
        title: doc.title || `Document ${doc.id}`,
        created: doc.created || "",
        added: doc.added || "",
        modified: doc.modified || "",
        archive_serial_number: doc.archive_serial_number ?? null,
        correspondent: doc.correspondent ?? null,
        document_type: doc.document_type ?? null,
        storage_path: doc.storage_path ?? null,
        tags: doc.tags ?? [],
        custom_fields: doc.custom_fields ?? [],
        owner: doc.owner ?? null,
        notes: doc.notes ?? [],
        num_notes: doc.num_notes ?? null,
        page_count: doc.page_count ?? null,
        is_shared_by_requester: doc.is_shared_by_requester ?? false,
      })),
    [filteredSourceDocuments],
  )

  const documentsLookup = React.useMemo<DocumentsLookupMaps>(
    () => ({
      correspondents: Object.fromEntries(
        correspondents.map((item) => [item.id, { id: item.id, name: item.name || `Correspondent ${item.id}` }]),
      ),
      documentTypes: Object.fromEntries(
        documentTypes.map((item) => [item.id, { id: item.id, name: item.name || `Type ${item.id}` }]),
      ),
      tags: Object.fromEntries(
        tags.map((item) => [item.id, { id: item.id, name: item.name || `Tag ${item.id}`, color: String(item.color ?? "") }]),
      ),
      storagePaths: Object.fromEntries(
        storagePaths.map((item) => [item.id, { id: item.id, name: item.name || `Storage ${item.id}` }]),
      ),
      users: Object.fromEntries(
        users.map((item) => [
          item.id,
          {
            id: item.id,
            username: item.username,
            first_name: item.first_name,
            last_name: item.last_name,
          },
        ]),
      ),
      customFields: Object.fromEntries(
        customFields.map((field) => [
          field.id,
          {
            id: field.id,
            name: field.name || `Custom field ${field.id}`,
            data_type: field.data_type || "text",
            extra_data: field.extra_data,
          },
        ]),
      ),
    }),
    [correspondents, customFields, documentTypes, storagePaths, tags, users],
  )

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

  if (!hasMounted) {
    return <div className="relative flex h-full min-h-0 flex-1 overflow-hidden px-4 py-4" />
  }

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
      <DataroomsCarouselShell>
        {carouselSlides.overview ? (
        <DataroomsCarouselOverviewSlide
          configuration={{
            selectedId,
            rooms,
            roomDraft,
            setSelectedId,
            setRoomDraft,
            startCreateNewDataroom,
            onSave: () => void (selectedId ? saveDataroom() : createDataroom()),
            formatDateInputValue,
            toISODateString,
            autoPublishTimes: AUTO_PUBLISH_TIMES,
            handleBrandingLogoUpload,
            handleBrandingLogoDarkUpload,
            brandingLogoFileName,
            brandingLogoDarkFileName,
            setBrandingLogoFileName,
            setBrandingLogoDarkFileName,
            ownerSearch,
            setOwnerSearch,
            ownerToAdd,
            setOwnerToAdd,
            filteredUsers,
            formatUserLabel,
            addOwner: () => void addOwner(),
            ownerRows,
            formatDateTime,
            removeOwner: (subjectID) => void removeOwner(subjectID),
            emailTemplateDefinitions: EMAIL_TEMPLATE_DEFINITIONS,
            onOpenTemplateEditor: setTemplateEditorKey,
          }}
          members={{
            pendingInviteCount,
            inviteeDraft,
            setInviteeDraft,
            accessPresets: ACCESS_PRESETS,
            saveInvitee: () => void saveInvitee(),
            selectedId,
            invitees,
            inviteeStatsByKey,
            formatDateTime,
            scheduledInviteDates,
            scheduleInviteDate: (invitee, value) => void scheduleInviteDate(invitee, value),
            sendingInviteKey,
            roomSlug: roomDraft.slug,
            sendInviteNow: (invitee) => void sendInviteNow(invitee),
            getSummaryCount,
            memberActionKey,
            toggleInviteeDisabled: (invitee) => void toggleInviteeDisabled(invitee),
            removeInvitee: (invitee) => void removeInvitee(invitee),
            setMemberDetailKey,
          }}
        />
        ) : null}
        {carouselSlides.folders ? (
        <DataroomsCarouselFoldersWorkspaceSlide
          folderHierarchy={{
            selectedId,
            treeContent: folderTreeContent,
            folderDraft,
            setFolderDraft,
            saveFolder: () => void saveFolder(),
            resetFolderDraft: () => {
              setFolderDraft({})
              setSelectedTaxonomyNodeID("")
              setSelectedDocumentTypeID("")
              setSelectedCorrespondentID("")
              setSelectedDomainEntityID("")
              setIncludeAllTaxonomyItems(false)
              setIncludeAllDocumentTypeItems(false)
              setIncludeAllCorrespondentItems(false)
              setIncludeAllDomainEntityItems(false)
            },
            folders,
            selectedTaxonomyNodeID,
            setSelectedTaxonomyNodeID,
            taxonomyNodes,
            addFolderFromCatalog: (label: string) => void addFolderFromCatalog(label),
            includeAllTaxonomyItems,
            setIncludeAllTaxonomyItems,
            selectedTaxonomyNodeLabel,
            selectedDocumentTypeID,
            setSelectedDocumentTypeID,
            documentTypes,
            includeAllDocumentTypeItems,
            setIncludeAllDocumentTypeItems,
            selectedDocumentTypeLabel,
            selectedCorrespondentID,
            setSelectedCorrespondentID,
            correspondents,
            includeAllCorrespondentItems,
            setIncludeAllCorrespondentItems,
            selectedCorrespondentLabel,
            selectedDomainEntityID,
            setSelectedDomainEntityID,
            domainEntities,
            includeAllDomainEntityItems,
            setIncludeAllDomainEntityItems,
            selectedDomainEntityLabel,
            customFields,
            standardMetadataFields: STANDARD_METADATA_FIELDS.map((field) => ({
              key: field.key,
              label: field.label,
            })),
            generatedRulesText: generatedFolderRulesText,
            autoPublishTimes: AUTO_PUBLISH_TIMES,
            applyGeneratedRules: () =>
              setFolderDraft((previous) => ({ ...previous, rules: generatedFolderRulesText })),
          }}
          workspace={{
            effectivePublishWorkspaceView,
            isManualSelectedFolder,
            setPublishWorkspaceView,
            selectedHierarchyFolder,
            documentsLoading,
            documentSearch,
            setDocumentSearch,
            loadSourceDocuments,
            documentsTableData,
            documentsLookup,
            setSelectedDocumentIDs,
            setSelectedReleaseDocumentID,
            selectedFolderPublishedItems,
            selectedFolderScheduledItems,
            folders,
            formatDateTime,
            scheduleSelectedDocuments,
            selectedId,
            selectedDocumentCount,
            publishingDocuments,
            immediateWorkspaceRows,
            scheduledWorkspaceRows,
            lastPublishedAtForSelectedFolder,
            scheduledDefaultTime,
          }}
        />
        ) : null}
        {carouselSlides.publish ? (
        // <DataroomsCarouselPublishSlide
        //   folders={folders}
        //   publishTargetFolderID={publishTargetFolderID}
        //   setPublishTargetFolderID={setPublishTargetFolderID}
        //   selectedDocumentCount={selectedDocumentCount}
        //   publishMode={publishMode}
        //   setPublishMode={setPublishMode}
        //   scheduledPublishAt={scheduledPublishAt}
        //   setScheduledPublishAt={setScheduledPublishAt}
        //   publishSelectedDocuments={() => void publishSelectedDocuments()}
        //   publishingDocuments={publishingDocuments}
        //   selectedId={selectedId}
        //   placementCountsByFolder={placementCountsByFolder}
        // />
        <div>Publish</div>
        ) : null}
        {carouselSlides.history ? (
        // <DataroomsCarouselReleaseHistorySlide
        //   filteredSourceDocuments={filteredSourceDocuments}
        //   selectedReleaseDocumentID={selectedReleaseDocumentID}
        //   setSelectedReleaseDocumentID={setSelectedReleaseDocumentID}
        //   releaseItemStatusByDocumentID={releaseItemStatusByDocumentID}
        //   upstreamChangedDocumentIDs={upstreamChangedDocumentIDs}
        //   releases={releases}
        //   formatDateTime={formatDateTime}
        // />
        <div>Release history</div>
        ) : null}
      </DataroomsCarouselShell>

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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-xs text-muted-foreground">Body HTML</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        updateEmailTemplate(activeTemplate.key, getDefaultEmailTemplateBundle(activeTemplate.key))
                      }
                    >
                      Load default template
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Full HTML is stored as-is. Use the placeholders shown below; the header image uses{" "}
                    <span className="font-mono">{"{{BrandingLogoURL}}"}</span> (configure branding on this dataroom).
                  </p>
                  <Textarea
                    spellCheck={false}
                    className="min-h-[320px] resize-y font-mono text-xs leading-relaxed"
                    value={activeTemplateValue.body_html ?? ""}
                    onChange={(event) =>
                      updateEmailTemplate(activeTemplate.key, { body_html: event.target.value })
                    }
                  />
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
