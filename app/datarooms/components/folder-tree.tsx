"use client"

import * as React from "react"
import type { DataroomFolder } from "@/lib/link-iq-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
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
import type { FolderTreeNode } from "../datarooms-types"

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

export function buildFolderTree(folders: DataroomFolder[]): FolderTreeNode[] {
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

export function FolderTreeItem({
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
