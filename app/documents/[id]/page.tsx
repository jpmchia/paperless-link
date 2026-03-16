import { AppShell } from "@/components/app-shell"
import { getDocument, getDocumentMetadata, getCorrespondents, getDocumentTypes, getStoragePaths, getTags, getCustomFields, getDocumentHistory, getDocumentNotes, getUsers, getGroups } from "@/lib/api"
import { notFound } from "next/navigation"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Document } from "../columns"
import { DetailsForm } from "./details-form"
import { MetadataTab } from "./metadata-tab"
import { HistoryTab } from "./history-tab"
import { PermissionsTab } from "./permissions-tab"
import { NotesTab } from "./notes-tab"
import { Label } from "@/components/ui/label"

import { TopBar } from "./topbar"
import { PdfViewer } from "./pdf-viewer"

export default async function DocumentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  const { id } = resolvedParams

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

  return (
    <AppShell topbar={
      <TopBar title={document.title} documentId={document.id} customFieldsList={customFieldsList}>
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
      <div className="flex h-full w-full flex-col">
        <ResizablePanelGroup
          // @ts-expect-error ResizablePrimitive type conflict in react-resizable-panels v4
          direction="horizontal"
          className="h-full w-full rounded-lg border bg-background"
        >
          {/* Metadata Editor Pane */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <Tabs defaultValue="details" className="flex flex-col h-full w-full bg-background">
              <div className="pt-2">
                <TabsList className="w-full justify-start h-auto border-b bg-transparent p-0">
                  <TabsTrigger
                    value="details"
                    className="relative rounded-t-md border-b-2 bg-transparent px-4 pb-2 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="content"
                    className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-2 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    Content
                  </TabsTrigger>
                  <TabsTrigger
                    value="metadata"
                    className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-2 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    Metadata
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-2 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    History
                  </TabsTrigger>
                  <TabsTrigger
                    value="permissions"
                    className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-2 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    Permissions
                  </TabsTrigger>
                  <TabsTrigger
                    value="notes"
                    className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    Notes
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

                <TabsContent value="permissions" className="m-0 h-full overflow-hidden outline-none">
                  <PermissionsTab document={document} usersList={usersList} groupsList={groupsList} />
                </TabsContent>

                <TabsContent value="notes" className="m-0 h-full overflow-hidden outline-none">
                  <NotesTab documentId={document.id} initialNotes={notes} />
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
