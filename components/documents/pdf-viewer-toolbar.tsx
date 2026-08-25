"use client"

import * as React from "react"
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Search,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type PdfViewerToolbarProps = {
  searchOpen: boolean
  query: string
  currentResult: number
  totalResults: number
  onOpenSearch: () => void
  onCloseSearch: () => void
  onQueryChange: (query: string) => void
  onNext: () => void
  onPrevious: () => void
  onClear: () => void
  onFullscreen: () => void
  fullscreenActive?: boolean
}

export function PdfViewerToolbar({
  searchOpen,
  query,
  currentResult,
  totalResults,
  onOpenSearch,
  onCloseSearch,
  onQueryChange,
  onNext,
  onPrevious,
  onClear,
  onFullscreen,
  fullscreenActive = false,
}: PdfViewerToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-background/95 px-2 py-1.5">
      {!searchOpen ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onOpenSearch}
          aria-label="Search PDF"
        >
          <Search className="mr-1.5 h-3.5 w-3.5" />
          Search
        </Button>
      ) : (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Input
            role="searchbox"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Find in document…"
            className="h-8 max-w-xs"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault()
                onCloseSearch()
              }
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                onNext()
              }
              if (event.key === "Enter" && event.shiftKey) {
                event.preventDefault()
                onPrevious()
              }
            }}
          />
          <span className="text-xs text-muted-foreground tabular-nums">
            {totalResults > 0 ? `${currentResult} / ${totalResults}` : "0 / 0"}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onPrevious}
            aria-label="Previous result"
            disabled={totalResults === 0}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onNext}
            aria-label="Next result"
            disabled={totalResults === 0}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onClear}
            aria-label="Clear search"
          >
            Clear
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onCloseSearch}
            aria-label="Close search"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="ml-auto"
        onClick={onFullscreen}
        aria-label={fullscreenActive ? "Exit fullscreen" : "Enter fullscreen"}
      >
        <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
        Fullscreen
      </Button>
    </div>
  )
}
