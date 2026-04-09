"use client"

import * as React from "react"
import type {
    CommandsCapability,
    PrintCapability,
    SelectionCapability,
} from "@embedpdf/react-pdf-viewer"
import {
    type PDFDocumentLoadingTask,
    type PDFDocumentProxy,
    GlobalWorkerOptions,
    getDocument,
} from "pdfjs-dist/legacy/build/pdf.mjs"
import { useConfirmationDialog } from "@/components/confirmation-dialog-provider"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { HasObjectPermission } from "@/components/permissions/has-object-permission"
import { OpenDocumentLink } from "@/components/open-document-link"
import {
    activeVersionIdAtom,
    documentDetailAvailableFieldsAtom,
    documentDetailFieldLayoutAtom,
    documentDetailFieldLayoutRevisionAtom,
    documentDetailsChangedFieldsAtom,
    documentDetailsDirtyAtom,
    documentDetailsResetRevisionAtom,
    documentListState,
    documentSectionAtom,
    pdfViewerPasswordAtom,
    pdfViewerPageCountAtom,
    pdfViewerRegistryAtom,
    pdfViewerRequiresPasswordAtom,
} from "@/lib/store"
import { Button } from "@/components/ui/button"
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Columns2,
    Copy,
    Download,
    Expand,
    KeyRound,
    Mail,
    MoreVertical,
    Printer,
    RefreshCw,
    RotateCcw,
    RotateCw,
    Save,
    Scissors,
    Sparkles,
    Trash2,
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { PermissionedObject } from "@/lib/permissions"
import { deleteDocument, removeDocumentPassword, reprocessDocument } from "./actions"
import { getDocumentSectionHref, type DocumentSection } from "./document-sections"
import { DocumentCustomFieldsDropdown } from "./document-custom-fields-dropdown"
import { DocumentSuggestionsDropdown } from "./document-suggestions-dropdown"
import { DocumentVersionDropdown } from "./document-version-dropdown"
import { DetailsFieldsPicker } from "./details-fields-picker"
import { EmailDocumentDialog } from "./email-document-dialog"
import { PdfToolsDialog } from "./pdf-tools-dialog"
import { RemovePasswordDialog } from "./remove-password-dialog"
import { openDocumentsAtom } from "@/lib/stores/open-documents"

if (typeof window !== "undefined" && !GlobalWorkerOptions.workerSrc) {
    GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
    ).toString()
}

export function TopBar({
    children,
    title = "Document",
    permissionedDocument,
    documentId,
    slug,
    initialSection = "details",
    emailEnabled = false,
    hasArchiveVersion = false,
    canEditPdf = false,
    totalPages = 1,
    versions = [],
    correspondents = [],
    documentTypes = [],
    storagePaths = [],
    tags = [],
    customFields = [],
}: {
    children: React.ReactNode
    title?: React.ReactNode
    permissionedDocument?: PermissionedObject | null
    documentId?: number
    slug?: string
    initialSection?: DocumentSection
    emailEnabled?: boolean
    hasArchiveVersion?: boolean
    canEditPdf?: boolean
    totalPages?: number
    versions?: Array<{
        id: number
        added: string
        version_label?: string | null
        checksum?: string
        is_root: boolean
        original_filename?: string
    }>
    correspondents?: Array<{ id: number; name: string }>
    documentTypes?: Array<{ id: number; name: string }>
    storagePaths?: Array<{ id: number; name: string }>
    tags?: Array<{ id: number; name: string; color?: string; text_color?: string | null }>
    customFields?: Array<{ id: number; name: string; data_type: string }>
}) {
    const documentList = useAtomValue(documentListState)
    const openDocuments = useAtomValue(openDocumentsAtom)
    const isDocumentDirty = useAtomValue(documentDetailsDirtyAtom)
    const changedFieldLabels = useAtomValue(documentDetailsChangedFieldsAtom)
    const currentSection = useAtomValue(documentSectionAtom) ?? initialSection
    const activeVersionId = useAtomValue(activeVersionIdAtom)
    const pdfPassword = useAtomValue(pdfViewerPasswordAtom)
    const pdfViewerPageCount = useAtomValue(pdfViewerPageCountAtom)
    const pdfViewerRegistry = useAtomValue(pdfViewerRegistryAtom)
    const pdfRequiresPassword = useAtomValue(pdfViewerRequiresPasswordAtom)
    const [detailFieldLayout, setDetailFieldLayout] = useAtom(documentDetailFieldLayoutAtom)
    const setDetailFieldLayoutRevision = useSetAtom(documentDetailFieldLayoutRevisionAtom)
    const setDocumentDetailsResetRevision = useSetAtom(documentDetailsResetRevisionAtom)
    const availableDetailFields = useAtomValue(documentDetailAvailableFieldsAtom)
    const [emailDialogOpen, setEmailDialogOpen] = React.useState(false)
    const [pdfToolsOpen, setPdfToolsOpen] = React.useState(false)
    const [removePasswordOpen, setRemovePasswordOpen] = React.useState(false)
    const [removingPassword, setRemovingPassword] = React.useState(false)
    const [downloading, setDownloading] = React.useState(false)
    const [useFormattedFilename, setUseFormattedFilename] = React.useState(false)
    const router = useRouter()
    const { confirm } = useConfirmationDialog()
    const listHref = slug ? `/dataroom/${slug}/view` : "/documents"

    const buildUnsavedChangesDescription = React.useCallback(() => {
        if (changedFieldLabels.length === 0) {
            return "You have unsaved changes. Are you sure you want to continue?"
        }

        const visibleFields = changedFieldLabels.slice(0, 8)
        const remainingCount = changedFieldLabels.length - visibleFields.length

        return (
            <div className="space-y-2 text-left">
                <p>You have unsaved changes. The following edits will be lost:</p>
                <ul className="list-disc space-y-1 pl-5">
                    {visibleFields.map((field) => (
                        <li key={field}>{field}</li>
                    ))}
                    {remainingCount > 0 ? (
                        <li>{`and ${remainingCount} more change${remainingCount === 1 ? "" : "s"}`}</li>
                    ) : null}
                </ul>
            </div>
        )
    }, [changedFieldLabels])

    const submitDetailsForm = React.useCallback((action: "save" | "close") => {
        const form = window.document.getElementById("document-details-form") as HTMLFormElement | null
        if (!form) return

        setSaveAction(action)
        form.requestSubmit()
    }, [])

    const navigationDocumentList = React.useMemo(() => {
        const openDocumentIds = openDocuments.map((document) => document.id)
        const primaryList =
            documentList.length > 0 && documentId != null && documentList.includes(documentId)
                ? documentList
                : openDocumentIds

        return Array.from(new Set(primaryList))
    }, [documentId, documentList, openDocuments])

    // Find Next/Prev document IDs
    const currentIndex = documentId != null ? navigationDocumentList.indexOf(documentId) : -1
    const prevId = currentIndex > 0 ? navigationDocumentList[currentIndex - 1] : null
    const nextId =
        currentIndex >= 0 && currentIndex < navigationDocumentList.length - 1
            ? navigationDocumentList[currentIndex + 1]
            : null

    const setSaveAction = (action: string) => {
        // Will be picked up by the details form
        if (typeof window !== "undefined") {
            try {
                window.sessionStorage.setItem("documentSaveAction", action)
            } catch {
                // Ignore storage errors in restricted contexts.
            }
        }
    }

    const buildDownloadUrl = React.useCallback((original = false) => {
        if (!documentId) return null

        const params = new URLSearchParams()
        if (original) {
            params.set("original", "true")
        }
        if (activeVersionId != null) {
            params.set("version", String(activeVersionId))
        }
        if (useFormattedFilename) {
            params.set("follow_formatting", "true")
        }

        const query = params.toString()
        return `/api/proxy/documents/${documentId}/download${query ? `?${query}` : ""}`
    }, [activeVersionId, documentId, useFormattedFilename])

    const extractFilename = React.useCallback((response: Response, fallback: string) => {
        const disposition = response.headers.get("content-disposition") ?? ""
        const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
        if (utf8Match?.[1]) {
            return decodeURIComponent(utf8Match[1])
        }

        const basicMatch = disposition.match(/filename="?([^"]+)"?/i)
        if (basicMatch?.[1]) {
            return basicMatch[1]
        }

        return fallback
    }, [])

    const handleDownload = React.useCallback(async (original = false) => {
        const url = buildDownloadUrl(original)
        if (!url) return

        setDownloading(true)
        try {
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error(await response.text())
            }

            const blob = await response.blob()
            const filename = extractFilename(response, typeof title === "string" ? title : `document-${documentId}`)
            const objectUrl = URL.createObjectURL(blob)
            const anchor = window.document.createElement("a")
            anchor.href = objectUrl
            anchor.download = filename
            anchor.click()
            URL.revokeObjectURL(objectUrl)
        } catch {
            toast.error("Failed to download document")
        } finally {
            setDownloading(false)
        }
    }, [buildDownloadUrl, documentId, extractFilename, title])

    const handlePrint = React.useCallback(async () => {
        const url = buildDownloadUrl(false)
        if (!url) return

        if (pdfViewerRegistry) {
            try {
                const printPlugin = pdfViewerRegistry.getPlugin("print")
                const printCapability = printPlugin?.provides?.() as PrintCapability | undefined
                if (printCapability) {
                    await printCapability.print().toPromise()
                    return
                }
            } catch (error) {
                toast.error("Viewer print failed", {
                    description: error instanceof Error ? error.message : "Unknown error",
                })
            }
        }

        let printWindow: Window | null = null
        let loadTask: PDFDocumentLoadingTask | null = null
        let pdfDocument: PDFDocumentProxy | null = null

        try {
            printWindow = window.open("about:blank", "_blank")
            if (!printWindow) {
                throw new Error("Please allow pop-ups to print this document.")
            }

            const bootstrapDocument = printWindow.document
            bootstrapDocument.open()
            bootstrapDocument.write(`
                <!doctype html>
                <html>
                  <head>
                    <title>Preparing print…</title>
                    <style>
                      html, body {
                        margin: 0;
                        min-height: 100%;
                        background: #fff;
                        color: #111;
                        font-family: sans-serif;
                      }
                      body {
                        display: grid;
                        place-items: center;
                      }
                    </style>
                  </head>
                  <body>Preparing document for print…</body>
                </html>
            `)
            bootstrapDocument.close()

            const response = await fetch(url)
            if (!response.ok) {
                throw new Error(await response.text())
            }

            const contentType = response.headers.get("content-type") ?? ""
            if (!contentType.toLowerCase().includes("application/pdf")) {
                const body = (await response.text()).slice(0, 200)
                throw new Error(body || `Unexpected content type: ${contentType || "unknown"}`)
            }

            const pdfBytes = await response.arrayBuffer()
            if (pdfBytes.byteLength < 1) {
                throw new Error("Printable PDF was empty")
            }

            if (pdfRequiresPassword && !pdfPassword) {
                throw new Error("Please unlock the PDF before printing.")
            }

            loadTask = getDocument({
                data: pdfBytes.slice(0),
                password: pdfPassword || undefined,
            })

            let cleanedUp = false
            const cleanup = () => {
                if (cleanedUp) return
                cleanedUp = true
                if (pdfDocument) {
                    void pdfDocument.destroy()
                }
                if (loadTask) {
                    void loadTask.destroy()
                }
                try {
                    printWindow?.close()
                } catch {
                    // Ignore close failures.
                }
            }

            pdfDocument = await loadTask.promise
            const printDocument = printWindow.document

            if (!printDocument) {
                cleanup()
                throw new Error("Unable to open print window")
            }

            printDocument.open()
            printDocument.write(`
                <!doctype html>
                <html>
                  <head>
                    <title>Print ${typeof title === "string" ? title : "Document"}</title>
                    <style>
                      @page { margin: 12mm; }
                      html, body { margin: 0; padding: 0; background: #fff; }
                      body { font-family: sans-serif; }
                      .print-page {
                        break-after: page;
                        page-break-after: always;
                        display: flex;
                        justify-content: center;
                        align-items: flex-start;
                        margin: 0;
                        padding: 0;
                      }
                      .print-page:last-child {
                        break-after: auto;
                        page-break-after: auto;
                      }
                      canvas {
                        display: block;
                        max-width: 100%;
                        height: auto;
                        background: #fff;
                      }
                    </style>
                  </head>
                  <body></body>
                </html>
            `)
            printDocument.close()

            for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
                const page = await pdfDocument.getPage(pageNumber)
                const viewport = page.getViewport({ scale: 2 })
                const canvas = printDocument.createElement("canvas")
                canvas.width = Math.ceil(viewport.width)
                canvas.height = Math.ceil(viewport.height)
                const context = canvas.getContext("2d")

                if (!context) {
                    cleanup()
                    throw new Error("Canvas rendering context unavailable for printing")
                }

                await page.render({
                    canvasContext: context,
                    canvas,
                    viewport,
                }).promise

                const pageWrapper = printDocument.createElement("div")
                pageWrapper.className = "print-page"
                pageWrapper.appendChild(canvas)
                printDocument.body.appendChild(pageWrapper)
            }

            const activePrintWindow = printWindow
            activePrintWindow.onafterprint = cleanup
            window.setTimeout(() => {
                try {
                    activePrintWindow.focus()
                    activePrintWindow.print()
                } catch (printError) {
                    const isAfterPrintAccessError =
                        printError instanceof DOMException &&
                        printError.message.includes("onafterprint")

                    if (!isAfterPrintAccessError) {
                        toast.error("Print failed", {
                            description:
                                printError instanceof Error ? printError.message : "Unknown error",
                        })
                    }

                    window.setTimeout(cleanup, 100)
                }
            }, 100)
        } catch (error) {
            if (pdfDocument) {
                void pdfDocument.destroy()
            }
            if (loadTask) {
                void loadTask.destroy()
            }
            try {
                printWindow?.close()
            } catch {
                // Ignore close failures.
            }
            toast.error("Failed to load printable PDF", {
                description: error instanceof Error ? error.message : "Unknown error",
            })
        }
    }, [buildDownloadUrl, pdfPassword, pdfRequiresPassword, pdfViewerRegistry, title])

    const executeViewerCommand = React.useCallback((commandId: string, successMessage?: string) => {
        if (!pdfViewerRegistry) return false

        try {
            const commandsPlugin = pdfViewerRegistry.getPlugin("commands")
            const commandsCapability = commandsPlugin?.provides?.() as CommandsCapability | undefined
            if (!commandsCapability) {
                return false
            }

            commandsCapability.execute(commandId, undefined, "ui")
            if (successMessage) {
                toast.success(successMessage)
            }
            return true
        } catch (error) {
            toast.error("Viewer action failed", {
                description: error instanceof Error ? error.message : "Unknown error",
            })
            return false
        }
    }, [pdfViewerRegistry])

    const handleCopySelectedText = React.useCallback(() => {
        if (!pdfViewerRegistry) return

        try {
            const selectionPlugin = pdfViewerRegistry.getPlugin("selection")
            const selectionCapability = selectionPlugin?.provides?.() as SelectionCapability | undefined
            if (!selectionCapability) {
                toast.error("Copy is not available for this document.")
                return
            }

            selectionCapability.copyToClipboard()
            toast.success("Selected text copied")
        } catch (error) {
            toast.error("Failed to copy selected text", {
                description: error instanceof Error ? error.message : "Unknown error",
            })
        }
    }, [pdfViewerRegistry])

    const handleDelete = async () => {
        if (!documentId) return
        const confirmed = await confirm({
            actionLabel: "Delete",
            cancelLabel: "Cancel",
            description: "Are you sure you want to delete this document?",
            tone: "destructive",
            title: "Delete document?",
        })
        if (!confirmed) return

        try {
            await deleteDocument(documentId)
            toast.success("Document deleted")
            router.push(listHref)
        } catch {
            toast.error("Failed to delete document")
        }
    }

    const handleDiscard = React.useCallback(async () => {
        if (isDocumentDirty) {
            const confirmed = await confirm({
                actionLabel: "Discard changes",
                cancelLabel: "Keep editing",
                description: buildUnsavedChangesDescription(),
                onSave: async () => {
                    submitDetailsForm("save")
                },
                saveLabel: "Save",
                title: "Discard unsaved changes?",
            })

            if (!confirmed) {
                return
            }
        }

        setDocumentDetailsResetRevision((revision) => revision + 1)
    }, [buildUnsavedChangesDescription, confirm, isDocumentDirty, setDocumentDetailsResetRevision, submitDetailsForm])

    const handleClose = React.useCallback(async () => {
        if (isDocumentDirty) {
            const confirmed = await confirm({
                actionLabel: "Discard changes",
                cancelLabel: "Keep editing",
                description: buildUnsavedChangesDescription(),
                onSave: async () => {
                    submitDetailsForm("close")
                },
                saveLabel: "Save",
                title: "Leave this page?",
            })

            if (!confirmed) {
                return
            }
        }

        router.push(listHref)
    }, [buildUnsavedChangesDescription, confirm, isDocumentDirty, listHref, router, submitDetailsForm])

    const handleReprocess = async () => {
        if (!documentId) return
        try {
            await reprocessDocument(documentId)
            toast.success("Document added to reprocessing queue")
            router.push(listHref)
        } catch {
            toast.error("Failed to reprocess document")
        }
    }

    const handleRemovePassword = async (options: {
        updateDocument: boolean
        deleteOriginal: boolean
        includeMetadata: boolean
    }) => {
        if (!documentId) return
        if (!pdfPassword || pdfRequiresPassword) {
            toast.error("Please enter the current PDF password before attempting to remove it.")
            return
        }

        const sourceDocumentId = activeVersionId ?? documentId

        setRemovingPassword(true)
        try {
            await removeDocumentPassword(sourceDocumentId, {
                password: pdfPassword,
                update_document: options.updateDocument,
                include_metadata: options.includeMetadata,
                delete_original: options.deleteOriginal,
                source_mode: "explicit_selection",
            })
            toast.success(`Password removal operation for "${typeof title === "string" ? title : "Document"}" will begin in the background.`)
            setRemovePasswordOpen(false)

            if (!options.updateDocument && options.deleteOriginal) {
                router.push(listHref)
            } else {
                router.refresh()
            }
        } catch (error) {
            toast.error("Failed to remove password", {
                description: error instanceof Error ? error.message : "Unknown error",
            })
        } finally {
            setRemovingPassword(false)
        }
    }

    return (
        <div className="flex items-center justify-between w-full">
            <div className="flex flex-col gap-2">
                <h1 className="text-xl font-bold tracking-tight">{title}</h1>
                <div className="flex items-center gap-2 mb-2">
                {children}
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                        <HasObjectPermission action="change" object={permissionedDocument} type="document">
                            {documentId ? (
                                <DocumentSuggestionsDropdown
                                    documentId={documentId}
                                    correspondents={correspondents}
                                    documentTypes={documentTypes}
                                    storagePaths={storagePaths}
                                    tags={tags}
                                />
                            ) : null}
                        </HasObjectPermission>
                        <HasObjectPermission action="change" object={permissionedDocument} type="document">
                            <DocumentCustomFieldsDropdown
                                customFields={customFields}
                                disabled={customFields.length === 0}
                            />
                        </HasObjectPermission>
                        <HasObjectPermission action="change" object={permissionedDocument} type="document">
                            {nextId && (
                                <Button variant="secondary" type="submit" form="document-details-form" onClick={() => setSaveAction("next")} className="h-8 hover:bg-accent" disabled={!isDocumentDirty}>
                                    Save & Next
                                </Button>
                            )}
                        </HasObjectPermission>
                        <HasObjectPermission action="change" object={permissionedDocument} type="document">
                            <Button variant="secondary" type="submit" form="document-details-form" onClick={() => setSaveAction("save")} className="h-8 hover:bg-accent" disabled={!isDocumentDirty}>
                                <Save className="mr-2 h-4 w-4" />
                                Save
                            </Button>
                        </HasObjectPermission>
                        <HasObjectPermission action="change" object={permissionedDocument} type="document">
                            <Button variant="secondary" onClick={() => void handleDiscard()} className="h-8 hover:bg-accent" disabled={!isDocumentDirty}>
                                Discard
                            </Button>
                        </HasObjectPermission>
                        <Button variant="secondary" onClick={() => void handleClose()} className="h-8 hover:bg-accent">
                            Close
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="icon" className="h-8 w-8 hover:bg-accent">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <HasObjectPermission action="change" object={permissionedDocument} type="document">
                                    <DropdownMenuItem onClick={handleReprocess}>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Reprocess
                                    </DropdownMenuItem>
                                </HasObjectPermission>
                                {documentId && emailEnabled && (
                                    <DropdownMenuItem onClick={() => setEmailDialogOpen(true)}>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Email document
                                    </DropdownMenuItem>
                                )}
                                {documentId && canEditPdf && (
                                    <DropdownMenuItem onClick={() => setPdfToolsOpen(true)}>
                                        <Scissors className="mr-2 h-4 w-4" />
                                        PDF tools
                                    </DropdownMenuItem>
                                )}
                                {documentId && canEditPdf && (
                                    <DropdownMenuItem
                                        onClick={() => {
                                            if (!pdfPassword || pdfRequiresPassword) {
                                                toast.error("Please unlock the PDF with its current password first.")
                                                return
                                            }
                                            setRemovePasswordOpen(true)
                                        }}
                                    >
                                        <KeyRound className="mr-2 h-4 w-4" />
                                        Remove password protection
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => void handlePrint()}>
                                    <Printer className="mr-2 h-4 w-4" />
                                    Print
                                </DropdownMenuItem>
                                {pdfViewerRegistry && (
                                    <>
                                        <DropdownMenuItem onClick={handleCopySelectedText}>
                                            <Copy className="mr-2 h-4 w-4" />
                                            Copy selected text
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => executeViewerCommand("zoom:fit-page")}>
                                            <Expand className="mr-2 h-4 w-4" />
                                            Fit page
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => executeViewerCommand("zoom:fit-width")}>
                                            <Columns2 className="mr-2 h-4 w-4" />
                                            Fit width
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => executeViewerCommand("spread:none")}>
                                            <Columns2 className="mr-2 h-4 w-4" />
                                            Single page
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => executeViewerCommand("spread:odd")}>
                                            <Columns2 className="mr-2 h-4 w-4" />
                                            Two-up
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => executeViewerCommand("rotate:counter-clockwise")}>
                                            <RotateCcw className="mr-2 h-4 w-4" />
                                            Rotate left
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => executeViewerCommand("rotate:clockwise")}>
                                            <RotateCw className="mr-2 h-4 w-4" />
                                            Rotate right
                                        </DropdownMenuItem>
                                    </>
                                )}
                                {documentId && (
                                    <DropdownMenuItem
                                        onClick={() =>
                                            router.push(
                                                slug
                                                    ? listHref
                                                    : `/documents?more_like_id=${documentId}`
                                            )
                                        }
                                    >
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        More like this
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <HasObjectPermission action="delete" object={permissionedDocument} type="document">
                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDelete}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </DropdownMenuItem>
                                </HasObjectPermission>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="flex items-center rounded-md border p-1 bg-secondary">
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!prevId} asChild={!!prevId}>
                                {prevId ? (
                                    <OpenDocumentLink
                                        documentId={prevId}
                                        href={getDocumentSectionHref(prevId, currentSection, { slug })}
                                        title={`Document ${prevId}`}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </OpenDocumentLink>
                                ) : <ChevronLeft className="h-4 w-4" />}
                            </Button>
                            <span className="text-xs text-muted-foreground px-2">
                                {currentIndex >= 0 ? `${currentIndex + 1} of ${navigationDocumentList.length}` : '-'}
                            </span>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!nextId} asChild={!!nextId}>
                                {nextId ? (
                                    <OpenDocumentLink
                                        documentId={nextId}
                                        href={getDocumentSectionHref(nextId, currentSection, { slug })}
                                        title={`Document ${nextId}`}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </OpenDocumentLink>
                                ) : <ChevronRight className="h-4 w-4" />}
                            </Button>
                        </div>

                        {documentId ? (
                            <DocumentVersionDropdown
                                documentId={documentId}
                                initialVersions={versions}
                                disabled={versions.length === 0}
                            />
                        ) : null}

                        <div className="flex items-center">
                            <Button
                                variant="secondary"
                                className="h-8 rounded-r-none border-r-0 hover:bg-accent"
                                disabled={downloading || !documentId}
                                onClick={() => void handleDownload(false)}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                {downloading ? "Downloading..." : "Download"}
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="h-8 w-8 rounded-l-none hover:bg-accent"
                                        disabled={downloading || !documentId}
                                    >
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {hasArchiveVersion && (
                                        <DropdownMenuItem onClick={() => void handleDownload(true)}>
                                            <Download className="mr-2 h-4 w-4" />
                                            Download original
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuCheckboxItem
                                        checked={useFormattedFilename}
                                        onCheckedChange={(checked) => setUseFormattedFilename(checked === true)}
                                    >
                                        Use formatted filename
                                    </DropdownMenuCheckboxItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <DetailsFieldsPicker
                            availableFields={availableDetailFields}
                            displayFields={detailFieldLayout}
                            disabled={availableDetailFields.length === 0}
                            onDisplayFieldsChange={(value) => {
                                setDetailFieldLayout((previous) =>
                                    typeof value === "function" ? value(previous) : value
                                )
                                setDetailFieldLayoutRevision((revision) => revision + 1)
                            }}
                        />
                    </div>
                </div>
            </div>

            {documentId && (
                <EmailDocumentDialog
                    documentId={documentId}
                    documentTitle={typeof title === "string" ? title : "Document"}
                    hasArchiveVersion={hasArchiveVersion}
                    open={emailDialogOpen}
                    onOpenChange={setEmailDialogOpen}
                />
            )}
            {documentId && canEditPdf && (
                <PdfToolsDialog
                    documentId={documentId}
                    documentTitle={typeof title === "string" ? title : "Document"}
                    totalPages={Math.max(totalPages, pdfViewerPageCount)}
                    open={pdfToolsOpen}
                    onOpenChange={setPdfToolsOpen}
                />
            )}
            {documentId && canEditPdf && (
                <RemovePasswordDialog
                    open={removePasswordOpen}
                    onOpenChange={setRemovePasswordOpen}
                    onConfirm={handleRemovePassword}
                    busy={removingPassword}
                />
            )}
        </div>
    )
}
