"use client"

import * as React from "react"
import { Upload, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export function UploadWidget() {
  const router = useRouter()
  const [dragging, setDragging] = React.useState(false)
  const [files, setFiles] = React.useState<File[]>([])
  const [uploading, setUploading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    setFiles((prev) => [...prev, ...dropped])
  }

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    setFiles((prev) => [...prev, ...selected])
  }

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    setUploading(true)
    try {
      for (const file of files) {
        const form = new FormData()
        form.append("document", file)
        const res = await fetch("/api/upload", {
          method: "POST",
          body: form,
        })
        if (!res.ok) throw new Error(`Failed to upload ${file.name}`)
      }
      toast.success(`${files.length} document(s) uploaded`)
      setFiles([])
      router.refresh()
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col gap-4">
      <h3 className="font-semibold leading-none tracking-tight">Upload Documents</h3>

      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          dragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Drop files here or click to browse
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleSelect}
          accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.gif,.bmp,.txt,.csv,.md,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp"
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm py-1 px-2 bg-muted/50 rounded">
              <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate flex-1">{f.name}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {(f.size / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); removeFile(i) }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <Button
            size="sm"
            className="w-full"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading
              ? "Uploading…"
              : `Upload ${files.length} file${files.length > 1 ? "s" : ""}`}
          </Button>
        </div>
      )}
    </div>
  )
}
