"use client"

import { useAtom, useAtomValue } from "jotai"
import { documentListState, visibleCustomFieldsAtom } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, MoreVertical, Trash2, RefreshCw, Save, ListChecks } from "lucide-react"
import Link from "next/link"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deleteDocument, reprocessDocument } from "./actions"

export function TopBar({ children, title = "Document", documentId, customFieldsList }: { children: React.ReactNode, title?: React.ReactNode, documentId?: number, customFieldsList?: any[] }) {
    const documentList = useAtomValue(documentListState)
    const [visibleCustomFields, setVisibleCustomFields] = useAtom(visibleCustomFieldsAtom)
    const router = useRouter()

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
        if (confirm("Are you sure you want to delete this document?")) {
            try {
                await deleteDocument(documentId)
                toast.success("Document deleted")
                router.push("/documents")
            } catch (error) {
                toast.error("Failed to delete document")
            }
        }
    }

    const handleReprocess = async () => {
        if (!documentId) return
        try {
            await reprocessDocument(documentId)
            toast.success("Document added to reprocessing queue")
            router.push("/documents")
        } catch (error) {
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
                                <Link href={`/documents/${prevId}`}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Link>
                            ) : <ChevronLeft className="h-4 w-4" />}
                        </Button>
                        <span className="text-xs text-muted-foreground px-2">
                            {currentIndex >= 0 ? `${currentIndex + 1} of ${documentList.length}` : '-'}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!nextId} asChild={!!nextId}>
                            {nextId ? (
                                <Link href={`/documents/${nextId}`}>
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
                            ) : <ChevronRight className="h-4 w-4" />}
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" className="h-8 hover:bg-accent">
                                    <ListChecks className="mr-2 h-4 w-4" />
                                    Custom Fields
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[240px]">
                                <div className="max-h-[80vh] overflow-y-auto">
                                    {customFieldsList?.map((cf: any) => (
                                        <DropdownMenuCheckboxItem
                                            key={cf.id}
                                            checked={visibleCustomFields.includes(cf.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setVisibleCustomFields([...visibleCustomFields, cf.id])
                                                } else {
                                                    setVisibleCustomFields(visibleCustomFields.filter((id: number) => id !== cf.id))
                                                }
                                            }}
                                        >
                                            <div className="flex justify-between w-full items-center">
                                                <span>{cf.name}</span>
                                                <span className="text-xs text-muted-foreground ml-4">{cf.data_type}</span>
                                            </div>
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                    {(!customFieldsList || customFieldsList.length === 0) && (
                                        <DropdownMenuItem disabled>No custom fields</DropdownMenuItem>
                                    )}
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="icon" className="h-8 w-8 hover:bg-accent">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleReprocess}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Reprocess
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDelete}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button variant="secondary" onClick={() => router.push("/documents")} className="h-8 hover:bg-accent">
                            Close
                        </Button>
                        <Button variant="secondary" onClick={() => {
                            const form = document.getElementById("document-details-form") as HTMLFormElement
                            if (form) form.reset()
                        }} className="h-8 hover:bg-accent">
                            Discard
                        </Button>
                        {nextId && (
                            <Button variant="secondary" type="submit" form="document-details-form" onClick={() => setSaveAction("next")} className="h-8 hover:bg-accent">
                                Save & Next
                            </Button>
                        )}
                        <Button variant="secondary" type="submit" form="document-details-form" onClick={() => setSaveAction("save")} className="h-8 hover:bg-accent">
                            <Save className="mr-2 h-4 w-4" />
                            Save
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
