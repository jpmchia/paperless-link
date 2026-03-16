"use client"

import * as React from "react"
import { CanCreate } from "@/components/permissions/can-create"
import { CanDelete } from "@/components/permissions/can-delete"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Trash2, Send } from "lucide-react"
import { toast } from "sonner"

interface Note {
  id: number
  note: string
  created: string
  user?: { id: number; username: string } | null
}

interface NotesTabProps {
  documentId: number
  initialNotes: Note[]
}

async function addNote(documentId: number, note: string): Promise<Note> {
  const res = await fetch(`/api/documents/${documentId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  })
  if (!res.ok) throw new Error("Failed to add note")
  return res.json()
}

async function removeNote(documentId: number, noteId: number): Promise<void> {
  const res = await fetch(`/api/documents/${documentId}/notes/${noteId}`, {
    method: "DELETE",
  })
  if (!res.ok) throw new Error("Failed to delete note")
}

export function NotesTab({ documentId, initialNotes }: NotesTabProps) {
  const [notes, setNotes] = React.useState<Note[]>(initialNotes)
  const [text, setText] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  const handleAdd = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      const created = await addNote(documentId, text.trim())
      setNotes((prev) => [created, ...prev])
      setText("")
      toast.success("Note added")
    } catch (error) {
      toast.error("Failed to add note", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async () => {
    if (deleteId == null) return
    try {
      await removeNote(documentId, deleteId)
      setNotes((prev) => prev.filter((n) => n.id !== deleteId))
      toast.success("Note deleted")
    } catch (error) {
      toast.error("Failed to delete note", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      {/* Add note form */}
      <div className="flex flex-col gap-2">
        <CanCreate
          type="note"
          fallback={(
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              You do not have permission to add notes to this document.
            </div>
          )}
        >
          <Textarea
            placeholder="Add a note…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleAdd()
              }
            }}
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">Ctrl+Enter to submit</p>
            <Button size="sm" onClick={handleAdd} disabled={sending || !text.trim()}>
              <Send className="mr-2 h-3.5 w-3.5" />
              {sending ? "Adding…" : "Add Note"}
            </Button>
          </div>
        </CanCreate>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {notes.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            No notes yet. Add one above.
          </p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="rounded-lg border p-3 space-y-1.5 group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {note.user?.username && (
                    <span className="font-medium text-foreground">{note.user.username}</span>
                  )}
                  <span>{new Date(note.created).toLocaleString()}</span>
                </div>
                <CanDelete type="note">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(note.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </CanDelete>
              </div>
              <p className="text-sm whitespace-pre-wrap">{note.note}</p>
            </div>
          ))
        )}
      </div>

      {/* Delete confirmation */}
      <CanDelete type="note">
        <AlertDialog open={deleteId !== null} onOpenChange={(o: boolean) => !o && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete note?</AlertDialogTitle>
              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CanDelete>
    </div>
  )
}
