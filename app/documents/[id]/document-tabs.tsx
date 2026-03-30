"use client"

import * as React from "react"
import { useSetAtom } from "jotai"
import { Expand } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  documentDetailAvailableFieldsAtom,
  documentSectionAtom,
} from "@/lib/store"
import type { Document } from "../columns"
import { DetailsForm } from "./details-form"
import { MetadataTab } from "./metadata-tab"
import { HistoryTab } from "./history-tab"
import { PermissionsTab } from "./permissions-tab"
import { NotesTab } from "./notes-tab"
import { VersionsTab } from "./versions-tab"
import { ShareLinksTab } from "./share-links-tab"
import { DuplicatesTab } from "./duplicates-tab"
import { DocumentContextTab } from "./document-context-tab"
import {
  type DocumentSection,
  getDocumentSectionHref,
} from "./document-sections"
import { buildAvailableDetailFields } from "./detail-field-layout"
import {
  Dialog as DraggableDialog,
  DialogBody as DraggableDialogBody,
  DialogContent as DraggableDialogContent,
  DialogDescription as DraggableDialogDescription,
  DialogHeader as DraggableDialogHeader,
  DialogTitle as DraggableDialogTitle,
} from "@/components/draggable-dialog"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
const TAB_TRIGGER =
  "relative rounded-none border-b-2 border-b-transparent border-t-none min-h-16 bg-transparent px-3 pb-2 pt-2 text-xs font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-b-accent data-[state=active]:text-foreground data-[state=active]:shadow-none whitespace-nowrap rounded-t-lg"

interface DocumentTabsProps {
  correspondents: React.ComponentProps<typeof DetailsForm>["correspondents"]
  customFieldsList: React.ComponentProps<typeof DetailsForm>["customFieldsList"]
  document: Document
  documentTypes: React.ComponentProps<typeof DetailsForm>["documentTypes"]
  duplicates: React.ComponentProps<typeof DuplicatesTab>["duplicates"]
  groupsList: React.ComponentProps<typeof PermissionsTab>["groupsList"]
  history: React.ComponentProps<typeof HistoryTab>["history"]
  initialSection: DocumentSection
  metadata: React.ComponentProps<typeof MetadataTab>["metadata"]
  notes: React.ComponentProps<typeof NotesTab>["initialNotes"]
  paperlessBaseUrl: string
  storagePaths: React.ComponentProps<typeof DetailsForm>["storagePaths"]
  tagsList: React.ComponentProps<typeof DetailsForm>["tagsList"]
  usersList: React.ComponentProps<typeof PermissionsTab>["usersList"]
  versions: React.ComponentProps<typeof VersionsTab>["initialVersions"]
  canChangeDocument: boolean
  canManageShareLinks: boolean
  hasArchiveVersion?: boolean
}

export function DocumentTabs({
  correspondents,
  customFieldsList,
  document,
  documentTypes,
  duplicates,
  groupsList,
  history,
  initialSection,
  metadata,
  notes,
  paperlessBaseUrl,
  storagePaths,
  tagsList,
  usersList,
  versions,
  canChangeDocument,
  canManageShareLinks,
  hasArchiveVersion = true,
}: DocumentTabsProps) {
  const setDocumentSection = useSetAtom(documentSectionAtom)
  const setDetailAvailableFields = useSetAtom(documentDetailAvailableFieldsAtom)
  const [currentSection, setCurrentSection] =
    React.useState<DocumentSection>(initialSection)
  const [notesPanelOpen, setNotesPanelOpen] = React.useState(false)

  React.useEffect(() => {
    setCurrentSection(initialSection)
    setDocumentSection(initialSection)
  }, [initialSection, setDocumentSection])

  React.useEffect(() => {
    setDetailAvailableFields(buildAvailableDetailFields(customFieldsList))

    return () => {
      setDetailAvailableFields([])
    }
  }, [customFieldsList, setDetailAvailableFields])

  const updateSection = React.useCallback(
    (nextSection: string) => {
      const section = nextSection as DocumentSection
      setCurrentSection(section)
      setDocumentSection(section)

      window.history.replaceState(
        window.history.state,
        "",
        getDocumentSectionHref(document.id, section)
      )
    },
    [document.id, setDocumentSection]
  )

  return (
    <Tabs
      value={currentSection}
      onValueChange={updateSection}
      className="flex h-full w-full flex-col overflow-y-hidden border-none bg-background"
    >
      <ScrollArea className="w-full rounded-md border-none pb-2 whitespace-nowrap">
        <TabsList className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-transparent h-auto w-max min-w-full min-h-[32px] flex-nowrap justify-start overflow-x-auto border-b bg-transparent p-0 data-[state=active]:border-b-accent data-[state=active]:text-brand-foreground">
          <TabsTrigger value="details" className={TAB_TRIGGER}>
            Details
          </TabsTrigger>
          <TabsTrigger value="context" className={TAB_TRIGGER}>
            Context
          </TabsTrigger>
          <TabsTrigger value="content" className={TAB_TRIGGER}>
            Content
          </TabsTrigger>
          <TabsTrigger value="metadata" className={TAB_TRIGGER}>
            Metadata
          </TabsTrigger>
          <TabsTrigger value="history" className={TAB_TRIGGER}>
            History
          </TabsTrigger>
          {canChangeDocument && (
            <TabsTrigger value="permissions" className={TAB_TRIGGER}>
              Permissions
            </TabsTrigger>
          )}
          <TabsTrigger value="versions" className={TAB_TRIGGER}>
            Versions
            {versions.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1.5 h-4 px-1 text-[10px]"
              >
                {versions.length}
              </Badge>
            )}
          </TabsTrigger>
          {canManageShareLinks && (
            <TabsTrigger value="share" className={TAB_TRIGGER}>
              Share
            </TabsTrigger>
          )}
          <TabsTrigger value="duplicates" className={TAB_TRIGGER}>
            Duplicates
            {duplicates.length > 0 && (
              <Badge
                variant="destructive"
                className="ml-1.5 h-4 px-1 text-[10px]"
              >
                {duplicates.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <div className="flex-1 overflow-hidden">
        <TabsContent
          value="details"
          className="m-0 h-full w-full overflow-y-auto px-6 outline-none"
        >
          <div>
            <h3 className="mb-6 text-lg font-medium">Document Details</h3>
          </div>
          <DetailsForm
            document={document}
            correspondents={correspondents}
            documentTypes={documentTypes}
            storagePaths={storagePaths}
            tagsList={tagsList}
            customFieldsList={customFieldsList}
          />
          <section className="mt-10 border-t pt-8">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium">Notes</h3>
                <p className="text-sm text-muted-foreground">
                  Document notes are now part of the details view.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setNotesPanelOpen(true)}
              >
                <Expand className="mr-2 h-3.5 w-3.5" />
                Open in Panel
              </Button>
            </div>
            <div className="rounded-lg border bg-card">
              <NotesTab
                documentId={document.id}
                initialNotes={notes}
                fullHeight={false}
                className="p-5"
              />
            </div>
          </section>
        </TabsContent>

        <TabsContent
          value="context"
          className="m-0 h-full w-full overflow-hidden outline-none"
        >
          <DocumentContextTab
            canChangeDocument={canChangeDocument}
            documentId={document.id}
            documentTypes={documentTypes}
          />
        </TabsContent>

        <TabsContent
          value="content"
          className="m-0 flex h-full w-full flex-col space-y-4 overflow-y-auto px-6 pb-6 outline-none"
        >
          <div>
            <h3 className="text-lg font-medium">Extracted Content</h3>
            <p className="text-sm text-muted-foreground">
              The raw text extracted by OCR.
            </p>
          </div>
          <Textarea
            className="flex-1 font-mono text-sm"
            defaultValue={
              "content" in document && typeof document.content === "string"
                ? document.content
                : "No OCR content available."
            }
          />
        </TabsContent>

        <TabsContent
          value="metadata"
          className="m-0 h-full w-full overflow-hidden outline-none"
        >
          <MetadataTab metadata={metadata} document={document} />
        </TabsContent>

        <TabsContent
          value="history"
          className="m-0 h-full w-full overflow-hidden p-0 outline-none"
        >
          <HistoryTab
            history={history}
            documentTypes={documentTypes}
            correspondents={correspondents}
            storagePaths={storagePaths}
            tagsList={tagsList}
          />
        </TabsContent>

        {canChangeDocument && (
          <TabsContent
            value="permissions"
            className="m-0 h-full w-full overflow-hidden p-0 outline-none"
          >
            <PermissionsTab
              document={document}
              usersList={usersList}
              groupsList={groupsList}
            />
          </TabsContent>
        )}

        <TabsContent
          value="versions"
          className="m-0 h-full overflow-hidden outline-none"
        >
          <VersionsTab
            documentId={document.id}
            initialVersions={versions}
            permissionedDocument={document}
          />
        </TabsContent>

        {canManageShareLinks && (
          <TabsContent
            value="share"
            className="m-0 h-full overflow-hidden outline-none"
          >
            <ShareLinksTab
              documentId={document.id}
              paperlessBaseUrl={paperlessBaseUrl}
              hasArchiveVersion={hasArchiveVersion}
            />
          </TabsContent>
        )}

        <TabsContent
          value="duplicates"
          className="m-0 h-full overflow-hidden outline-none"
        >
          <DuplicatesTab duplicates={duplicates} />
        </TabsContent>
      </div>
      <DraggableDialog open={notesPanelOpen} onOpenChange={setNotesPanelOpen}>
        <DraggableDialogContent
          initialWidth={760}
          initialHeight={680}
          maxWidth={960}
          maxHeight={900}
        >
          <DraggableDialogHeader>
            <DraggableDialogTitle>Notes</DraggableDialogTitle>
            <DraggableDialogDescription>
              Floating notes panel for this document.
            </DraggableDialogDescription>
          </DraggableDialogHeader>
          <DraggableDialogBody className="pb-6">
            <div className="h-full rounded-lg border bg-card">
              <NotesTab
                documentId={document.id}
                initialNotes={notes}
                className="h-full p-5"
              />
            </div>
          </DraggableDialogBody>
        </DraggableDialogContent>
      </DraggableDialog>
    </Tabs>
  )
}
