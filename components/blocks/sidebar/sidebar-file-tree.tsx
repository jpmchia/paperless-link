"use client"

import {
  ChevronRightIcon,
  FileIcon,
  FileTextIcon,
  FolderIcon,
  GalleryVerticalEndIcon,
} from "lucide-react"
import { useState } from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"

interface FileNode {
  name: string
  type: "file" | "folder"
  children?: FileNode[]
  isActive?: boolean
}

const fileTree: FileNode[] = [
  {
    name: "src",
    type: "folder",
    children: [
      {
        name: "components",
        type: "folder",
        children: [
          { name: "button.tsx", type: "file" },
          { name: "card.tsx", type: "file" },
          { name: "dialog.tsx", type: "file", isActive: true },
          { name: "sidebar.tsx", type: "file" },
        ],
      },
      {
        name: "lib",
        type: "folder",
        children: [
          { name: "utils.ts", type: "file" },
          { name: "cn.ts", type: "file" },
        ],
      },
      {
        name: "app",
        type: "folder",
        children: [
          { name: "layout.tsx", type: "file" },
          { name: "page.tsx", type: "file" },
          { name: "globals.css", type: "file" },
        ],
      },
    ],
  },
  {
    name: "public",
    type: "folder",
    children: [
      { name: "favicon.ico", type: "file" },
      { name: "robots.txt", type: "file" },
    ],
  },
  {
    name: "config",
    type: "folder",
    children: [
      { name: "tailwind.config.ts", type: "file" },
      { name: "tsconfig.json", type: "file" },
      { name: "next.config.mjs", type: "file" },
    ],
  },
]

function FileTreeFolder({ node }: { node: FileNode }) {
  const [open, setOpen] = useState(node.name === "src" || node.name === "components")

  return (
    <SidebarMenuItem>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="w-full">
            <ChevronRightIcon
              className={`size-4 shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
            />
            <FolderIcon className="size-4 shrink-0" />
            <span>{node.name}</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {node.children?.map(child =>
              child.type === "folder" ? (
                <FileTreeFolder key={child.name} node={child} />
              ) : (
                <SidebarMenuSubItem key={child.name}>
                  <SidebarMenuSubButton href="#" isActive={child.isActive}>
                    {child.name.endsWith(".md") || child.name.endsWith(".txt") ? (
                      <FileTextIcon className="size-4 shrink-0" />
                    ) : (
                      <FileIcon className="size-4 shrink-0" />
                    )}
                    <span>{child.name}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ),
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}

export default function SidebarFileTree() {
  return (
    <section className="mx-auto w-full max-w-6xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        <SidebarProvider className="h-[700px] !min-h-0">
          <Sidebar className="border-r">
            <SidebarHeader>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg" asChild>
                    <a href="#">
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <GalleryVerticalEndIcon className="size-4" />
                      </div>
                      <div className="flex flex-col gap-0.5 leading-none">
                        <span className="font-medium">My Project</span>
                        <span className="text-xs text-muted-foreground">workspace</span>
                      </div>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Explorer</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {fileTree.map(node => (
                      <FileTreeFolder key={node.name} node={node} />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarRail />
          </Sidebar>

          <SidebarInset className="min-w-0 flex-1">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#">src/components</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>dialog.tsx</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>
            <div className="flex flex-1 flex-col gap-4 p-4">
              <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                <div className="aspect-video rounded-xl bg-muted/50" />
                <div className="aspect-video rounded-xl bg-muted/50" />
                <div className="aspect-video rounded-xl bg-muted/50" />
              </div>
              <div className="flex-1 rounded-xl bg-muted/50" />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </section>
  )
}
