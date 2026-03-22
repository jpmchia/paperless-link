"use client"

import * as React from "react"
import { startTransition, useDeferredValue } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Files,
  FolderOpen,
  GitBranch,
  LayoutDashboard,
  LayoutList,
  Mail,
  Search,
  Settings,
  SlidersHorizontal,
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
import { useOpenDocumentNavigation } from "@/hooks/use-open-document-navigation"
import { getJson, withQuery } from "@/lib/paperless-client"
import { usePermissions } from "@/hooks/use-permissions"

interface SavedViewEntry {
  id: number
  name: string
  show_in_sidebar: boolean
}

interface SearchDocumentResult {
  id: number
  title: string
}

interface DocumentSearchResponse {
  results?: SearchDocumentResult[]
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

export function GlobalSearch({
  savedViews,
}: {
  savedViews: SavedViewEntry[]
}) {
  const router = useRouter()
  const navigateToDocument = useOpenDocumentNavigation()
  const pathname = usePathname()
  const { can, canManageConfig } = usePermissions()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [documents, setDocuments] = React.useState<SearchDocumentResult[]>([])
  const [loadingDocuments, setLoadingDocuments] = React.useState(false)
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
      setDocuments([])
      setLoadingDocuments(false)
      return
    }

    let cancelled = false
    setLoadingDocuments(true)

    getJson<DocumentSearchResponse>(
      withQuery("/api/proxy/documents/", {
        page_size: 6,
        query: deferredQuery,
      })
    )
      .then((response) => {
        if (!cancelled) {
          setDocuments(Array.isArray(response.results) ? response.results : [])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDocuments([])
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
  }, [canViewDocuments, deferredQuery])

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

            {matchingSavedViews.length > 0 && (
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
                      {documents.map((document) => (
                        <CommandItem
                          key={document.id}
                          value={`document-${document.id}-${document.title}`}
                          onSelect={() =>
                            navigateToDocument({
                              documentId: document.id,
                              title: document.title || `Document ${document.id}`,
                            })
                          }
                        >
                          <Files className="size-4" />
                          <span>{document.title || `Document ${document.id}`}</span>
                          <CommandShortcut>Open</CommandShortcut>
                        </CommandItem>
                      ))}
                      <CommandItem
                        value={`search-all-${deferredQuery}`}
                        onSelect={() =>
                          handleNavigate(
                            withQuery("/documents", { query: deferredQuery })
                          )
                        }
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
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
