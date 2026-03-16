"use client"

import * as React from "react"
import { useAtomValue } from "jotai"
import { activeVersionIdAtom } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, ExternalLink, ChevronDown } from "lucide-react"

interface PdfViewerProps {
  documentId: string | number
  totalPages?: number
}

const ZOOM_LEVELS = [
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

export function PdfViewer({ documentId, totalPages = 1 }: PdfViewerProps) {
  const [zoom, setZoom] = React.useState("page-width")
  const [page, setPage] = React.useState(1)
  const activeVersionId = useAtomValue(activeVersionIdAtom)

  const versionSuffix = activeVersionId != null ? `?version=${activeVersionId}` : ""
  // key forces iframe reload when page, zoom, or version changes
  const iframeKey = `${page}-${zoom}-${activeVersionId ?? "latest"}`
  const iframeSrc = `/api/proxy/documents/${documentId}/preview/${versionSuffix}#page=${page}&zoom=${zoom}&toolbar=0`

  const zoomIn = () => {
    const currentNum = parseInt(zoom)
    if (!isNaN(currentNum)) {
      const next = NUMERIC_ZOOM_STEPS.find((l) => l > currentNum)
      if (next) setZoom(String(next))
    } else {
      setZoom("100")
    }
  }

  const zoomOut = () => {
    const currentNum = parseInt(zoom)
    if (!isNaN(currentNum)) {
      const prev = [...NUMERIC_ZOOM_STEPS].reverse().find((l) => l < currentNum)
      if (prev) setZoom(String(prev))
    } else {
      setZoom("100")
    }
  }

  const isNumericZoom = !isNaN(parseInt(zoom))
  const currentNum = parseInt(zoom)
  const canZoomIn = !isNumericZoom || currentNum < NUMERIC_ZOOM_STEPS[NUMERIC_ZOOM_STEPS.length - 1]
  const canZoomOut = !isNumericZoom || currentNum > NUMERIC_ZOOM_STEPS[0]

  const currentZoomLabel = ZOOM_LEVELS.find((z) => z.value === zoom)?.label ?? `${zoom}%`

  return (
    <div className="flex flex-col h-full w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b bg-background px-2 py-1 flex-shrink-0">
        {/* Page navigation */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground min-w-[56px] text-center tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <div className="h-4 w-px bg-border mx-1" />

        {/* Zoom controls */}
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
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 min-w-[88px]">
              {currentZoomLabel}
              <ChevronDown className="h-3 w-3 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            {ZOOM_LEVELS.map((z) => (
              <DropdownMenuItem
                key={z.value}
                onClick={() => setZoom(z.value)}
                className={zoom === z.value ? "bg-accent" : ""}
              >
                {z.label}
              </DropdownMenuItem>
            ))}
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
          <Badge variant="outline" className="h-6 text-xs px-2 text-amber-600 border-amber-400">
            Version preview
          </Badge>
        )}

        {/* Open in native viewer */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Open in native viewer (new tab)"
          asChild
        >
          <a
            href={`/api/proxy/documents/${documentId}/preview/${versionSuffix}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>

      {/* PDF iframe */}
      <div className="flex-1 min-h-0 bg-muted/20">
        <iframe
          key={iframeKey}
          src={iframeSrc}
          className="w-full h-full border-0"
          title="Document preview"
        />
      </div>
    </div>
  )
}
