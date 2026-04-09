"use client"

import * as React from "react"
import {
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
  GlobalWorkerOptions,
  getDocument,
} from "pdfjs-dist/legacy/build/pdf.mjs"
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { activeVersionIdAtom, pdfViewerPasswordAtom } from "@/lib/store"
import { useAtomValue } from "jotai"
import {
  CheckCheck,
  FilePlus2,
  GripVertical,
  Pencil,
  RotateCcw,
  RotateCw,
  Scissors,
  Trash2,
  X,
} from "lucide-react"
import { postJson } from "@/lib/paperless-client"
import { useAsyncAction } from "@/hooks/use-async-action"
import {
  Dialog as DraggableDialog,
  DialogBody as DraggableDialogBody,
  DialogContent as DraggableDialogContent,
  DialogDescription as DraggableDialogDescription,
  DialogFooter as DraggableDialogFooter,
  DialogHeader as DraggableDialogHeader,
  DialogTitle as DraggableDialogTitle,
} from "@/components/draggable-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

if (typeof window !== "undefined" && !GlobalWorkerOptions.workerSrc) {
  GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString()
}

type PdfEditMode = "update" | "create"

interface PageOperation {
  page: number
  rotate: number
  splitAfter: boolean
  selected: boolean
}

interface PdfToolsDialogProps {
  documentId: number
  documentTitle: string
  totalPages: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

function normalizeRotation(rotation: number) {
  return (rotation + 360) % 360
}

function buildInitialPages(totalPages: number): PageOperation[] {
  return Array.from({ length: totalPages }, (_, index) => ({
    page: index + 1,
    rotate: 0,
    splitAfter: false,
    selected: false,
  }))
}

function computeDocIndex(pages: PageOperation[], index: number) {
  let docIndex = 0
  for (let i = 0; i <= index; i += 1) {
    if (pages[i]?.splitAfter && i < index) {
      docIndex += 1
    }
  }
  return docIndex
}

function PdfThumbnail({
  src,
  pageNumber,
  rotation,
  onOpenPreview,
}: {
  src?: string
  pageNumber: number
  rotation: number
  onOpenPreview?: () => void
}) {
  return (
    <div className="relative flex min-h-[12rem] w-[9rem] items-center justify-center overflow-hidden rounded-md border bg-muted/20">
      {!src && (
        <div className="text-xs text-muted-foreground">Preview unavailable</div>
      )}
      {src && (
        <button
          type="button"
          className="flex h-full w-full items-center justify-center p-2"
          onClick={(event) => {
            event.stopPropagation()
            onOpenPreview?.()
          }}
          aria-label={`Open preview for page ${pageNumber}`}
        >
          <img
            src={src}
            alt={`Page ${pageNumber} preview`}
            className="block max-h-[11.25rem] max-w-full rounded-sm bg-white shadow-sm"
            style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined }}
          />
        </button>
      )}
    </div>
  )
}

function PdfPagePreview({
  pdf,
  pageNumber,
  rotation,
  maxWidth,
  maxHeight,
}: {
  pdf: PDFDocumentProxy | null
  pageNumber: number
  rotation: number
  maxWidth: number
  maxHeight: number
}) {
  const [previewSrc, setPreviewSrc] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!pdf) {
      setPreviewSrc(null)
      return
    }

    const pdfDocument = pdf

    let cancelled = false
    let objectUrl: string | null = null

    async function renderPreview() {
      try {
        setError(null)
        const page = await pdfDocument.getPage(pageNumber)
        const baseViewport = page.getViewport({ scale: 1, rotation })
        const widthScale = Math.max((maxWidth - 32) / Math.max(baseViewport.width, 1), 0.1)
        const heightScale = Math.max((maxHeight - 120) / Math.max(baseViewport.height, 1), 0.1)
        const scale = Math.max(Math.min(widthScale, heightScale, 3), 0.25)
        const viewport = page.getViewport({ scale, rotation })
        const outputScale = window.devicePixelRatio || 1
        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")

        if (!context) {
          throw new Error("Canvas rendering context unavailable")
        }

        canvas.width = Math.ceil(viewport.width * outputScale)
        canvas.height = Math.ceil(viewport.height * outputScale)
        context.setTransform(outputScale, 0, 0, outputScale, 0, 0)
        context.clearRect(0, 0, viewport.width, viewport.height)

        const task = page.render({
          canvasContext: context,
          canvas,
          viewport,
        })

        await task.promise

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/webp", 0.95)
        )

        if (!blob) {
          throw new Error("Failed to create preview image")
        }

        objectUrl = URL.createObjectURL(blob)
        if (!cancelled) {
          setPreviewSrc(objectUrl)
        }
      } catch (nextError) {
        if (!cancelled) {
          setPreviewSrc(null)
          setError(nextError instanceof Error ? nextError.message : "Preview unavailable")
        }
      }
    }

    void renderPreview()

    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [maxHeight, maxWidth, pageNumber, pdf, rotation])

  if (error) {
    return <div className="text-sm text-muted-foreground">{error}</div>
  }

  if (!previewSrc) {
    return <div className="text-sm text-muted-foreground">Rendering preview...</div>
  }

  return (
    <img
      src={previewSrc}
      alt={`Page ${pageNumber} preview`}
      className="block max-h-full max-w-full rounded-md bg-white object-contain shadow-sm"
    />
  )
}

function SortablePageCard({
  item,
  index,
  thumbnailSrc,
  onOpenPreview,
  onToggleSelection,
  onRotate,
  onDelete,
  onToggleSplit,
}: {
  item: PageOperation
  index: number
  thumbnailSrc?: string
  onOpenPreview: (index: number) => void
  onToggleSelection: (index: number) => void
  onRotate: (index: number, counterclockwise?: boolean) => void
  onDelete: (index: number) => void
  onToggleSplit: (index: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.page })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative w-fit max-w-full rounded-lg border bg-background p-2.5 transition ${
        item.selected ? "border-primary ring-1 ring-primary/40" : "border-border"
      }`}
      onClick={() => onToggleSelection(index)}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-grab rounded p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Drag page ${item.page}`}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Checkbox
            checked={item.selected}
            onCheckedChange={() => onToggleSelection(index)}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Select page ${item.page}`}
          />
          <div>
            <div className="text-sm font-medium">Page {item.page}</div>
            <div className="text-xs text-muted-foreground">
              Rotation: {normalizeRotation(item.rotate)}°
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {item.splitAfter && (
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              Split after
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={(event) => {
              event.stopPropagation()
              onDelete(index)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-3">
        <PdfThumbnail
          src={thumbnailSrc}
          pageNumber={item.page}
          rotation={normalizeRotation(item.rotate)}
          onOpenPreview={() => onOpenPreview(index)}
        />
      </div>

      <div className="flex max-w-fit flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2"
          onClick={(event) => {
            event.stopPropagation()
            onRotate(index, true)
          }}
        >
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Left
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2"
          onClick={(event) => {
            event.stopPropagation()
            onRotate(index, false)
          }}
        >
          <RotateCw className="mr-2 h-3.5 w-3.5" />
          Right
        </Button>
        <Button
          type="button"
          variant={item.splitAfter ? "default" : "outline"}
          size="sm"
          className="h-7 px-2"
          onClick={(event) => {
            event.stopPropagation()
            onToggleSplit(index)
          }}
        >
          <Scissors className="mr-2 h-3.5 w-3.5" />
          Split
        </Button>
      </div>
    </div>
  )
}

export function PdfToolsDialog({
  documentId,
  documentTitle,
  totalPages,
  open,
  onOpenChange,
}: PdfToolsDialogProps) {
  const activeVersionId = useAtomValue(activeVersionIdAtom)
  const pdfPassword = useAtomValue(pdfViewerPasswordAtom)
  const [viewportLimit, setViewportLimit] = React.useState({ width: 1240, height: 900 })
  const [pages, setPages] = React.useState<PageOperation[]>(() => buildInitialPages(totalPages))
  const [mode, setMode] = React.useState<PdfEditMode>("update")
  const [includeMetadata, setIncludeMetadata] = React.useState(true)
  const [deleteOriginal, setDeleteOriginal] = React.useState(false)
  const [previewIndex, setPreviewIndex] = React.useState<number | null>(null)
  const [pdf, setPdf] = React.useState<PDFDocumentProxy | null>(null)
  const [pdfError, setPdfError] = React.useState<string | null>(null)
  const [thumbnailSources, setThumbnailSources] = React.useState<Record<number, string>>({})

  const sourceUrl = React.useMemo(() => {
    const versionSuffix = activeVersionId != null ? `?version=${activeVersionId}` : ""
    return `/api/proxy/documents/${documentId}/preview${versionSuffix}`
  }, [activeVersionId, documentId])

  React.useEffect(() => {
    if (!open) {
      setPages(buildInitialPages(totalPages))
      setMode("update")
      setIncludeMetadata(true)
      setDeleteOriginal(false)
      setPreviewIndex(null)
      setThumbnailSources({})
    }
  }, [open, totalPages])

  React.useEffect(() => {
    if (typeof window === "undefined") return

    const updateViewportLimit = () => {
      setViewportLimit({
        width: Math.max(640, Math.floor(window.innerWidth * 0.9)),
        height: Math.max(480, Math.floor(window.innerHeight * 0.9)),
      })
    }

    updateViewportLimit()
    window.addEventListener("resize", updateViewportLimit)
    return () => window.removeEventListener("resize", updateViewportLimit)
  }, [])

  React.useEffect(() => {
    if (!open) return

    let cancelled = false
    setPdf(null)
    setPdfError(null)
    setThumbnailSources({})

    const task: PDFDocumentLoadingTask = getDocument({
      url: sourceUrl,
      withCredentials: false,
      password: pdfPassword || undefined,
    })

    task.onPassword = () => {
      setPdfError("Unlock the PDF in the preview pane to load thumbnails.")
    }

    void task.promise
      .then((nextPdf) => {
        if (cancelled) return
        setPdf(nextPdf)
        setPdfError(null)
        setPages((current) =>
          current.length === nextPdf.numPages ? current : buildInitialPages(nextPdf.numPages)
        )
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setPdf(null)
        setPdfError(error instanceof Error ? error.message : "Failed to load PDF previews")
      })

    return () => {
      cancelled = true
      void task.destroy()
    }
  }, [open, pdfPassword, sourceUrl])

  React.useEffect(() => {
    if (!open || !pdf) return
    const pdfDocument: PDFDocumentProxy = pdf

    let cancelled = false
    const objectUrls: string[] = []

    async function buildThumbnails() {
      try {
        const entries = await Promise.all(
          Array.from({ length: pdfDocument.numPages }, async (_, index) => {
            const pageNumber = index + 1
            const page = await pdfDocument.getPage(pageNumber)
            const baseViewport = page.getViewport({ scale: 1 })
            const scale = 156 / Math.max(baseViewport.width, 1)
            const viewport = page.getViewport({ scale })
            const outputScale = window.devicePixelRatio || 1
            const canvas = document.createElement("canvas")
            const context = canvas.getContext("2d")

            if (!context) {
              throw new Error("Canvas rendering context unavailable")
            }

            canvas.width = Math.ceil(viewport.width * outputScale)
            canvas.height = Math.ceil(viewport.height * outputScale)
            context.setTransform(outputScale, 0, 0, outputScale, 0, 0)
            context.clearRect(0, 0, viewport.width, viewport.height)

            const task = page.render({
              canvasContext: context,
              canvas,
              viewport,
            })
            await task.promise

            const blob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob(resolve, "image/webp", 0.9)
            )

            if (!blob) {
              return [pageNumber, ""] as const
            }

            const objectUrl = URL.createObjectURL(blob)
            objectUrls.push(objectUrl)
            return [pageNumber, objectUrl] as const
          })
        )

        if (!cancelled) {
          setThumbnailSources(Object.fromEntries(entries))
        }
      } catch (error) {
        if (!cancelled) {
          setPdfError(error instanceof Error ? error.message : "Failed to build PDF thumbnails")
        }
      }
    }

    void buildThumbnails()

    return () => {
      cancelled = true
      for (const url of objectUrls) {
        URL.revokeObjectURL(url)
      }
    }
  }, [open, pdf])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const hasSelection = React.useMemo(() => pages.some((page) => page.selected), [pages])
  const hasSplit = React.useMemo(() => pages.some((page) => page.splitAfter), [pages])

  React.useEffect(() => {
    if (hasSplit && mode === "update") {
      setMode("create")
    }
  }, [hasSplit, mode])

  const toggleSelection = (index: number) => {
    setPages((current) =>
      current.map((page, pageIndex) =>
        pageIndex === index ? { ...page, selected: !page.selected } : page
      )
    )
  }

  const rotatePage = (index: number, counterclockwise = false) => {
    setPages((current) =>
      current.map((page, pageIndex) =>
        pageIndex === index
          ? {
              ...page,
              rotate: normalizeRotation(page.rotate + (counterclockwise ? -90 : 90)),
            }
          : page
      )
    )
  }

  const rotateSelected = (direction: -90 | 90) => {
    setPages((current) =>
      current.map((page) =>
        page.selected
          ? { ...page, rotate: normalizeRotation(page.rotate + direction) }
          : page
      )
    )
  }

  const removePage = (index: number) => {
    setPages((current) => current.filter((_, pageIndex) => pageIndex !== index))
  }

  const deleteSelected = () => {
    setPages((current) => current.filter((page) => !page.selected))
  }

  const toggleSplit = (index: number) => {
    setPages((current) =>
      current.map((page, pageIndex) =>
        pageIndex === index ? { ...page, splitAfter: !page.splitAfter } : page
      )
    )
  }

  const selectAll = () => {
    setPages((current) => current.map((page) => ({ ...page, selected: true })))
  }

  const deselectAll = () => {
    setPages((current) => current.map((page) => ({ ...page, selected: false })))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setPages((current) => {
      const oldIndex = current.findIndex((page) => page.page === active.id)
      const newIndex = current.findIndex((page) => page.page === over.id)
      return arrayMove(current, oldIndex, newIndex)
    })
  }

  const previewPage = previewIndex != null ? pages[previewIndex] : null

  const { pending, run } = useAsyncAction({
    action: async () => {
      const sourceDocumentId = activeVersionId ?? documentId

      return postJson<unknown>("/api/proxy/documents/edit_pdf/", {
        documents: [sourceDocumentId],
        operations: pages.map((page, index) => ({
          page: page.page,
          rotate: normalizeRotation(page.rotate),
          doc: computeDocIndex(pages, index),
        })),
        update_document: mode === "update",
        include_metadata: mode === "create" ? includeMetadata : true,
        delete_original: mode === "create" ? deleteOriginal : false,
        source_mode: "explicit_selection",
      })
    },
    errorMessage: "Failed to start PDF operation",
    onSuccess: () => {
      onOpenChange(false)
    },
    successMessage: `PDF operation for "${documentTitle}" will begin in the background.`,
  })

  return (
    <>
      <DraggableDialog open={open} onOpenChange={onOpenChange}>
        <DraggableDialogContent
          initialWidth={Math.min(980, viewportLimit.width)}
          initialHeight={Math.min(720, viewportLimit.height)}
          maxWidth={viewportLimit.width}
          maxHeight={viewportLimit.height}
        >
          <DraggableDialogHeader>
            <DraggableDialogTitle className="flex items-center gap-2">
              <Scissors className="h-4 w-4" />
              PDF Tools
            </DraggableDialogTitle>
            <DraggableDialogDescription>
              Reorder, rotate, delete, and split pages for{" "}
              <span className="font-medium text-foreground">{documentTitle}</span>.
            </DraggableDialogDescription>
          </DraggableDialogHeader>

          <DraggableDialogBody className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                <CheckCheck className="mr-2 h-3.5 w-3.5" />
                Select all
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasSelection}
                onClick={deselectAll}
              >
                <X className="mr-2 h-3.5 w-3.5" />
                Deselect
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasSelection}
                onClick={() => rotateSelected(-90)}
              >
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Rotate selected left
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasSelection}
                onClick={() => rotateSelected(90)}
              >
                <RotateCw className="mr-2 h-3.5 w-3.5" />
                Rotate selected right
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={!hasSelection}
                onClick={deleteSelected}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete selected
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">
                {pages.length} page{pages.length === 1 ? "" : "s"} · drag to reorder
              </span>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={pages.map((page) => page.page)}
                strategy={rectSortingStrategy}
              >
                <div className="flex flex-wrap items-start gap-3">
                  {pages.map((page, index) => (
                    <SortablePageCard
                      key={page.page}
                      item={page}
                      index={index}
                      thumbnailSrc={thumbnailSources[page.page]}
                      onOpenPreview={setPreviewIndex}
                      onToggleSelection={toggleSelection}
                      onRotate={rotatePage}
                      onDelete={removePage}
                      onToggleSplit={toggleSplit}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {pdfError && <p className="text-xs text-muted-foreground">{pdfError}</p>}

            <div className="space-y-3">
              <Label className="text-sm font-medium">Output</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={mode === "create" ? "default" : "outline"}
                  onClick={() => setMode("create")}
                >
                  <FilePlus2 className="mr-2 h-4 w-4" />
                  Create new document(s)
                </Button>
                <Button
                  type="button"
                  variant={mode === "update" ? "default" : "outline"}
                  disabled={hasSplit}
                  onClick={() => setMode("update")}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Add document version
                </Button>
              </div>
              {hasSplit && (
                <p className="text-xs text-muted-foreground">
                  Split operations require creating new document(s).
                </p>
              )}
            </div>

            {mode === "create" && (
              <div className="space-y-3 rounded-md border bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="pdf-copy-metadata"
                    checked={includeMetadata}
                    onCheckedChange={(checked) => setIncludeMetadata(checked === true)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="pdf-copy-metadata" className="text-sm font-medium">
                      Copy metadata
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Copy document metadata to the new document(s).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="pdf-delete-original"
                    checked={deleteOriginal}
                    onCheckedChange={(checked) => setDeleteOriginal(checked === true)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="pdf-delete-original" className="text-sm font-medium">
                      Delete original
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Delete the original document after the new document(s) are created.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeVersionId != null && (
              <p className="text-xs text-muted-foreground">
                The operation will use the currently previewed version.
              </p>
            )}
          </DraggableDialogBody>

          <DraggableDialogFooter className="items-center justify-between gap-2 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              These operations run in the background on the Paperless backend.
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={pending || pages.length < 1}
                onClick={() => void run()}
              >
                {pending ? "Starting..." : "Start"}
              </Button>
            </div>
          </DraggableDialogFooter>
        </DraggableDialogContent>
      </DraggableDialog>

      <DraggableDialog
        open={previewIndex != null}
        onOpenChange={(nextOpen) => !nextOpen && setPreviewIndex(null)}
      >
        <DraggableDialogContent
          initialWidth={viewportLimit.width}
          initialHeight={viewportLimit.height}
          maxWidth={viewportLimit.width}
          maxHeight={viewportLimit.height}
        >
          <DraggableDialogHeader>
            <DraggableDialogTitle>
              {previewPage ? `Page ${previewPage.page} preview` : "Page preview"}
            </DraggableDialogTitle>
            <DraggableDialogDescription>
              Full-width preview for the selected page.
            </DraggableDialogDescription>
          </DraggableDialogHeader>

          <DraggableDialogBody className="flex items-center justify-center p-4">
            {previewPage ? (
              <PdfPagePreview
                pdf={pdf}
                pageNumber={previewPage.page}
                rotation={normalizeRotation(previewPage.rotate)}
                maxWidth={viewportLimit.width}
                maxHeight={viewportLimit.height}
              />
            ) : (
              <div className="text-sm text-muted-foreground">Preview unavailable</div>
            )}
          </DraggableDialogBody>
        </DraggableDialogContent>
      </DraggableDialog>
    </>
  )
}
