import { AppShell } from "@/components/app-shell"
import { RealtimeDocumentDetailSync } from "@/components/realtime-document-detail-sync"
import { OpenDocumentTracker } from "@/components/open-document-tracker"
import {
  getDocument,
  getDocumentMetadata,
  getCorrespondents,
  getDocumentTypes,
  getStoragePaths,
  getTags,
  getCustomFields,
  getDocumentHistory,
  getDocumentNotes,
  getUsers,
  getGroups,
} from "@/lib/api"
import { canAccessObject, currentUserCan } from "@/lib/permissions"
import { requireRoutePermission } from "@/lib/server-permissions"
import { notFound, redirect } from "next/navigation"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { Badge } from "@/components/ui/badge"
import { Document } from "../columns"
import { TopBar } from "./topbar"
import { PdfViewer } from "./pdf-viewer"
import { DocumentTabs } from "./document-tabs"
import {
  type DocumentSection,
  getDocumentSectionHref,
  getDocumentSections,
  resolveDocumentSection,
} from "./document-sections"

function getPaperlessBaseUrl(): string {
  const raw = process.env.PAPERLESS_API_URL || "http://localhost:8000/"
  return raw.replace(/\/api\/?$/, "").replace(/\/$/, "")
}

export async function DocumentDetailsPageContent({
  id,
  requestedSection,
}: {
  id: string
  requestedSection?: string
}) {
  const permissions = await requireRoutePermission("/documents")
  const paperlessBaseUrl = getPaperlessBaseUrl()

  const [
    documentResp,
    metadata,
    history,
    notes,
    correspondents,
    documentTypes,
    storagePaths,
    tagsList,
    customFieldsList,
    usersList,
    groupsList,
  ] = await Promise.all([
    getDocument(id),
    getDocumentMetadata(id),
    getDocumentHistory(id),
    getDocumentNotes(id),
    getCorrespondents(),
    getDocumentTypes(),
    getStoragePaths(),
    getTags(),
    getCustomFields(),
    getUsers(),
    getGroups(),
  ])

  if (!documentResp) {
    notFound()
  }

  const document = documentResp as Document
  const doc = documentResp as any
  const versions = Array.isArray(doc.versions) ? doc.versions : []
  const duplicates = Array.isArray(doc.duplicate_documents) ? doc.duplicate_documents : []
  const canChangeDocument = canAccessObject(permissions, "change", document, "document")
  const canManageShareLinks =
    currentUserCan(permissions, "create", "shareLink") ||
    currentUserCan(permissions, "delete", "shareLink") ||
    canChangeDocument
  const availableSections = getDocumentSections({
    canChangeDocument,
    canManageShareLinks,
  })
  const initialSection = resolveDocumentSection(
    requestedSection,
    availableSections
  ) as DocumentSection

  if (requestedSection && requestedSection !== initialSection) {
    redirect(getDocumentSectionHref(id, initialSection))
  }

  return (
    <AppShell
      initialPermissions={permissions}
      topbar={
        <TopBar
          title={document.title}
          permissionedDocument={document}
          documentId={document.id}
          initialSection={initialSection}
        >
          <div className="flex items-center gap-2">
            <Badge variant="outline">ASN: {document.archive_serial_number || "None"}</Badge>
            <span className="text-xs text-muted-foreground">
              Added: {document.added ? document.added.split("T")[0] : "Unknown"}
            </span>
          </div>
        </TopBar>
      }
    >
      <OpenDocumentTracker
        documentId={document.id}
        href={`/documents/${document.id}`}
        title={document.title}
      />
      <RealtimeDocumentDetailSync documentId={document.id} title={document.title} />
      <div className="flex h-full w-full flex-col">
        <ResizablePanelGroup
          // @ts-expect-error ResizablePrimitive type conflict in react-resizable-panels v4
          direction="horizontal"
          className="h-full w-full rounded-lg border bg-background"
        >
          <ResizablePanel defaultSize={40} minSize={30}>
            <DocumentTabs
              correspondents={correspondents}
              customFieldsList={customFieldsList}
              document={document}
              documentTypes={documentTypes}
              duplicates={duplicates}
              groupsList={groupsList}
              history={history}
              initialSection={initialSection}
              metadata={metadata}
              notes={notes}
              paperlessBaseUrl={paperlessBaseUrl}
              storagePaths={storagePaths}
              tagsList={tagsList}
              usersList={usersList}
              versions={versions}
              canChangeDocument={canChangeDocument}
              canManageShareLinks={canManageShareLinks}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={60} minSize={30}>
            <PdfViewer documentId={id} totalPages={(metadata as any)?.pages ?? 1} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </AppShell>
  )
}
