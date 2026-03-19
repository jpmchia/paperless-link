"use client"

import * as React from "react"
import { useSetAtom } from "jotai"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { documentSectionAtom } from "@/lib/store"
import type { Document } from "../columns"
import { DetailsForm } from "./details-form"
import { MetadataTab } from "./metadata-tab"
import { HistoryTab } from "./history-tab"
import { PermissionsTab } from "./permissions-tab"
import { NotesTab } from "./notes-tab"
import { VersionsTab } from "./versions-tab"
import { ShareLinksTab } from "./share-links-tab"
import { DuplicatesTab } from "./duplicates-tab"
import {
  type DocumentSection,
  getDocumentSectionHref,
} from "./document-sections"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
const TAB_TRIGGER =
  "relative rounded-none border-b-2 border-b-transparent border-t-none min-h-16 bg-transparent px-3 pb-2 pt-2 text-xs font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-b-accent data-[state=active]:text-foreground data-[state=active]:shadow-none whitespace-nowrap rounded-t-lg"

interface DocumentTabsProps {
  correspondents: any[]
  customFieldsList: any[]
  document: Document
  documentTypes: any[]
  duplicates: any[]
  groupsList: any[]
  history: any[]
  initialSection: DocumentSection
  metadata: any
  notes: any[]
  paperlessBaseUrl: string
  storagePaths: any[]
  tagsList: any[]
  usersList: any[]
  versions: any[]
  canChangeDocument: boolean
  canManageShareLinks: boolean
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
}: DocumentTabsProps) {
  const setDocumentSection = useSetAtom(documentSectionAtom)
  const [currentSection, setCurrentSection] = React.useState<DocumentSection>(initialSection)

  React.useEffect(() => {
    setCurrentSection(initialSection)
    setDocumentSection(initialSection)
  }, [initialSection, setDocumentSection])

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
      className="flex h-full w-full flex-col bg-background border-none overflow-y-hidden"
    >
      <ScrollArea className="w-full rounded-md border-none whitespace-nowrap pb-2">
        
        <TabsList
          className="h-auto w-max min-w-full justify-start border-b bg-transparent p-0 overflow-x-auto flex-nowrap scrollbar-thin scrollbar-track-transparent scrollbar-thumb-transparent data-[state=active]:border-b-accent"
        >
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
      
        <ScrollBar orientation="horizontal"  />
      </ScrollArea>
      <div className="flex-1 overflow-hidden">
        <TabsContent value="details" className="m-0 h-full w-full overflow-y-auto px-6 outline-none">
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
        </TabsContent>

        <TabsContent value="content" className="m-0 flex h-full w-full flex-col space-y-4 overflow-y-auto px-6 pb-6 outline-none">
          <div>
            <h3 className="text-lg font-medium">Extracted Content</h3>
            <p className="text-sm text-muted-foreground">The raw text extracted by OCR.</p>
          </div>
          <Textarea
            className="flex-1 font-mono text-sm"
            defaultValue={(document as any).content || "No OCR content available."}
          />
        </TabsContent>

        <TabsContent value="metadata" className="m-0 h-full w-full overflow-hidden outline-none">
          <MetadataTab metadata={metadata} document={document} />
        </TabsContent>

        <TabsContent value="history" className="m-0 h-full w-full overflow-hidden outline-none p-0">
          <HistoryTab
            history={history}
            documentTypes={documentTypes}
            correspondents={correspondents}
            storagePaths={storagePaths}
            tagsList={tagsList}
          />
        </TabsContent>

        {canChangeDocument && (
          <TabsContent value="permissions" className="m-0 h-full w-full overflow-hidden outline-none p-0">
            <PermissionsTab document={document} usersList={usersList} groupsList={groupsList} />
          </TabsContent>
        )}

        <TabsContent value="notes" className="m-0 h-full w-full overflow-hidden outline-none">
          <NotesTab documentId={document.id} initialNotes={notes} />
        </TabsContent>

        <TabsContent value="versions" className="m-0 h-full overflow-hidden outline-none">
          <VersionsTab
            documentId={document.id}
            initialVersions={versions}
            permissionedDocument={document}
          />
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
  )
}
