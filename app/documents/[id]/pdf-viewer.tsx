"use client"

import * as React from "react"
import {
  type EmbedPdfContainer,
  PDFViewer,
  type PDFViewerRef,
  SpreadMode,
  ZoomMode,
  type PluginRegistry,
} from "@embedpdf/react-pdf-viewer"
import { useAtomValue, useSetAtom } from "jotai"
import {
  activeVersionIdAtom,
  pdfViewerPageCountAtom,
  pdfViewerPasswordAtom,
  pdfViewerRequiresPasswordAtom,
  pdfViewerRegistryAtom,
} from "@/lib/store"

interface PdfViewerProps {
  documentId: string | number
  totalPages?: number
}

type RegistryStoreState = {
  core?: {
    activeDocumentId?: string | null
    documents?: Record<
      string,
      {
        document?: {
          pageCount?: number
        } | null
      }
    >
  }
}

export function PdfViewer({ documentId, totalPages = 1 }: PdfViewerProps) {
  const activeVersionId = useAtomValue(activeVersionIdAtom)
  const setActiveVersionId = useSetAtom(activeVersionIdAtom)
  const viewerRef = React.useRef<PDFViewerRef>(null)
  const densityObserverRef = React.useRef<MutationObserver | null>(null)
  const setPdfPageCount = useSetAtom(pdfViewerPageCountAtom)
  const setPdfPassword = useSetAtom(pdfViewerPasswordAtom)
  const setPdfRequiresPassword = useSetAtom(pdfViewerRequiresPasswordAtom)
  const setPdfViewerRegistry = useSetAtom(pdfViewerRegistryAtom)
  const isEdgeBrowser = React.useMemo(() => {
    if (typeof navigator === "undefined") return false
    return /Edg\//.test(navigator.userAgent)
  }, [])

  const sourceUrl = React.useMemo(() => {
    const params = new URLSearchParams()
    if (activeVersionId != null) {
      params.set("version", String(activeVersionId))
    }
    const query = params.toString()
    return `/api/proxy/documents/${documentId}/preview/${query ? `?${query}` : ""}`
  }, [activeVersionId, documentId])

  const viewerTheme = React.useMemo(() => ({
    preference: "system" as const,
    light: {
      background: {
        app: "var(--background)",
        surface: "var(--card)",
        surfaceAlt: "var(--secondary)",
        elevated: "var(--popover)",
        overlay: "color-mix(in oklch, var(--foreground) 16%, transparent)",
        input: "var(--input)",
      },
      foreground: {
        primary: "var(--foreground)",
        secondary: "color-mix(in oklch, var(--foreground) 72%, transparent)",
        muted: "var(--muted-foreground)",
        disabled: "color-mix(in oklch, var(--muted-foreground) 60%, transparent)",
        onAccent: "var(--accent-foreground)",
      },
      border: {
        default: "var(--border)",
        subtle: "color-mix(in oklch, var(--border) 72%, transparent)",
        strong: "color-mix(in oklch, var(--foreground) 20%, var(--border))",
      },
      accent: {
        primary: "var(--accent)",
        primaryHover: "color-mix(in oklch, var(--accent) 88%, black)",
        primaryActive: "color-mix(in oklch, var(--accent) 78%, black)",
        primaryLight: "color-mix(in oklch, var(--accent) 18%, transparent)",
        primaryForeground: "var(--accent-foreground)",
      },
      interactive: {
        hover: "color-mix(in oklch, var(--secondary) 78%, var(--foreground) 6%)",
        active: "color-mix(in oklch, var(--secondary) 68%, var(--foreground) 10%)",
        selected: "color-mix(in oklch, var(--accent) 14%, transparent)",
        focus: "var(--ring)",
        focusRing: "color-mix(in oklch, var(--ring) 38%, transparent)",
      },
      state: {
        error: "var(--destructive)",
        errorLight: "color-mix(in oklch, var(--destructive) 14%, transparent)",
        warning: "oklch(0.74 0.16 76)",
        warningLight: "color-mix(in oklch, oklch(0.74 0.16 76) 14%, transparent)",
        success: "var(--primary)",
        successLight: "color-mix(in oklch, var(--primary) 14%, transparent)",
        info: "oklch(0.62 0.19 255)",
        infoLight: "color-mix(in oklch, oklch(0.62 0.19 255) 14%, transparent)",
      },
      scrollbar: {
        track: "color-mix(in oklch, var(--secondary) 80%, transparent)",
        thumb: "color-mix(in oklch, var(--muted-foreground) 45%, transparent)",
        thumbHover: "color-mix(in oklch, var(--foreground) 28%, transparent)",
      },
      tooltip: {
        background: "var(--popover)",
        foreground: "var(--popover-foreground)",
      },
    },
    dark: {
      background: {
        app: "var(--background)",
        surface: "var(--card)",
        surfaceAlt: "var(--secondary)",
        elevated: "var(--popover)",
        overlay: "color-mix(in oklch, black 42%, transparent)",
        input: "var(--input)",
      },
      foreground: {
        primary: "var(--foreground)",
        secondary: "color-mix(in oklch, var(--foreground) 76%, transparent)",
        muted: "var(--muted-foreground)",
        disabled: "color-mix(in oklch, var(--muted-foreground) 62%, transparent)",
        onAccent: "var(--accent-foreground)",
      },
      border: {
        default: "var(--border)",
        subtle: "color-mix(in oklch, var(--border) 78%, transparent)",
        strong: "color-mix(in oklch, var(--foreground) 22%, var(--border))",
      },
      accent: {
        primary: "var(--accent)",
        primaryHover: "color-mix(in oklch, var(--accent) 86%, white)",
        primaryActive: "color-mix(in oklch, var(--accent) 74%, black)",
        primaryLight: "color-mix(in oklch, var(--accent) 20%, transparent)",
        primaryForeground: "var(--accent-foreground)",
      },
      interactive: {
        hover: "color-mix(in oklch, var(--secondary) 82%, white 6%)",
        active: "color-mix(in oklch, var(--secondary) 72%, white 10%)",
        selected: "color-mix(in oklch, var(--accent) 18%, transparent)",
        focus: "var(--ring)",
        focusRing: "color-mix(in oklch, var(--ring) 42%, transparent)",
      },
      state: {
        error: "var(--destructive)",
        errorLight: "color-mix(in oklch, var(--destructive) 18%, transparent)",
        warning: "oklch(0.8 0.15 84)",
        warningLight: "color-mix(in oklch, oklch(0.8 0.15 84) 18%, transparent)",
        success: "var(--primary)",
        successLight: "color-mix(in oklch, var(--primary) 18%, transparent)",
        info: "oklch(0.7 0.15 246)",
        infoLight: "color-mix(in oklch, oklch(0.7 0.15 246) 18%, transparent)",
      },
      scrollbar: {
        track: "color-mix(in oklch, var(--secondary) 84%, transparent)",
        thumb: "color-mix(in oklch, var(--muted-foreground) 50%, transparent)",
        thumbHover: "color-mix(in oklch, var(--foreground) 34%, transparent)",
      },
      tooltip: {
        background: "var(--popover)",
        foreground: "var(--popover-foreground)",
      },
    },
  }), [])

  const viewerThemeForBrowser = React.useMemo(() => {
    if (!isEdgeBrowser) return viewerTheme
    // Edge occasionally fails PDF viewer init with advanced color-mix values.
    // Use conservative CSS variables only on Edge to keep initialization stable.
    return {
      preference: "system" as const,
      light: {
        background: {
          app: "var(--background)",
          surface: "var(--card)",
          surfaceAlt: "var(--secondary)",
          elevated: "var(--popover)",
          overlay: "rgba(0,0,0,0.12)",
          input: "var(--input)",
        },
        foreground: {
          primary: "var(--foreground)",
          secondary: "var(--muted-foreground)",
          muted: "var(--muted-foreground)",
          disabled: "var(--muted-foreground)",
          onAccent: "var(--accent-foreground)",
        },
        border: {
          default: "var(--border)",
          subtle: "var(--border)",
          strong: "var(--border)",
        },
        accent: {
          primary: "var(--accent)",
          primaryHover: "var(--accent)",
          primaryActive: "var(--accent)",
          primaryLight: "var(--accent)",
          primaryForeground: "var(--accent-foreground)",
        },
      },
      dark: {
        background: {
          app: "var(--background)",
          surface: "var(--card)",
          surfaceAlt: "var(--secondary)",
          elevated: "var(--popover)",
          overlay: "rgba(0,0,0,0.35)",
          input: "var(--input)",
        },
        foreground: {
          primary: "var(--foreground)",
          secondary: "var(--muted-foreground)",
          muted: "var(--muted-foreground)",
          disabled: "var(--muted-foreground)",
          onAccent: "var(--accent-foreground)",
        },
        border: {
          default: "var(--border)",
          subtle: "var(--border)",
          strong: "var(--border)",
        },
        accent: {
          primary: "var(--accent)",
          primaryHover: "var(--accent)",
          primaryActive: "var(--accent)",
          primaryLight: "var(--accent)",
          primaryForeground: "var(--accent-foreground)",
        },
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

      .paperless-pdf-toolbar-row button,
      .paperless-pdf-toolbar-row [role="button"] {
        padding-block: 0.1rem;
      }

      .paperless-pdf-toolbar-row svg {
        width: 0.825rem;
        height: 0.825rem;
      }

      .paperless-pdf-toolbar-row input {
        padding-block: 0.05rem;
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
    setActiveVersionId(null)
  }, [documentId, setActiveVersionId])

  React.useEffect(() => {
    setPdfPageCount(totalPages)
    setPdfPassword("")
    setPdfRequiresPassword(false)
    setPdfViewerRegistry(null)

    return () => {
      densityObserverRef.current?.disconnect()
      densityObserverRef.current = null
      setPdfPassword("")
      setPdfRequiresPassword(false)
      setPdfViewerRegistry(null)
    }
  }, [
    setPdfPageCount,
    setPdfPassword,
    setPdfRequiresPassword,
    setPdfViewerRegistry,
    totalPages,
  ])

  const syncPageCount = React.useCallback(
    (registry: PluginRegistry) => {
      const store = registry.getStore()

      const applyPageCount = (state: RegistryStoreState) => {
        const activeDocumentId = state.core?.activeDocumentId
        if (!activeDocumentId) return

        const loadedPageCount = state.core?.documents?.[activeDocumentId]?.document?.pageCount
        if (typeof loadedPageCount === "number" && loadedPageCount > 0) {
          setPdfPageCount(loadedPageCount)
        }
      }

      applyPageCount(store.getState() as RegistryStoreState)
      return store.subscribe((_action, nextState) => {
        applyPageCount(nextState as RegistryStoreState)
      })
    },
    [setPdfPageCount]
  )

  React.useEffect(() => {
    let unsubscribe: (() => void) | undefined

    void viewerRef.current?.registry?.then((registry) => {
      unsubscribe = syncPageCount(registry)
    })

    return () => {
      unsubscribe?.()
    }
  }, [sourceUrl, syncPageCount])

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
            defaultSpreadMode: totalPages > 1 ? SpreadMode.Odd : SpreadMode.None,
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
        onReady={(registry) => {
          setPdfViewerRegistry(registry)
          syncPageCount(registry)
        }}
      />
    </div>
  )
}
