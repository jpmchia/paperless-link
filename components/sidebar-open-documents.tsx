"use client"

import * as React from "react"
import { useAtom } from "jotai"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  closeAllOpenDocumentsAtom,
  closeOpenDocumentAtom,
  openDocumentsAtom,
} from "@/lib/stores/open-documents"
import { normalizeOpenDocuments } from "@/lib/open-documents"

export function SidebarOpenDocuments() {
  const pathname = usePathname()
  const router = useRouter()
  const [openDocuments, setOpenDocuments] = useAtom(openDocumentsAtom)
  const [, closeDocument] = useAtom(closeOpenDocumentAtom)
  const [, closeAll] = useAtom(closeAllOpenDocumentsAtom)
  const [hasMounted, setHasMounted] = React.useState(false)
  const normalizedOpenDocuments = React.useMemo(
    () => normalizeOpenDocuments(openDocuments),
    [openDocuments]
  )

  React.useEffect(() => {
    setHasMounted(true)
  }, [])

  React.useEffect(() => {
    if (normalizedOpenDocuments.length !== openDocuments.length) {
      setOpenDocuments(normalizedOpenDocuments)
    }
  }, [normalizedOpenDocuments, openDocuments.length, setOpenDocuments])

  if (!hasMounted || normalizedOpenDocuments.length === 0) {
    return null
  }

  const closeDocumentEntry = (documentId: number, href: string) => {
    closeDocument(documentId)

    if (pathname === href) {
      router.push("/documents")
    }
  }

  const closeAllDocuments = () => {
    closeAll()

    if (pathname.startsWith("/documents/")) {
      router.push("/documents")
    }
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Open Documents</SidebarGroupLabel>
      <SidebarGroupAction
        title="Close all open documents"
        onClick={closeAllDocuments}
      >
        <X />
        <span className="sr-only">Close all open documents</span>
      </SidebarGroupAction>
      <SidebarGroupContent>
        <SidebarMenu>
          {normalizedOpenDocuments.map((document) => (
            <SidebarMenuItem key={`${document.id}-${document.href}`}>
              <div className="group/open-doc flex items-center">
                <SidebarMenuButton
                  asChild
                  isActive={pathname === document.href}
                  className="min-w-0 flex-1"
                >
                  <Link href={document.href}>
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate">{document.title}</span>
                  </Link>
                </SidebarMenuButton>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="mr-1 opacity-0 transition-opacity group-hover/open-doc:opacity-100"
                  onClick={() => closeDocumentEntry(document.id, document.href)}
                  aria-label={`Close ${document.title}`}
                >
                  <X className="size-3" />
                </Button>
              </div>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
