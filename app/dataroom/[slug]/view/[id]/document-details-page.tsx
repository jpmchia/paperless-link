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
  getUiSettings,
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
import { SETTINGS_KEYS } from "@/data/ui-settings"
import { Document } from "@/app/documents/columns"
import { invokeLinkIQAction } from "@/lib/link-iq"
import { DataroomSidebar } from "@/app/dataroom/components/dataroom-sidebar"
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

function resolvePaperlessAssetUrl(value: string | null) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("/")) return `/api/proxy${trimmed}`

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return `/api/proxy${parsed.pathname}${parsed.search}${parsed.hash}`
    }
    return parsed.toString()
  } catch {
    const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"
    const parsed = new URL(trimmed, baseUrl)
    return `/api/proxy${parsed.pathname}${parsed.search}${parsed.hash}`
  }
}

export async function DocumentDetailsPageContent({
  id,
  slug,
  requestedSection,
}: {
  id: string
  slug?: string
  requestedSection?: string
}) {
  const permissions = await requireRoutePermission("/documents")
  const paperlessBaseUrl = getPaperlessBaseUrl()
  type TabProps = React.ComponentProps<typeof DocumentTabs>
  type CorrespondentItem = TabProps["correspondents"][number]
  type DocumentTypeItem = TabProps["documentTypes"][number]
  type StoragePathItem = TabProps["storagePaths"][number]
  type TagItem = TabProps["tagsList"][number]
  type CustomFieldDefinition = TabProps["customFieldsList"][number]
  type HistoryEntry = TabProps["history"][number]
  type DocumentMetadata = TabProps["metadata"]
  type DocumentNote = TabProps["notes"][number]
  type AccessPrincipal = TabProps["usersList"][number]
  type PublicDataroomConfig = { title?: string }

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
    uiSettings,
    usersList,
    groupsList,
    publicConfig,
  ] = await Promise.all([
    getDocument<Document>(id),
    getDocumentMetadata<DocumentMetadata>(id),
    getDocumentHistory<HistoryEntry>(id),
    getDocumentNotes<DocumentNote>(id),
    getCorrespondents<CorrespondentItem>(),
    getDocumentTypes<DocumentTypeItem>(),
    getStoragePaths<StoragePathItem>(),
    getTags<TagItem>(),
    getCustomFields<CustomFieldDefinition>(),
    getUiSettings(),
    getUsers<AccessPrincipal>(),
    getGroups<AccessPrincipal>(),
    slug
      ? invokeLinkIQAction<{ dataroom?: PublicDataroomConfig }>({
          capability: "dataroom.public.get",
          input: { slug },
        }).catch(() => null)
      : Promise.resolve(null),
  ])

  if (!documentResp) {
    notFound()
  }

  const doc = documentResp as Document & {
    versions?: unknown[]
    duplicate_documents?: unknown[]
    archived_file_name?: string | null
    mime_type?: string | null
  }
  const document = documentResp
  const uiSettingsRecord = uiSettings as { settings?: Record<string, unknown> }
  const metadataRecord = metadata as
    | {
        has_archive_version?: boolean
        pages?: number
        original_mime_type?: string | null
      }
    | null
  const versions = (Array.isArray(doc.versions) ? doc.versions : []) as React.ComponentProps<
    typeof DocumentTabs
  >["versions"]
  const duplicates = (Array.isArray(doc.duplicate_documents) ? doc.duplicate_documents : []) as React.ComponentProps<
    typeof DocumentTabs
  >["duplicates"]
  const emailEnabled = Boolean(uiSettingsRecord.settings?.[SETTINGS_KEYS.EMAIL_ENABLED])
  const appLogoUrl = resolvePaperlessAssetUrl(
    typeof uiSettingsRecord.settings?.app_logo === "string"
      ? uiSettingsRecord.settings.app_logo
      : null
  )
  const dataroomTitle = publicConfig?.dataroom?.title?.trim() || "Dataroom"
  const hasArchiveVersion = Boolean(
    metadataRecord?.has_archive_version ?? doc.archived_file_name
  )
  const canEditPdf =
    doc.mime_type === "application/pdf" ||
    metadataRecord?.original_mime_type === "application/pdf"
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
    redirect(getDocumentSectionHref(id, initialSection, { slug }))
  }

  return (
    <AppShell
      initialPermissions={permissions}
      sidebar={
        slug ? (
          <DataroomSidebar
            slug={slug}
            appLogoUrl={appLogoUrl}
            dataroomTitle={dataroomTitle}
          />
        ) : undefined
      }
      mode={slug ? "dataroom" : "default"}
      topbar={
        <TopBar
          title={document.title}
          permissionedDocument={document}
          documentId={document.id}
          initialSection={initialSection}
          slug={slug}
          emailEnabled={emailEnabled}
          hasArchiveVersion={hasArchiveVersion}
          canEditPdf={canEditPdf}
          totalPages={metadataRecord?.pages ?? 1}
          versions={versions}
          correspondents={correspondents}
          documentTypes={documentTypes}
          storagePaths={storagePaths}
          tags={tagsList}
          customFields={customFieldsList}
        >
          <div className="flex items-center gap-6 text-sm m-0 p-0">
            <Badge>ASN: {document.archive_serial_number || "None"}</Badge>
            <span className="text-xs text-muted-foreground">
              Added: {document.added ? document.added.split("T")[0] : "Unknown"}
            </span>
          </div>
        </TopBar>
      }
    >
      <OpenDocumentTracker
        documentId={document.id}
        href={getDocumentSectionHref(document.id, "details", { slug })}
        title={document.title}
      />
      <RealtimeDocumentDetailSync documentId={document.id} title={document.title} />
      <div className="flex h-full w-full flex-col">
        <ResizablePanelGroup
          // @ts-expect-error ResizablePrimitive type conflict in react-resizable-panels v4
          direction="horizontal"
          id={`document-${document.id}-panel-group`}
          className="h-full w-full rounded-xlg border bg-background"
        >
          <ResizablePanel
            id={`document-${document.id}-details-panel`}
            defaultSize={30}
            minSize={30}
          >
            <DocumentTabs
              correspondents={correspondents}
              customFieldsList={customFieldsList}
              document={document}
              documentTypes={documentTypes}
              duplicates={duplicates}
              groupsList={groupsList}
              history={history}
              initialSection={initialSection}
              slug={slug}
              metadata={metadata}
              notes={notes}
              paperlessBaseUrl={paperlessBaseUrl}
              storagePaths={storagePaths}
              tagsList={tagsList}
              usersList={usersList}
              versions={versions}
              canChangeDocument={canChangeDocument}
              canManageShareLinks={canManageShareLinks}
              hasArchiveVersion={hasArchiveVersion}
            />
          </ResizablePanel>

          <ResizableHandle id={`document-${document.id}-panel-handle`} withHandle />

          <ResizablePanel
            id={`document-${document.id}-preview-panel`}
            defaultSize={60}
            minSize={30}
          >
            <PdfViewer documentId={id} totalPages={metadataRecord?.pages ?? 1} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </AppShell>
  )
}
