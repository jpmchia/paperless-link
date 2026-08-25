import { describe, expect, it } from "vitest"
import type {
  PermissionType,
  RoutePermissionAction,
} from "@/lib/permissions"
import {
  GLOBAL_SEARCH_RESULT_KINDS,
  buildDocumentDownloadUrl,
  buildDocumentsHrefFromFilters,
  buildFiltersForSearchResult,
  getGlobalSearchResultActions,
  type GlobalSearchActionPermissions,
  type GlobalSearchResult,
} from "@/lib/global-search-actions"

function createPermissions(
  allowed: Array<`${RoutePermissionAction}:${PermissionType}`>,
  canManageConfig = false
): GlobalSearchActionPermissions {
  const allowedSet = new Set(allowed)

  return {
    can: (action, type) => allowedSet.has(`${action}:${type}`),
    canManageConfig,
  }
}

function createNamedResult(
  kind: Exclude<GlobalSearchResult["kind"], "document">,
  id: number
): GlobalSearchResult {
  return {
    id,
    kind,
    name: `${kind}-${id}`,
  }
}

describe("global-search-actions", () => {
  it("lists every supported global search result kind exhaustively", () => {
    expect(GLOBAL_SEARCH_RESULT_KINDS).toEqual([
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
    ])
  })

  it("returns document actions with open, download, and alternate new-window support", () => {
    const actions = getGlobalSearchResultActions(
      {
        id: 17,
        kind: "document",
        title: "Quarterly report",
      },
      createPermissions(["view:document"])
    )

    expect(actions.primary?.id).toBe("open")
    expect(actions.secondary?.id).toBe("download")
    expect(actions.alternate?.id).toBe("openInNewWindow")
  })

  it("returns filter then edit actions for taxonomy objects when both are permitted", () => {
    const actions = getGlobalSearchResultActions(
      createNamedResult("correspondent", 4),
      createPermissions(["view:document", "view:correspondent", "change:correspondent"])
    )

    expect(actions.primary?.id).toBe("filterDocuments")
    expect(actions.secondary?.id).toBe("edit")
  })

  it("falls back to manage when a taxonomy object is viewable but not editable", () => {
    const actions = getGlobalSearchResultActions(
      createNamedResult("storagePath", 6),
      createPermissions(["view:document", "view:storagePath"])
    )

    expect(actions.primary?.id).toBe("filterDocuments")
    expect(actions.secondary?.id).toBe("manage")
  })

  it("promotes manage to primary when document filters are unavailable", () => {
    const actions = getGlobalSearchResultActions(
      createNamedResult("tag", 9),
      createPermissions(["view:tag"])
    )

    expect(actions.primary?.id).toBe("manage")
    expect(actions.secondary).toBeNull()
  })

  it("uses manage as the primary action for non-document management objects", () => {
    const actions = getGlobalSearchResultActions(
      createNamedResult("mailRule", 14),
      createPermissions(["view:mailRule"])
    )

    expect(actions.primary?.id).toBe("manage")
    expect(actions.secondary).toBeNull()
    expect(actions.alternate).toBeNull()
  })

  it("builds document download URLs through the proxy", () => {
    expect(buildDocumentDownloadUrl(42)).toBe("/api/proxy/documents/42/download")
  })

  it("serializes correspondent, document type, storage path, and tag filters structurally", () => {
    expect(
      buildDocumentsHrefFromFilters(buildFiltersForSearchResult(createNamedResult("correspondent", 3)))
    ).toBe("/documents?correspondent__id=3")

    expect(
      buildDocumentsHrefFromFilters(buildFiltersForSearchResult(createNamedResult("documentType", 7)))
    ).toBe("/documents?document_type__id=7")

    expect(
      buildDocumentsHrefFromFilters(buildFiltersForSearchResult(createNamedResult("storagePath", 8)))
    ).toBe("/documents?storage_path__id=8")

    expect(
      buildDocumentsHrefFromFilters(buildFiltersForSearchResult(createNamedResult("tag", 11)))
    ).toBe("/documents?tags__id__all=11")
  })
})
