import type { FilterParams } from "@/lib/api"
import { serializeDocumentFilters } from "@/lib/api"
import type { PermissionType, RoutePermissionAction } from "@/lib/permissions"
import { withQuery } from "@/lib/paperless-client"

export const GLOBAL_SEARCH_RESULT_KINDS = [
  "document",
  "savedView",
  "correspondent",
  "documentType",
  "storagePath",
  "tag",
  "user",
  "group",
  "mailAccount",
  "mailRule",
  "customField",
  "workflow",
] as const

export type GlobalSearchResultKind = (typeof GLOBAL_SEARCH_RESULT_KINDS)[number]

export type GlobalSearchResult =
  | {
      id: number
      kind: "document"
      title: string
    }
  | {
      id: number
      kind: Exclude<GlobalSearchResultKind, "document">
      name: string
    }

export type GlobalSearchActionId =
  | "open"
  | "openInNewWindow"
  | "download"
  | "filterDocuments"
  | "edit"
  | "manage"

export interface GlobalSearchAction {
  id: GlobalSearchActionId
  label: string
}

export interface GlobalSearchResolvedActions {
  alternate: GlobalSearchAction | null
  primary: GlobalSearchAction | null
  secondary: GlobalSearchAction | null
}

export interface GlobalSearchActionPermissions {
  can: (action: RoutePermissionAction, type: PermissionType) => boolean
  canManageConfig?: boolean
}

function assertNever(value: never): never {
  throw new Error(`Unhandled global search result kind: ${String(value)}`)
}

function createAction(id: GlobalSearchActionId): GlobalSearchAction {
  switch (id) {
    case "open":
      return { id, label: "Open" }
    case "openInNewWindow":
      return { id, label: "Open in new window" }
    case "download":
      return { id, label: "Download" }
    case "filterDocuments":
      return { id, label: "Filter documents" }
    case "edit":
      return { id, label: "Edit" }
    case "manage":
      return { id, label: "Manage" }
    default:
      return assertNever(id)
  }
}

function getPermissionTypeForResult(
  kind: Exclude<GlobalSearchResultKind, "document">
): PermissionType {
  switch (kind) {
    case "savedView":
      return "savedView"
    case "correspondent":
      return "correspondent"
    case "documentType":
      return "documentType"
    case "storagePath":
      return "storagePath"
    case "tag":
      return "tag"
    case "user":
      return "user"
    case "group":
      return "group"
    case "mailAccount":
      return "mailAccount"
    case "mailRule":
      return "mailRule"
    case "customField":
      return "customField"
    case "workflow":
      return "workflow"
    default:
      return assertNever(kind)
  }
}

function canManageResult(
  result: GlobalSearchResult,
  permissions: GlobalSearchActionPermissions
) {
  if (result.kind === "document") {
    return permissions.can("view", "document")
  }

  const permissionType = getPermissionTypeForResult(result.kind)
  return (
    permissions.can("view", permissionType) ||
    permissions.can("change", permissionType)
  )
}

function canEditResult(
  result: GlobalSearchResult,
  permissions: GlobalSearchActionPermissions
) {
  if (result.kind === "document") {
    return false
  }

  return permissions.can("change", getPermissionTypeForResult(result.kind))
}

export function getGlobalSearchResultLabel(result: GlobalSearchResult) {
  return result.kind === "document" ? result.title : result.name
}

export function buildDocumentDownloadUrl(documentId: number) {
  return `/api/proxy/documents/${documentId}/download`
}

export function buildFiltersForSearchResult(
  result: GlobalSearchResult
): FilterParams {
  switch (result.kind) {
    case "correspondent":
      return { correspondent: result.id }
    case "documentType":
      return { documentType: result.id }
    case "storagePath":
      return { storagePath: result.id }
    case "tag":
      return { tags: [result.id] }
    case "document":
    case "savedView":
    case "user":
    case "group":
    case "mailAccount":
    case "mailRule":
    case "customField":
    case "workflow":
      throw new Error(`Result kind ${result.kind} cannot be converted to document filters`)
    default:
      return assertNever(result)
  }
}

export function buildDocumentsHrefFromFilters(filters: FilterParams) {
  return withQuery("/documents", serializeDocumentFilters(filters))
}

export function getGlobalSearchResultActions(
  result: GlobalSearchResult,
  permissions: GlobalSearchActionPermissions
): GlobalSearchResolvedActions {
  if (result.kind === "document") {
    const canViewDocument = permissions.can("view", "document")

    return {
      alternate: canViewDocument ? createAction("openInNewWindow") : null,
      primary: canViewDocument ? createAction("open") : null,
      secondary: canViewDocument ? createAction("download") : null,
    }
  }

  const canManage = canManageResult(result, permissions)
  const canEdit = canEditResult(result, permissions)
  const canViewDocuments = permissions.can("view", "document")

  switch (result.kind) {
    case "savedView":
      return {
        alternate: null,
        primary: canManage ? createAction("open") : null,
        secondary: canEdit || canManage ? createAction(canEdit ? "edit" : "manage") : null,
      }
    case "correspondent":
    case "documentType":
    case "storagePath":
    case "tag": {
      if (canViewDocuments) {
        return {
          alternate: null,
          primary: createAction("filterDocuments"),
          secondary: canEdit || canManage
            ? createAction(canEdit ? "edit" : "manage")
            : null,
        }
      }

      return {
        alternate: null,
        primary: canEdit || canManage
          ? createAction(canEdit ? "edit" : "manage")
          : null,
        secondary: null,
      }
    }
    case "user":
    case "group":
    case "mailAccount":
    case "mailRule":
    case "customField":
    case "workflow":
      return {
        alternate: null,
        primary: canEdit || canManage
          ? createAction(canEdit ? "edit" : "manage")
          : null,
        secondary: null,
      }
    default:
      return assertNever(result)
  }
}
