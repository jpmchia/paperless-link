"use client"

import { useConfirmationDialog } from "@/components/confirmation-dialog-provider"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { HasObjectPermission } from "@/components/permissions/has-object-permission"
import { OpenDocumentLink } from "@/components/open-document-link"
import {
    documentDetailAvailableFieldsAtom,
    documentDetailFieldLayoutAtom,
    documentDetailFieldLayoutRevisionAtom,
    documentListState,
    documentSectionAtom,
} from "@/lib/store"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, MoreVertical, Trash2, RefreshCw, Save, Sparkles } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { PermissionedObject } from "@/lib/permissions"
import { deleteDocument, reprocessDocument } from "./actions"
import { getDocumentSectionHref, type DocumentSection } from "./document-sections"
import { DetailsFieldsPicker } from "./details-fields-picker"

export function TopBar({
    children,
    title = "Document",
    permissionedDocument,
    documentId,
    initialSection = "details",
}: {
    children: React.ReactNode
    title?: React.ReactNode
    permissionedDocument?: PermissionedObject | null
    documentId?: number
    initialSection?: DocumentSection
}) {
    const documentList = useAtomValue(documentListState)
    const currentSection = useAtomValue(documentSectionAtom) ?? initialSection
    const [detailFieldLayout, setDetailFieldLayout] = useAtom(documentDetailFieldLayoutAtom)
    const setDetailFieldLayoutRevision = useSetAtom(documentDetailFieldLayoutRevisionAtom)
    const availableDetailFields = useAtomValue(documentDetailAvailableFieldsAtom)
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
        </div>
    )
}
