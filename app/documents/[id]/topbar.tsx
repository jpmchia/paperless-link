"use client"

import * as React from "react"
import { useConfirmationDialog } from "@/components/confirmation-dialog-provider"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { HasObjectPermission } from "@/components/permissions/has-object-permission"
import { OpenDocumentLink } from "@/components/open-document-link"
import {
    activeVersionIdAtom,
    documentDetailAvailableFieldsAtom,
    documentDetailFieldLayoutAtom,
    documentDetailFieldLayoutRevisionAtom,
    documentListState,
    documentSectionAtom,
    pdfViewerPasswordAtom,
    pdfViewerPageCountAtom,
    pdfViewerRequiresPasswordAtom,
} from "@/lib/store"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronLeft, ChevronRight, Download, KeyRound, Mail, MoreVertical, Printer, Scissors, Trash2, RefreshCw, Save, Sparkles } from "lucide-react"
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
import { DetailsFieldsPicker } from "./details-fields-picker"
import { EmailDocumentDialog } from "./email-document-dialog"
import { PdfToolsDialog } from "./pdf-tools-dialog"
import { RemovePasswordDialog } from "./remove-password-dialog"

export function TopBar({
    children,
    title = "Document",
    permissionedDocument,
    documentId,
    initialSection = "details",
    emailEnabled = false,
    hasArchiveVersion = false,
    canEditPdf = false,
    totalPages = 1,
}: {
    children: React.ReactNode
    title?: React.ReactNode
    permissionedDocument?: PermissionedObject | null
    documentId?: number
    initialSection?: DocumentSection
    emailEnabled?: boolean
    hasArchiveVersion?: boolean
    canEditPdf?: boolean
    totalPages?: number
}) {
    const documentList = useAtomValue(documentListState)
    const currentSection = useAtomValue(documentSectionAtom) ?? initialSection
    const activeVersionId = useAtomValue(activeVersionIdAtom)
    const pdfPassword = useAtomValue(pdfViewerPasswordAtom)
    const pdfViewerPageCount = useAtomValue(pdfViewerPageCountAtom)
    const pdfRequiresPassword = useAtomValue(pdfViewerRequiresPasswordAtom)
    const [detailFieldLayout, setDetailFieldLayout] = useAtom(documentDetailFieldLayoutAtom)
    const setDetailFieldLayoutRevision = useSetAtom(documentDetailFieldLayoutRevisionAtom)
    const availableDetailFields = useAtomValue(documentDetailAvailableFieldsAtom)
    const [emailDialogOpen, setEmailDialogOpen] = React.useState(false)
    const [pdfToolsOpen, setPdfToolsOpen] = React.useState(false)
    const [removePasswordOpen, setRemovePasswordOpen] = React.useState(false)
    const [removingPassword, setRemovingPassword] = React.useState(false)
    const [downloading, setDownloading] = React.useState(false)
    const [useFormattedFilename, setUseFormattedFilename] = React.useState(false)
    const router = useRouter()
    const { confirm } = useConfirmationDialog()

    // Find Next/Prev document IDs
    const currentIndex = documentId ? documentList.indexOf(documentId) : -1
    const prevId = currentIndex > 0 ? documentList[currentIndex - 1] : null
    const nextId = currentIndex >= 0 && currentIndex < documentList.length - 1 ? documentList[currentIndex + 1] : null

    const setSaveAction = (action: string) => {
        // Will be picked up by the details form
        if (typeof window !== "undefined") {
            window.sessionStorage.setItem("documentSaveAction", action)
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
        return `/api/proxy/documents/${documentId}/download/${query ? `?${query}` : ""}`
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

        try {
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error(await response.text())
            }

            const blob = await response.blob()
            const blobUrl = URL.createObjectURL(blob)
            const iframe = window.document.createElement("iframe")
            iframe.style.display = "none"
            iframe.src = blobUrl
            window.document.body.appendChild(iframe)
            iframe.onload = () => {
                try {
                    iframe.contentWindow?.focus()
                    iframe.contentWindow?.print()
                } finally {
                    window.setTimeout(() => {
                        window.document.body.removeChild(iframe)
                        URL.revokeObjectURL(blobUrl)
                    }, 500)
                }
            }
        } catch {
            toast.error("Failed to load document for printing")
        }
    }, [buildDownloadUrl])

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
            router.push("/documents")
        } catch {
            toast.error("Failed to delete document")
        }
    }

    const handleReprocess = async () => {
        if (!documentId) return
        try {
            await reprocessDocument(documentId)
            toast.success("Document added to reprocessing queue")
            router.push("/documents")
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
                router.push("/documents")
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
                {children}
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-md border p-1 mr-2 bg-secondary">
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!prevId} asChild={!!prevId}>
                            {prevId ? (
                                <OpenDocumentLink
                                    documentId={prevId}
                                    href={getDocumentSectionHref(prevId, currentSection)}
                                    title={`Document ${prevId}`}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </OpenDocumentLink>
                            ) : <ChevronLeft className="h-4 w-4" />}
                        </Button>
                        <span className="text-xs text-muted-foreground px-2">
                            {currentIndex >= 0 ? `${currentIndex + 1} of ${documentList.length}` : '-'}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!nextId} asChild={!!nextId}>
                            {nextId ? (
                                <OpenDocumentLink
                                    documentId={nextId}
                                    href={getDocumentSectionHref(nextId, currentSection)}
                                    title={`Document ${nextId}`}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </OpenDocumentLink>
                            ) : <ChevronRight className="h-4 w-4" />}
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
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
                                {documentId && (
                                    <DropdownMenuItem onClick={() => router.push(`/documents?more_like_id=${documentId}`)}>
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

                        <Button variant="secondary" onClick={() => router.push("/documents")} className="h-8 hover:bg-accent">
                            Close
                        </Button>
                        <HasObjectPermission action="change" object={permissionedDocument} type="document">
                            <Button variant="secondary" onClick={() => {
                                const form = window.document.getElementById("document-details-form") as HTMLFormElement | null
                                if (form) form.reset()
                            }} className="h-8 hover:bg-accent">
                                Discard
                            </Button>
                        </HasObjectPermission>
                        <HasObjectPermission action="change" object={permissionedDocument} type="document">
                            {nextId && (
                                <Button variant="secondary" type="submit" form="document-details-form" onClick={() => setSaveAction("next")} className="h-8 hover:bg-accent">
                                    Save & Next
                                </Button>
                            )}
                        </HasObjectPermission>
                        <HasObjectPermission action="change" object={permissionedDocument} type="document">
                            <Button variant="secondary" type="submit" form="document-details-form" onClick={() => setSaveAction("save")} className="h-8 hover:bg-accent">
                                <Save className="mr-2 h-4 w-4" />
                                Save
                            </Button>
                        </HasObjectPermission>
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
