"use client"

import * as React from "react"
import { startTransition, useDeferredValue } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  FileCog,
  Files,
  FolderOpen,
  GitBranch,
  LayoutDashboard,
  LayoutList,
  Mail,
  Search,
  Settings,
  SlidersHorizontal,
  SquareStack,
  Tags,
  UserRound,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { GlobalSearchResultRow } from "@/components/global-search/global-search-result"
import { useSidebarManagementDialog } from "@/components/sidebar-management-dialog"
import { useOpenDocumentNavigation } from "@/hooks/use-open-document-navigation"
import { getJson, withQuery } from "@/lib/paperless-client"
import { usePermissions } from "@/hooks/use-permissions"
import { useUserPreferences } from "@/components/user-preferences-provider"
import { GlobalSearchType } from "@/data/ui-settings"
import {
  buildDocumentDownloadUrl,
  buildDocumentsHrefFromFilters,
  buildFiltersForSearchResult,
  getGlobalSearchResultActions,
  type GlobalSearchActionId,
  type GlobalSearchResult,
  type GlobalSearchResultKind,
} from "@/lib/global-search-actions"

interface SavedViewEntry {
  id: number
  name: string
  show_in_sidebar: boolean
}

interface SearchDocumentResult {
  id: number
  title: string
}

interface SearchNamedResult {
  id: number
  name: string
}

interface GlobalSearchResponse {
  documents?: SearchDocumentResult[]
  saved_views?: SearchNamedResult[]
  correspondents?: SearchNamedResult[]
  document_types?: SearchNamedResult[]
  storage_paths?: SearchNamedResult[]
  tags?: SearchNamedResult[]
  users?: SearchNamedResult[]
  groups?: SearchNamedResult[]
  mail_accounts?: SearchNamedResult[]
  mail_rules?: SearchNamedResult[]
  custom_fields?: SearchNamedResult[]
  workflows?: SearchNamedResult[]
}

interface SearchNavItem {
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: {
    action: "view"
    type:
      | "document"
      | "tag"
      | "savedView"
      | "workflow"
      | "mailAccount"
      | "uiSettings"
      | "user"
      | "group"
  }
  title: string
}

const NAV_ITEMS: SearchNavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, title: "Dashboard" },
  {
    href: "/documents",
    icon: Files,
    permission: { action: "view", type: "document" },
    title: "Documents",
  },
  {
    href: "/tags",
    icon: Tags,
    permission: { action: "view", type: "tag" },
    title: "Tags",
  },
  {
    href: "/savedviews",
    icon: LayoutList,
    permission: { action: "view", type: "savedView" },
    title: "Saved Views",
  },
  {
    href: "/workflows",
    icon: GitBranch,
    permission: { action: "view", type: "workflow" },
    title: "Workflows",
  },
  {
    href: "/mail",
    icon: Mail,
    permission: { action: "view", type: "mailAccount" },
    title: "Mail",
  },
  {
    href: "/users",
    icon: Users,
    permission: { action: "view", type: "user" },
    title: "Users",
  },
  { href: "/profile", icon: UserRound, title: "My Profile" },
  {
    href: "/settings",
    icon: Settings,
    permission: { action: "view", type: "uiSettings" },
    title: "Settings",
  },
  { href: "/config", icon: SlidersHorizontal, title: "Configuration" },
]

function matchesQuery(value: string, query: string) {
  return value.toLowerCase().includes(query.toLowerCase())
}

function assertNever(value: never): never {
  throw new Error(`Unhandled global search kind: ${String(value)}`)
}

function getGlobalSearchIcon(kind: GlobalSearchResultKind) {
  switch (kind) {
    case "document":
      return Files
    case "savedView":
      return FolderOpen
    case "correspondent":
      return UserRound
    case "documentType":
      return FileCog
    case "storagePath":
      return FolderOpen
    case "tag":
      return Tags
    case "user":
    case "group":
      return Users
    case "mailAccount":
    case "mailRule":
      return Mail
    case "customField":
      return SquareStack
    case "workflow":
      return GitBranch
    default:
      return assertNever(kind)
  }
}

function getManagementDialogKind(kind: GlobalSearchResultKind) {
  switch (kind) {
    case "correspondent":
      return "correspondents" as const
    case "documentType":
      return "documentTypes" as const
    case "storagePath":
      return "storagePaths" as const
    case "tag":
      return "tags" as const
    case "document":
    case "savedView":
    case "user":
    case "group":
    case "mailAccount":
    case "mailRule":
    case "customField":
    case "workflow":
      return null
    default:
      return assertNever(kind)
  }
}

function getManagementHref(kind: Exclude<GlobalSearchResultKind, "document">) {
  switch (kind) {
    case "savedView":
      return "/savedviews"
    case "correspondent":
      return "/correspondents"
    case "documentType":
      return "/document-types"
    case "storagePath":
      return "/storage-paths"
    case "tag":
      return "/tags"
    case "user":
    case "group":
      return "/users"
    case "mailAccount":
    case "mailRule":
      return "/mail"
    case "customField":
      return "/custom-fields"
    case "workflow":
      return "/workflows"
    default:
      return assertNever(kind)
  }
}

export function GlobalSearch({
  savedViews,
}: {
  savedViews: SavedViewEntry[]
}) {
  const router = useRouter()
  const navigateToDocument = useOpenDocumentNavigation()
  const pathname = usePathname()
  const { can, canManageConfig } = usePermissions()
  const { openManagementDialog } = useSidebarManagementDialog()
  const preferences = useUserPreferences()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<GlobalSearchResponse>({})
  const [loadingDocuments, setLoadingDocuments] = React.useState(false)
  const [searchRefreshKey, setSearchRefreshKey] = React.useState(0)
  const [shortcutLabel, setShortcutLabel] = React.useState("Ctrl+K")
  const deferredQuery = useDeferredValue(query.trim())
  const canViewDocuments = can("view", "document")
  const canViewGroups = can("view", "group")
  const canViewSavedViews = can("view", "savedView")
  const canViewTags = can("view", "tag")
  const canViewUsers = can("view", "user")
  const canViewWorkflows = can("view", "workflow")
  const canViewMail = can("view", "mailAccount")
  const canViewUiSettings = can("view", "uiSettings")

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  React.useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac")) {
      setShortcutLabel("⌘K")
    }
  }, [])

  React.useEffect(() => {
    setOpen(false)
    setQuery("")
  }, [pathname])

  React.useEffect(() => {
    if (!deferredQuery || !canViewDocuments) {
      setSearchResults({})
      setLoadingDocuments(false)
      return
    }

    let cancelled = false
    setLoadingDocuments(true)

    getJson<GlobalSearchResponse>(
      withQuery("/api/proxy/search/", {
        db_only: preferences.searchDbOnly ? true : null,
        query: deferredQuery,
      })
    )
      .then((response) => {
        if (!cancelled) {
          setSearchResults(response ?? {})
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSearchResults({})
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDocuments(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [canViewDocuments, deferredQuery, preferences.searchDbOnly, searchRefreshKey])

  const documents = Array.isArray(searchResults?.documents) ? searchResults.documents : []
  const liveSavedViews = Array.isArray(searchResults?.saved_views)
    ? searchResults.saved_views
    : []
  const correspondents = Array.isArray(searchResults?.correspondents)
    ? searchResults.correspondents
    : []
  const documentTypes = Array.isArray(searchResults?.document_types)
    ? searchResults.document_types
    : []
  const storagePaths = Array.isArray(searchResults?.storage_paths)
    ? searchResults.storage_paths
    : []
  const tags = Array.isArray(searchResults?.tags) ? searchResults.tags : []
  const users = Array.isArray(searchResults?.users) ? searchResults.users : []
  const groups = Array.isArray(searchResults?.groups) ? searchResults.groups : []
  const mailAccounts = Array.isArray(searchResults?.mail_accounts)
    ? searchResults.mail_accounts
    : []
  const mailRules = Array.isArray(searchResults?.mail_rules)
    ? searchResults.mail_rules
    : []
  const customFields = Array.isArray(searchResults?.custom_fields)
    ? searchResults.custom_fields
    : []
  const workflows = Array.isArray(searchResults?.workflows)
    ? searchResults.workflows
    : []

  const navigationItems = NAV_ITEMS.filter((item) => {
    if (item.href === "/config") {
      return canManageConfig
    }

    if (item.href === "/users") {
      return canViewUsers || canViewGroups || canManageConfig
    }

    switch (item.permission?.type) {
      case "document":
        return canViewDocuments
      case "tag":
        return canViewTags
      case "savedView":
        return canViewSavedViews
      case "workflow":
        return canViewWorkflows
      case "mailAccount":
        return canViewMail
      case "uiSettings":
        return canViewUiSettings
      case "group":
        return canViewGroups
      case "user":
        return canViewUsers
      default:
        return true
    }
  }).filter((item) =>
    deferredQuery
      ? matchesQuery(item.title, deferredQuery) || matchesQuery(item.href, deferredQuery)
      : true
  )

  const matchingSavedViews = savedViews
    .filter(() => canViewSavedViews)
    .filter((view) =>
      deferredQuery ? matchesQuery(view.name, deferredQuery) : true
    )
    .slice(0, 8)

  const handleNavigate = React.useCallback(
    (href: string) => {
      setOpen(false)
      startTransition(() => {
        router.push(href)
      })
    },
    [router]
  )

  const handleFilteredDocumentsNavigate = React.useCallback(
    (queryString: string) => {
      handleNavigate(
        withQuery("/documents", {
          query:
            preferences.searchFullType === GlobalSearchType.ADVANCED
              ? queryString
              : null,
          title_content:
            preferences.searchFullType === GlobalSearchType.TITLE_CONTENT
              ? queryString
              : null,
        })
      )
    },
    [handleNavigate, preferences.searchFullType]
  )

  const refreshSearchResults = React.useCallback(() => {
    setSearchRefreshKey((current) => current + 1)
  }, [])

  const handleResultAction = React.useCallback(
    (actionId: GlobalSearchActionId, result: GlobalSearchResult) => {
      switch (actionId) {
        case "open":
          switch (result.kind) {
            case "document":
              setOpen(false)
              navigateToDocument({
                documentId: result.id,
                title: result.title || `Document ${result.id}`,
              })
              return
            case "savedView":
              handleNavigate(`/view/${result.id}`)
              return
            default:
              handleNavigate(getManagementHref(result.kind))
              return
          }
        case "openInNewWindow":
          if (result.kind !== "document") {
            return
          }
          window.open(`/documents/${result.id}`, "_blank", "noopener,noreferrer")
          return
        case "download":
          if (result.kind !== "document") {
            return
          }
          window.open(
            buildDocumentDownloadUrl(result.id),
            "_blank",
            "noopener,noreferrer"
          )
          return
        case "filterDocuments":
          if (
            result.kind === "correspondent" ||
            result.kind === "documentType" ||
            result.kind === "storagePath" ||
            result.kind === "tag"
          ) {
            handleNavigate(
              buildDocumentsHrefFromFilters(buildFiltersForSearchResult(result))
            )
          }
          return
        case "edit":
        case "manage":
          if (result.kind === "document") {
            return
          }

          if (result.kind === "savedView") {
            handleNavigate(getManagementHref(result.kind))
            return
          }

          const dialogKind = getManagementDialogKind(result.kind)
          if (dialogKind) {
            openManagementDialog(dialogKind, {
              initialItemId: result.id,
              onItemsChange: refreshSearchResults,
            })
            return
          }

          handleNavigate(getManagementHref(result.kind))
          return
        default:
          assertNever(actionId)
      }
    },
    [
      handleNavigate,
      navigateToDocument,
      openManagementDialog,
      refreshSearchResults,
    ]
  )

  const permissionSnapshot = React.useMemo(
    () => ({
      can,
      canManageConfig,
    }),
    [can, canManageConfig]
  )

  const renderResultRow = React.useCallback(
    (result: GlobalSearchResult) => {
      const actions = getGlobalSearchResultActions(result, permissionSnapshot)
      if (!actions.primary) {
        return null
      }

      const Icon = getGlobalSearchIcon(result.kind)
      const label =
        result.kind === "document" ? result.title : result.name

      return (
        <GlobalSearchResultRow
          key={`${result.kind}-${result.id}`}
          value={`${result.kind}-${result.id}-${label}`}
          result={result}
          icon={<Icon className="size-4" />}
          primaryAction={actions.primary}
          secondaryAction={actions.secondary}
          alternateAction={actions.alternate}
          onAction={handleResultAction}
        />
      )
    },
    [handleResultAction, permissionSnapshot]
  )

  const liveResultGroups = React.useMemo(
    () => [
      {
        heading: "Saved Views",
        results: liveSavedViews.map(
          (item): GlobalSearchResult => ({
            id: item.id,
            kind: "savedView",
            name: item.name,
          })
        ),
      },
      {
        heading: "Correspondents",
        results: correspondents.map(
          (item): GlobalSearchResult => ({
            id: item.id,
            kind: "correspondent",
            name: item.name,
          })
        ),
      },
      {
        heading: "Document Types",
        results: documentTypes.map(
          (item): GlobalSearchResult => ({
            id: item.id,
            kind: "documentType",
            name: item.name,
          })
        ),
      },
      {
        heading: "Storage Paths",
        results: storagePaths.map(
          (item): GlobalSearchResult => ({
            id: item.id,
            kind: "storagePath",
            name: item.name,
          })
        ),
      },
      {
        heading: "Tags",
        results: tags.map(
          (item): GlobalSearchResult => ({
            id: item.id,
            kind: "tag",
            name: item.name,
          })
        ),
      },
      {
        heading: "Workflows",
        results: workflows.map(
          (item): GlobalSearchResult => ({
            id: item.id,
            kind: "workflow",
            name: item.name,
          })
        ),
      },
      {
        heading: "Mail Accounts",
        results: mailAccounts.map(
          (item): GlobalSearchResult => ({
            id: item.id,
            kind: "mailAccount",
            name: item.name,
          })
        ),
      },
      {
        heading: "Mail Rules",
        results: mailRules.map(
          (item): GlobalSearchResult => ({
            id: item.id,
            kind: "mailRule",
            name: item.name,
          })
        ),
      },
      {
        heading: "Custom Fields",
        results: customFields.map(
          (item): GlobalSearchResult => ({
            id: item.id,
            kind: "customField",
            name: item.name,
          })
        ),
      },
      {
        heading: "Users",
        results: users.map(
          (item): GlobalSearchResult => ({
            id: item.id,
            kind: "user",
            name: item.name,
          })
        ),
      },
      {
        heading: "Groups",
        results: groups.map(
          (item): GlobalSearchResult => ({
            id: item.id,
            kind: "group",
            name: item.name,
          })
        ),
      },
    ],
    [
      correspondents,
      customFields,
      documentTypes,
      groups,
      liveSavedViews,
      mailAccounts,
      mailRules,
      storagePaths,
      tags,
      users,
      workflows,
    ]
  )

  const displayedLiveGroups = React.useMemo(
    () =>
      liveResultGroups
        .map((group) => ({
          ...group,
          rows: group.results
            .map((result) => renderResultRow(result))
            .filter((row): row is React.ReactElement => row !== null),
        }))
        .filter((group) => group.rows.length > 0),
    [liveResultGroups, renderResultRow]
  )

  const hasLiveSearchResults =
    documents.length > 0 || displayedLiveGroups.length > 0

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="hidden w-56 justify-between px-3 md:inline-flex"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <Search className="size-4" />
          Search documents and views
        </span>
        <kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {shortcutLabel}
        </kbd>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="md:hidden"
        aria-label="Open global search"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Global Search"
        description="Search for documents, saved views, or navigation targets."
        className="max-w-2xl"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search documents, saved views, and pages..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            {navigationItems.length > 0 && (
              <CommandGroup heading="Navigation">
                {navigationItems.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={`nav-${item.title}`}
                    onSelect={() => handleNavigate(item.href)}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                    <CommandShortcut>{item.href}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!deferredQuery && matchingSavedViews.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Saved Views">
                  {matchingSavedViews.map((view) => (
                    <CommandItem
                      key={view.id}
                      value={`view-${view.id}-${view.name}`}
                      onSelect={() => handleNavigate(`/view/${view.id}`)}
                    >
                      <FolderOpen className="size-4" />
                      <span>{view.name}</span>
                      <CommandShortcut>Saved view</CommandShortcut>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {canViewDocuments && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Documents">
                  {deferredQuery ? (
                    <>
                      {documents
                        .map((document) =>
                          renderResultRow({
                            id: document.id,
                            kind: "document",
                            title: document.title || `Document ${document.id}`,
                          })
                        )
                        .filter((row): row is React.ReactElement => row !== null)}
                      <CommandItem
                        value={`search-all-${deferredQuery}`}
                        onSelect={() => handleFilteredDocumentsNavigate(deferredQuery)}
                      >
                        <Search className="size-4" />
                        <span>Search all documents for “{deferredQuery}”</span>
                        <CommandShortcut>Enter</CommandShortcut>
                      </CommandItem>
                      {loadingDocuments && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          Searching documents...
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      Start typing to search documents.
                    </div>
                  )}
                </CommandGroup>
              </>
            )}

            {deferredQuery &&
              displayedLiveGroups.map((group) => (
                <React.Fragment key={group.heading}>
                  <CommandSeparator />
                  <CommandGroup heading={group.heading}>{group.rows}</CommandGroup>
                </React.Fragment>
              ))}

            {deferredQuery && !loadingDocuments && !hasLiveSearchResults && navigationItems.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                No results found.
              </div>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
