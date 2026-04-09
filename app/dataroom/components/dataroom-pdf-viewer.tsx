"use client"

import * as React from "react"
import {
  type EmbedPdfContainer,
  PDFViewer,
  type PDFViewerRef,
  SpreadMode,
  ZoomMode,
} from "@embedpdf/react-pdf-viewer"

type Props = {
  slug: string
  sessionToken: string
  documentId?: number | null
}

export function DataroomPdfViewer({ slug, sessionToken, documentId }: Props) {
  const viewerRef = React.useRef<PDFViewerRef>(null)
  const densityObserverRef = React.useRef<MutationObserver | null>(null)
  const isEdgeBrowser = React.useMemo(() => {
    if (typeof navigator === "undefined") return false
    return /Edg\//.test(navigator.userAgent)
  }, [])

  const sourceUrl = React.useMemo(() => {
    if (!documentId) return ""
    const params = new URLSearchParams({
      token: sessionToken,
      slug,
    })
    return `/api/link-iq/dataroom-public/documents/${documentId}/preview?${params.toString()}`
  }, [documentId, sessionToken, slug])

  const viewerTheme = React.useMemo(
    () => ({
      preference: "system" as const,
      light: {
        background: { app: "var(--background)", surface: "var(--card)" },
        foreground: { primary: "var(--foreground)" },
        border: { default: "var(--border)" },
        accent: { primary: "var(--accent)", primaryForeground: "var(--accent-foreground)" },
      },
      dark: {
        background: { app: "var(--background)", surface: "var(--card)" },
        foreground: { primary: "var(--foreground)" },
        border: { default: "var(--border)" },
        accent: { primary: "var(--accent)", primaryForeground: "var(--accent-foreground)" },
      },
    }),
    [],
  )

  const viewerThemeForBrowser = React.useMemo(() => {
    if (!isEdgeBrowser) return viewerTheme
    return {
      ...viewerTheme,
      light: {
        ...viewerTheme.light,
      },
      dark: {
        ...viewerTheme.dark,
      },
    }
  }, [isEdgeBrowser, viewerTheme])

  const applyCompactViewerChrome = React.useCallback((viewer: EmbedPdfContainer | null) => {
    const shadowRoot = viewer?.shadowRoot
    if (!shadowRoot) return

    let compactStyle = shadowRoot.querySelector<HTMLStyleElement>("style[data-paperless-pdf-compact]")
    if (!compactStyle) {
      compactStyle = document.createElement("style")
      compactStyle.setAttribute("data-paperless-pdf-compact", "")
      shadowRoot.appendChild(compactStyle)
    }

    compactStyle.textContent = `
      .paperless-pdf-toolbar-row {
        min-height: 1.75rem !important;
        padding-block: 0 !important;
      }
      .paperless-pdf-toolbar-row button,
      .paperless-pdf-toolbar-row [role="button"],
      .paperless-pdf-toolbar-row input,
      .paperless-pdf-toolbar-row select {
        min-height: 1.75rem;
        font-size: 0.825rem;
      }
    `

    const documentContent = shadowRoot.getElementById("document-content")
    if (!documentContent) return
    let sibling = documentContent.previousElementSibling
    while (sibling) {
      sibling.classList.add("paperless-pdf-toolbar-row")
      sibling = sibling.previousElementSibling
    }
  }, [])

  React.useEffect(() => {
    return () => {
      densityObserverRef.current?.disconnect()
      densityObserverRef.current = null
    }
  }, [])

  if (!documentId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a document to preview.
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-hidden bg-background">
      <PDFViewer
        ref={viewerRef}
        className="h-full w-full"
        config={{
          src: sourceUrl,
          tabBar: "never",
          theme: viewerThemeForBrowser,
          permissions: {
            enforceDocumentPermissions: false,
          },
          render: {
            withForms: true,
            withAnnotations: true,
          },
          zoom: {
            defaultZoomLevel: ZoomMode.FitWidth,
          },
          spread: {
            defaultSpreadMode: SpreadMode.None,
          },
        }}
        onInit={(viewer) => {
          densityObserverRef.current?.disconnect()
          applyCompactViewerChrome(viewer)

          if (viewer.shadowRoot) {
            const observer = new MutationObserver(() => {
              applyCompactViewerChrome(viewer)
            })
            observer.observe(viewer.shadowRoot, { childList: true, subtree: true })
            densityObserverRef.current = observer
          }
        }}
      />
    </div>
  )
}

