"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { ChevronDown, ChevronRight, FolderIcon } from "lucide-react"
import { postJson } from "@/lib/paperless-client"
import type { DataroomFolder } from "@/lib/link-iq-types"
import { ModeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type SessionResult = {
  dataroom?: { title?: string; login_logo_url?: string; login_logo_dark_url?: string }
  invitee?: { email?: string }
}

type FoldersResult = {
  folders?: DataroomFolder[]
}

type Props = {
  slug: string
  appLogoUrl?: string | null
  dataroomTitle?: string
}

type TreeNode = {
  folder: DataroomFolder
  children: TreeNode[]
}

function buildTree(folders: DataroomFolder[]) {
  const byParent = new Map<string, DataroomFolder[]>()
  folders.forEach((folder) => {
    const key = folder.parent_folder_id || "__root__"
    const next = byParent.get(key) ?? []
    next.push(folder)
    byParent.set(key, next)
  })
  const build = (parentID: string): TreeNode[] =>
    (byParent.get(parentID) ?? [])
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((folder) => ({
        folder,
        children: build(folder.folder_id),
      }))
  return build("__root__")
}

function FolderTree({ nodes, depth = 0 }: { nodes: TreeNode[]; depth?: number }) {
  return (
    <>
      {nodes.map((node) => (
        <React.Fragment key={node.folder.folder_id}>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button type="button" className="justify-start">
                <span style={{ marginLeft: depth * 12 }} className="inline-flex items-center gap-2">
                  <FolderIcon className="size-3.5" />
                  <span className="truncate">{node.folder.label || "Untitled folder"}</span>
                </span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {node.children.length > 0 ? <FolderTree nodes={node.children} depth={depth + 1} /> : null}
        </React.Fragment>
      ))}
    </>
  )
}

export function DataroomSidebar({ slug, appLogoUrl, dataroomTitle }: Props) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [hasMounted, setHasMounted] = React.useState(false)
  const [session, setSession] = React.useState<SessionResult>({})
  const [tree, setTree] = React.useState<TreeNode[]>([])
  const [dataroomSectionOpen, setDataroomSectionOpen] = React.useState(true)
  const effectiveLogoURL =
    appLogoUrl ||
    (resolvedTheme === "dark"
      ? session.dataroom?.login_logo_dark_url || session.dataroom?.login_logo_url
      : session.dataroom?.login_logo_url)
  const effectiveDataroomTitle = session.dataroom?.title?.trim() || dataroomTitle || "Dataroom"

  React.useEffect(() => {
    setHasMounted(true)
  }, [])

  React.useEffect(() => {
    const run = async () => {
      const token = window.sessionStorage.getItem("dataroom_session")
      if (!token) {
        router.replace(`/dataroom/${slug}`)
        return
      }
      try {
        const sessionResult = await postJson<SessionResult>("/api/link-iq/dataroom-public/validate-session", {
          token,
          slug,
        })
        setSession(sessionResult)
        const foldersResult = await postJson<FoldersResult>("/api/link-iq/dataroom-public/folders", {
          token,
          slug,
        })
        setTree(buildTree(foldersResult.folders ?? []))
      } catch {
        window.sessionStorage.removeItem("dataroom_session")
        router.replace(`/dataroom/${slug}`)
      }
    }
    void run()
  }, [router, slug])

  const logout = async () => {
    const token = window.sessionStorage.getItem("dataroom_session")
    if (token) {
      await postJson("/api/link-iq/dataroom-public/revoke-session", { token }).catch(() => {})
      window.sessionStorage.removeItem("dataroom_session")
    }
    router.replace(`/dataroom/${slug}`)
  }

  if (!hasMounted) {
    return (
      <Sidebar variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="min-h-[5rem]" asChild>
                <Link href={`/dataroom/${slug}/view`} className="flex flex-col items-start gap-0">
                  <div className="grid max-w-full text-left leading-tight">
                    <span className="truncate text-sm font-semibold">{dataroomTitle || "Dataroom"}</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent />
        <SidebarFooter>
          <div className="flex items-center justify-end">
            <ModeToggle />
          </div>
        </SidebarFooter>
      </Sidebar>
    )
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="min-h-[5rem]" asChild>
              <Link href={`/dataroom/${slug}/view`} className="flex flex-col items-start gap-0">
                {effectiveLogoURL ? (
                  <div className="flex w-full justify-start" aria-hidden="true">
                    <img
                      src={effectiveLogoURL}
                      alt=""
                      className="max-h-[4rem] object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <FolderIcon className="size-4" />
                  </div>
                )}
                <div className="grid max-w-full text-left leading-tight">
                  <span className="truncate text-sm font-semibold">{effectiveDataroomTitle}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <Collapsible open={dataroomSectionOpen} onOpenChange={setDataroomSectionOpen}>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex cursor-pointer items-center justify-between transition-colors hover:text-foreground">
                <span className="pl-2">Dataroom</span>
                {dataroomSectionOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent className="pl-2">
                <SidebarMenu>
                  {tree.length > 0 ? (
                    <FolderTree nodes={tree} />
                  ) : (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <button type="button" className="justify-start">
                          <FolderIcon className="size-3.5" />
                          <span>Root</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{effectiveDataroomTitle}</p>
            <p className="truncate text-xs text-muted-foreground">{session.invitee?.email || "invitee"}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={logout}>
            Logout
          </Button>
          <ModeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
