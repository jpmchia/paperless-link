"use client"

import * as React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import {
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
  type RenderTask,
  GlobalWorkerOptions,
  PasswordResponses,
  TextLayer,
  getDocument,
} from "pdfjs-dist/legacy/build/pdf.mjs"
import {
  activeVersionIdAtom,
  pdfViewerPasswordAtom,
  pdfViewerRequiresPasswordAtom,
} from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns2,
  ExternalLink,
  RectangleHorizontal,
  ZoomIn,
  ZoomOut,
} from "lucide-react"

if (typeof window !== "undefined" && !GlobalWorkerOptions.workerSrc) {
  GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString()
}

interface PdfViewerProps {
  documentId: string | number
  totalPages?: number
}

type ZoomValue = "page-fit" | "page-width" | "50" | "75" | "100" | "125" | "150" | "200"
type SpreadMode = "single" | "two-up"

const ZOOM_LEVELS: Array<{ label: string; value: ZoomValue }> = [
  { label: "Fit page", value: "page-fit" },
  { label: "Fit width", value: "page-width" },
  { label: "50%", value: "50" },
  { label: "75%", value: "75" },
  { label: "100%", value: "100" },
  { label: "125%", value: "125" },
  { label: "150%", value: "150" },
  { label: "200%", value: "200" },
]

const NUMERIC_ZOOM_STEPS = [50, 75, 100, 125, 150, 200]

function useElementSize<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null)
  const [size, setSize] = React.useState({ width: 0, height: 0 })

  React.useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })

    observer.observe(element)
    setSize({
      width: element.clientWidth,
      height: element.clientHeight,
    })

    return () => observer.disconnect()
  }, [])

  return [ref, size] as const
}

function getMaxSpreadPage(totalPages: number) {
  return totalPages % 2 === 0 ? Math.max(1, totalPages - 1) : totalPages
}

function normalizeSpreadPage(page: number, totalPages: number) {
  const oddPage = page % 2 === 0 ? page - 1 : page
  return Math.min(Math.max(1, oddPage), getMaxSpreadPage(totalPages))
}

function PdfPageCanvas({
  pdf,
  pageNumber,
  zoom,
  constrainProportions,
}: {
  pdf: PDFDocumentProxy
  pageNumber: number
  zoom: ZoomValue
  constrainProportions: boolean
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const textLayerRef = React.useRef<HTMLDivElement | null>(null)
  const [containerRef, size] = useElementSize<HTMLDivElement>()
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [stretchScale, setStretchScale] = React.useState<{ x: number; y: number } | null>(null)
  const [surfaceSize, setSurfaceSize] = React.useState<{ width: number; height: number } | null>(null)
  const hasRenderedSurfaceRef = React.useRef(false)

  React.useEffect(() => {
    let cancelled = false
    let activeTask: RenderTask | null = null
    let activeTextLayer: TextLayer | null = null

    async function renderPage() {
      if (!canvasRef.current || !textLayerRef.current || size.width <= 0) return

      setLoading(!hasRenderedSurfaceRef.current)
      setError(null)
      setStretchScale(null)

      try {
        const page = await pdf.getPage(pageNumber)
        if (cancelled || !canvasRef.current || !textLayerRef.current) return

        const unscaledViewport = page.getViewport({ scale: 1 })
        const availableWidth = Math.max(size.width - 2, 160)
        const availableHeight = Math.max(size.height - 2, 240)

        const widthScale = availableWidth / unscaledViewport.width
        const heightScale = availableHeight / unscaledViewport.height

        let scale = 1

        if (zoom === "page-width") {
          scale = widthScale
        } else if (zoom === "page-fit") {
          if (constrainProportions) {
            scale = Math.min(widthScale, heightScale)
          } else {
            scale = Math.min(widthScale, heightScale)
          }
        } else {
          scale = Number(zoom) / 100
        }

        const viewport = page.getViewport({ scale })
        const outputScale = window.devicePixelRatio || 1
        const canvas = canvasRef.current
        const textLayer = textLayerRef.current
        const context = canvas.getContext("2d")

        if (!context) {
          throw new Error("Canvas rendering context unavailable")
        }

        textLayer.replaceChildren()
        textLayer.style.width = `${Math.ceil(viewport.width)}px`
        textLayer.style.height = `${Math.ceil(viewport.height)}px`
        textLayer.style.setProperty("--total-scale-factor", `${viewport.scale}`)

        canvas.width = Math.ceil(viewport.width * outputScale)
        canvas.height = Math.ceil(viewport.height * outputScale)
        canvas.style.width = `${Math.ceil(viewport.width)}px`
        canvas.style.height = `${Math.ceil(viewport.height)}px`
        canvas.style.transform = ""

        context.setTransform(outputScale, 0, 0, outputScale, 0, 0)
        context.clearRect(0, 0, viewport.width, viewport.height)

        activeTask = page.render({
          canvasContext: context,
          canvas,
          viewport,
        })

        await activeTask.promise

        activeTextLayer = new TextLayer({
          textContentSource: page.streamTextContent({
            includeMarkedContent: true,
            disableNormalization: true,
          }),
          container: textLayer,
          viewport,
        })

        await activeTextLayer.render()

        const endOfContent = document.createElement("div")
        endOfContent.className = "endOfContent"
        textLayer.append(endOfContent)

        if (!cancelled) {
          hasRenderedSurfaceRef.current = true
          setSurfaceSize({
            width: Math.ceil(viewport.width),
            height: Math.ceil(viewport.height),
          })
          if (zoom === "page-fit" && !constrainProportions) {
            const renderedWidth = Math.max(viewport.width, 1)
            const renderedHeight = Math.max(viewport.height, 1)
            setStretchScale({
              x: availableWidth / renderedWidth,
              y: availableHeight / renderedHeight,
            })
          } else {
            setStretchScale(null)
          }
          setLoading(false)
        }
      } catch (renderError) {
        if (cancelled) return
        setLoading(false)
        setError(renderError instanceof Error ? renderError.message : "Failed to render page")
      }
    }

    void renderPage()

    return () => {
      cancelled = true
      activeTask?.cancel()
      activeTextLayer?.cancel()
    }
  }, [constrainProportions, pageNumber, pdf, size.height, size.width, zoom])

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-h-[18rem] w-full items-center justify-center overflow-hidden rounded-md border bg-background/80 p-px"
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Rendering page {pageNumber}…
        </div>
      )}
      {error ? (
        <div className="flex h-full items-center justify-center text-center text-sm text-destructive">
          {error}
        </div>
      ) : (
        <div
          className="pdf-page-layer relative shrink-0 h-full"
          style={
            surfaceSize
              ? {
                  width: `${surfaceSize.width}px`,
                  height: `${surfaceSize.height}px`,
                  transform: stretchScale
                    ? `scale(${stretchScale.x}, ${stretchScale.y})`
                    : undefined,
                  transformOrigin: "center center",
                }
              : undefined
          }
        >
          <canvas
            ref={canvasRef}
            className="block max-w-none h-full"
            aria-label={`PDF page ${pageNumber}`}
          />
          <div ref={textLayerRef} className="pdf-text-layer textLayer" aria-hidden="true" />
        </div>
      )}
    </div>
  )
}

export function PdfViewer({ documentId, totalPages = 1 }: PdfViewerProps) {
  const activeVersionId = useAtomValue(activeVersionIdAtom)
  const [zoom, setZoom] = React.useState<ZoomValue>("page-width")
  const [constrainProportions, setConstrainProportions] = React.useState(true)
  const [spreadMode, setSpreadMode] = React.useState<SpreadMode>(
    totalPages > 1 ? "two-up" : "single"
  )
  const [page, setPage] = React.useState(1)
  const [pdf, setPdf] = React.useState<PDFDocumentProxy | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [passwordValue, setPasswordValue] = React.useState("")
  const [passwordMessage, setPasswordMessage] = React.useState<string | null>(null)
  const [passwordRequired, setPasswordRequired] = React.useState(false)
  const [copyingText, setCopyingText] = React.useState(false)
  const [viewerRef] = useElementSize<HTMLDivElement>()
  const passwordCallbackRef = React.useRef<((password: string) => void) | null>(null)
  const currentPasswordRef = React.useRef("")
  const setPdfPassword = useSetAtom(pdfViewerPasswordAtom)
  const setPdfRequiresPassword = useSetAtom(pdfViewerRequiresPasswordAtom)

  const sourceUrl = React.useMemo(() => {
    const versionSuffix = activeVersionId != null ? `?version=${activeVersionId}` : ""
    return `/api/proxy/documents/${documentId}/preview/${versionSuffix}`
  }, [activeVersionId, documentId])

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setPasswordRequired(false)
    setPasswordMessage(null)
    setPasswordValue("")
    setPdf(null)
    setPage(1)
    setPdfPassword("")
    setPdfRequiresPassword(false)
    currentPasswordRef.current = ""

    const task: PDFDocumentLoadingTask = getDocument({
      url: sourceUrl,
      withCredentials: false,
    })

    task.onPassword = (
      callback: (password: string) => void,
      reason: number
    ) => {
      passwordCallbackRef.current = callback
      setPasswordRequired(true)
      setLoading(false)
      setPdfRequiresPassword(true)
      setPdfPassword("")
      setPasswordMessage(
        reason === PasswordResponses.INCORRECT_PASSWORD
          ? "Incorrect password. Please try again."
          : "This PDF is password protected."
      )
    }

    void task.promise
      .then((nextPdf) => {
        if (cancelled) return
        setPdf(nextPdf)
        setLoading(false)
        setPasswordRequired(false)
        setPasswordMessage(null)
        setPdfRequiresPassword(false)
        setPdfPassword(currentPasswordRef.current)
        if (nextPdf.numPages > 1) {
          setSpreadMode((current) => (current === "single" ? current : "two-up"))
        } else {
          setSpreadMode("single")
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoading(false)
        setPdf(null)
        if (!passwordCallbackRef.current) {
          setLoadError(error instanceof Error ? error.message : "Failed to load PDF preview")
        }
      })

    return () => {
      cancelled = true
      void task.destroy()
    }
  }, [setPdfPassword, setPdfRequiresPassword, sourceUrl])

  const pageCount = pdf?.numPages ?? totalPages

  React.useEffect(() => {
    if (spreadMode === "two-up") {
      setPage((current) => normalizeSpreadPage(current, pageCount))
    } else {
      setPage((current) => Math.min(Math.max(1, current), pageCount))
    }
  }, [pageCount, spreadMode])

  const displayedPages = React.useMemo(() => {
    if (spreadMode === "single") {
      return [page]
    }

    const leftPage = normalizeSpreadPage(page, pageCount)
    const pages = [leftPage]
    if (leftPage + 1 <= pageCount) {
      pages.push(leftPage + 1)
    }
    return pages
  }, [page, pageCount, spreadMode])

  const canGoPrevious = spreadMode === "single" ? page > 1 : page > 1
  const canGoNext =
    spreadMode === "single"
      ? page < pageCount
      : normalizeSpreadPage(page, pageCount) < getMaxSpreadPage(pageCount)

  const goPrevious = () => {
    setPage((current) => {
      if (spreadMode === "single") {
        return Math.max(1, current - 1)
      }
      return Math.max(1, normalizeSpreadPage(current, pageCount) - 2)
    })
  }

  const goNext = () => {
    setPage((current) => {
      if (spreadMode === "single") {
        return Math.min(pageCount, current + 1)
      }
      return Math.min(
        getMaxSpreadPage(pageCount),
        normalizeSpreadPage(current, pageCount) + 2
      )
    })
  }

  const zoomIn = () => {
    const currentNum = parseInt(zoom, 10)
    if (!Number.isNaN(currentNum)) {
      const next = NUMERIC_ZOOM_STEPS.find((level) => level > currentNum)
      if (next) {
        setZoom(String(next) as ZoomValue)
      }
      return
    }
    setZoom("100")
  }

  const zoomOut = () => {
    const currentNum = parseInt(zoom, 10)
    if (!Number.isNaN(currentNum)) {
      const prev = [...NUMERIC_ZOOM_STEPS].reverse().find((level) => level < currentNum)
      if (prev) {
        setZoom(String(prev) as ZoomValue)
      }
      return
    }
    setZoom("100")
  }

  const currentZoomLabel = ZOOM_LEVELS.find((item) => item.value === zoom)?.label ?? `${zoom}%`
  const isNumericZoom = !Number.isNaN(parseInt(zoom, 10))
  const currentNumericZoom = parseInt(zoom, 10)
  const canZoomIn =
    !isNumericZoom || currentNumericZoom < NUMERIC_ZOOM_STEPS[NUMERIC_ZOOM_STEPS.length - 1]
  const canZoomOut = !isNumericZoom || currentNumericZoom > NUMERIC_ZOOM_STEPS[0]

  const handlePasswordSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!passwordCallbackRef.current || passwordValue.trim().length === 0) return
    setLoading(true)
    setPasswordRequired(false)
    currentPasswordRef.current = passwordValue.trim()
    passwordCallbackRef.current(passwordValue)
  }

  const handleCopyText = async () => {
    if (!pdf || copyingText) return

    setCopyingText(true)
    try {
      const chunks: string[] = []

      for (let index = 1; index <= pdf.numPages; index += 1) {
        const pdfPage = await pdf.getPage(index)
        const textContent = await pdfPage.getTextContent({
          includeMarkedContent: true,
          disableNormalization: true,
        })

        const pageText = textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim()

        if (pageText.length > 0) {
          chunks.push(pageText)
        }
      }

      const text = chunks.join("\n\n")
      if (!text) {
        toast.error("No selectable text found in this PDF")
        return
      }

      await navigator.clipboard.writeText(text)
      toast.success("Document text copied")
    } catch (error) {
      toast.error("Failed to copy text", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setCopyingText(false)
    }
  }

  const startPage = displayedPages[0] ?? 1
  const endPage = displayedPages[displayedPages.length - 1] ?? startPage
  const usesFixedPaneHeight = zoom === "page-fit"

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b bg-background px-2 py-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={!canGoPrevious}
          onClick={goPrevious}
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="min-w-[72px] text-center text-xs tabular-nums text-muted-foreground">
          {spreadMode === "two-up" && pageCount > 1
            ? `${startPage}-${endPage} / ${pageCount}`
            : `${page} / ${pageCount}`}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={!canGoNext}
          onClick={goNext}
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <div className="mx-1 h-4 w-px bg-border" />

        <Button
          variant={spreadMode === "single" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          title="Single page view"
          onClick={() => setSpreadMode("single")}
        >
          <RectangleHorizontal className="h-4 w-4" />
        </Button>
        <Button
          variant={spreadMode === "two-up" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          title="Two-page view"
          disabled={pageCount <= 1}
          onClick={() => setSpreadMode("two-up")}
        >
          <Columns2 className="h-4 w-4" />
        </Button>

        <div className="mx-1 h-4 w-px bg-border" />

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={zoomOut}
          disabled={!canZoomOut}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 min-w-[96px] gap-1 px-2 text-xs">
              {currentZoomLabel}
              <ChevronDown className="h-3 w-3 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            {ZOOM_LEVELS.map((level) => (
              <DropdownMenuItem
                key={level.value}
                onClick={() => setZoom(level.value)}
                className={zoom === level.value ? "bg-accent" : ""}
              >
                {level.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={constrainProportions}
              onCheckedChange={(checked) => setConstrainProportions(checked === true)}
            >
              Constrain proportions
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={zoomIn}
          disabled={!canZoomIn}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        {activeVersionId != null && (
          <Badge variant="outline" className="h-6 border-amber-400 px-2 text-xs text-amber-600">
            Version preview
          </Badge>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleCopyText}
          disabled={!pdf || loading || passwordRequired || copyingText}
          title="Copy parsed document text"
        >
          {copyingText ? "Copying…" : "Copy text"}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Open in native viewer (new tab)"
          asChild
        >
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>

      <div
        ref={viewerRef}
        className="min-h-0 flex-1 overflow-auto bg-muted/20 p-1"
        style={{ scrollbarGutter: "stable both-edges" }}
      >
        {loading && !passwordRequired && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading PDF preview…
          </div>
        )}

        {passwordRequired && (
          <div className="mx-auto flex max-w-md flex-col gap-4 rounded-lg border bg-background p-6 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Password required</h3>
              <p className="text-sm text-muted-foreground">
                {passwordMessage ?? "Enter the document password to view this PDF."}
              </p>
            </div>

            <form className="flex items-center gap-2" onSubmit={handlePasswordSubmit}>
              <Input
                autoFocus
                type="password"
                placeholder="Enter password"
                value={passwordValue}
                onChange={(event) => setPasswordValue(event.target.value)}
              />
              <Button type="submit" disabled={passwordValue.trim().length === 0}>
                Unlock
              </Button>
            </form>
          </div>
        )}

        {!loading && !passwordRequired && loadError && (
          <div className="flex h-full items-center justify-center text-sm text-destructive">
            {loadError}
          </div>
        )}

        {!loading && !passwordRequired && !loadError && pdf && (
          <div
            className={
              spreadMode === "two-up" && displayedPages.length > 1
                ? `${usesFixedPaneHeight ? "h-full" : "min-h-full"} grid w-full items-stretch content-start gap-1 xl:grid-cols-2`
                : `mx-auto flex w-full items-stretch ${usesFixedPaneHeight ? "h-full" : "min-h-full"}`
            }
          >
            {displayedPages.map((pageNumber) => (
              <div
                key={`${activeVersionId ?? "latest"}-${pageNumber}-${zoom}-${spreadMode}`}
                className={usesFixedPaneHeight ? "h-full min-h-0 w-full" : "w-full"}
              >
                <PdfPageCanvas
                  pdf={pdf}
                  pageNumber={pageNumber}
                  zoom={zoom}
                  constrainProportions={constrainProportions}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
