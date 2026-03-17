import { AppShell } from "@/components/app-shell"
import { OpenDocumentTracker } from "@/components/open-document-tracker"
import { getDocument, getDocumentMetadata, getCorrespondents, getDocumentTypes, getStoragePaths, getTags, getCustomFields, getDocumentHistory, getDocumentNotes, getUsers, getGroups } from "@/lib/api"
import { canAccessObject, currentUserCan } from "@/lib/permissions"
import { requireRoutePermission } from "@/lib/server-permissions"
import { notFound } from "next/navigation"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Document } from "../columns"
import { DetailsForm } from "./details-form"
import { MetadataTab } from "./metadata-tab"
import { HistoryTab } from "./history-tab"
import { PermissionsTab } from "./permissions-tab"
import { NotesTab } from "./notes-tab"
import { VersionsTab } from "./versions-tab"
import { ShareLinksTab } from "./share-links-tab"
import { DuplicatesTab } from "./duplicates-tab"
import { TopBar } from "./topbar"
import { PdfViewer } from "./pdf-viewer"

const TAB_TRIGGER =
  "relative rounded-none border-b-2 border-b-transparent bg-transparent px-3 pb-2 pt-2 text-sm font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none whitespace-nowrap"

// Derive the Paperless public base URL from the server-side env var
function getPaperlessBaseUrl(): string {
  const raw = process.env.PAPERLESS_API_URL || "http://localhost:8000/"
  // Strip trailing /api/ or /api or trailing slash
  return raw.replace(/\/api\/?$/, "").replace(/\/$/, "")
}

export default async function DocumentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const permissions = await requireRoutePermission("/documents")
  const resolvedParams = await params
  const { id } = resolvedParams

  const paperlessBaseUrl = getPaperlessBaseUrl()

  // Fetch document and relational metadata concurrently
  const [documentResp, metadata, history, notes, correspondents, documentTypes, storagePaths, tagsList, customFieldsList, usersList, groupsList] = await Promise.all([
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
    getGroups()
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

  return (
    <AppShell initialPermissions={permissions} topbar={
      <TopBar
        title={document.title}
        permissionedDocument={document}
        documentId={document.id}
        customFieldsList={customFieldsList}
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            ASN: {document.archive_serial_number || 'None'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Added: {document.added ? document.added.split('T')[0] : 'Unknown'}
          </span>
        </div>
      </TopBar>
    }>
      <OpenDocumentTracker
        documentId={document.id}
        href={`/documents/${document.id}`}
        title={document.title}
      />
      <div className="flex h-full w-full flex-col">
        <ResizablePanelGroup
          // @ts-expect-error ResizablePrimitive type conflict in react-resizable-panels v4
          direction="horizontal"
          className="h-full w-full rounded-lg border bg-background"
        >
          {/* Metadata Editor Pane */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <Tabs defaultValue="details" className="flex flex-col h-full w-full bg-background">
              <div className="pt-2 overflow-x-auto">
                <TabsList className="w-max min-w-full justify-start h-auto border-b bg-transparent p-0 flex-nowrap">
                  <TabsTrigger value="details" className={TAB_TRIGGER}>Details</TabsTrigger>
                  <TabsTrigger value="content" className={TAB_TRIGGER}>Content</TabsTrigger>
                  <TabsTrigger value="metadata" className={TAB_TRIGGER}>Metadata</TabsTrigger>
                  <TabsTrigger value="history" className={TAB_TRIGGER}>History</TabsTrigger>
                  {canChangeDocument && (
                    <TabsTrigger value="permissions" className={TAB_TRIGGER}>Permissions</TabsTrigger>
                  )}
                  <TabsTrigger value="notes" className={TAB_TRIGGER}>Notes</TabsTrigger>
                  <TabsTrigger value="versions" className={TAB_TRIGGER}>
                    Versions
                    {versions.length > 0 && (
                      <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{versions.length}</Badge>
                    )}
                  </TabsTrigger>
                  {canManageShareLinks && (
                    <TabsTrigger value="share" className={TAB_TRIGGER}>Share</TabsTrigger>
                  )}
                  <TabsTrigger value="duplicates" className={TAB_TRIGGER}>
                    Duplicates
                    {duplicates.length > 0 && (
                      <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[10px]">{duplicates.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-hidden">
                <TabsContent value="details" className="m-0 outline-none h-full overflow-y-auto px-6 py-6">
                  <div>
                    <h3 className="text-lg font-medium mb-6">Document Details</h3>
                  </div>
                  <DetailsForm
                    document={document}
                    correspondents={correspondents}
                    documentTypes={documentTypes}
                    storagePaths={storagePaths}
                    tagsList={tagsList}
                    customFieldsList={customFieldsList}
                  />
                </TabsContent>

                <TabsContent value="content" className="m-0 space-y-4 outline-none flex flex-col h-full overflow-y-auto px-6 py-6">
                  <div>
                    <h3 className="text-lg font-medium">Extracted Content</h3>
                    <p className="text-sm text-muted-foreground">The raw text extracted by OCR.</p>
                  </div>
                  <Textarea
                    className="flex-1 font-mono text-sm"
                    defaultValue={(documentResp as any).content || "No OCR content available."}
                  />
                </TabsContent>

                <TabsContent value="metadata" className="m-0 h-full overflow-hidden outline-none">
                  <MetadataTab metadata={metadata} document={document} />
                </TabsContent>

                <TabsContent value="history" className="m-0 h-full overflow-hidden outline-none">
                  <HistoryTab
                    history={history}
                    documentTypes={documentTypes}
                    correspondents={correspondents}
                    storagePaths={storagePaths}
                    tagsList={tagsList}
                  />
                </TabsContent>

                {canChangeDocument && (
                  <TabsContent value="permissions" className="m-0 h-full overflow-hidden outline-none">
                    <PermissionsTab document={document} usersList={usersList} groupsList={groupsList} />
                  </TabsContent>
                )}

                <TabsContent value="notes" className="m-0 h-full overflow-hidden outline-none">
                  <NotesTab documentId={document.id} initialNotes={notes} />
                </TabsContent>

                <TabsContent value="versions" className="m-0 h-full overflow-hidden outline-none">
                  <VersionsTab documentId={document.id} initialVersions={versions} permissionedDocument={document} />
                </TabsContent>

                {canManageShareLinks && (
                  <TabsContent value="share" className="m-0 h-full overflow-hidden outline-none">
                    <ShareLinksTab documentId={document.id} paperlessBaseUrl={paperlessBaseUrl} />
                  </TabsContent>
                )}

                <TabsContent value="duplicates" className="m-0 h-full overflow-hidden outline-none">
                  <DuplicatesTab duplicates={duplicates} />
                </TabsContent>
              </div>
            </Tabs>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* PDF Viewer Pane */}
          <ResizablePanel defaultSize={60} minSize={30}>
            <PdfViewer
              documentId={id}
              totalPages={(metadata as any)?.pages ?? 1}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </AppShell>
  )
}
