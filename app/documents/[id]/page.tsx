import { AppShell } from "@/components/app-shell"
import { getDocument, getDocumentMetadata, getCorrespondents, getDocumentTypes, getStoragePaths, getTags, getCustomFields } from "@/lib/api"
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
import { MetadataForm } from "./metadata-form"
import { CustomFieldsForm } from "./custom-fields-form"
import { Label } from "@/components/ui/label"

import { TopBar } from "./topbar"

export default async function DocumentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  const { id } = resolvedParams

  // Fetch document and relational metadata concurrently
  const [documentResp, metadata, correspondents, documentTypes, storagePaths, tagsList, customFieldsList] = await Promise.all([
    getDocument(id),
    getDocumentMetadata(id),
    getCorrespondents(),
    getDocumentTypes(),
    getStoragePaths(),
    getTags(),
    getCustomFields()
  ])

  if (!documentResp) {
    notFound()
  }

  const document = documentResp as Document

  return (
    <AppShell topbar={
      <TopBar title={document.title}>
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
                <TabsList className="w-full justify-start h-auto rounded-none border-b bg-transparent p-0">
                  <TabsTrigger
                    value="details"
                    className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="content"
                    className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    Content
                  </TabsTrigger>
                  <TabsTrigger
                    value="custom_fields"
                    className="relative rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    Custom Fields
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
                    <h3 className="text-lg font-medium">Document Metadata</h3>
                    <p className="text-sm text-muted-foreground">Update the standard attributes for this document.</p>
                  </div>
                  <MetadataForm
                    document={document}
                    correspondents={correspondents}
                    documentTypes={documentTypes}
                    storagePaths={storagePaths}
                    tagsList={tagsList}
                  />
                </TabsContent>

                <TabsContent value="custom_fields" className="m-0 space-y-4 outline-none h-full overflow-y-auto px-6 py-6">
                  <div>
                    <h3 className="text-lg font-medium">Custom Fields</h3>
                    <p className="text-sm text-muted-foreground">User-defined fields for this document.</p>
                  </div>
                  <CustomFieldsForm
                    document={document}
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

                <TabsContent value="notes" className="m-0 space-y-6 outline-none h-full overflow-y-auto px-6 py-6">
                  <div>
                    <h3 className="text-lg font-medium">Notes</h3>
                    <p className="text-sm text-muted-foreground">User-defined notes appended to this document.</p>
                  </div>
                  <div className="flex flex-col gap-6 max-w-2xl">
                    <div className="text-sm text-muted-foreground italic rounded-md border p-4 bg-muted/20">
                      No notes available for this document.
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="newNote">Add Note</Label>
                      <Textarea id="newNote" placeholder="Write a note..." rows={4} />
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* PDF Viewer Pane */}
          <ResizablePanel defaultSize={60} minSize={30}>
            <div className="flex h-full w-full bg-muted/20">
              <iframe
                src={`/api/proxy/documents/${id}/preview/` + "#toolbar=1"}
                className="w-full h-full border-0"
                title={`Document ${document.title} PDF`}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </AppShell>
  )
}
