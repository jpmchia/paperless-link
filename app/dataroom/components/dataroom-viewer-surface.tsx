"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { postJson } from "@/lib/paperless-client"
import { Button } from "@/components/ui/button"
import { DataroomPdfViewer } from "./dataroom-pdf-viewer"

type Props = {
  slug: string
}

type DataroomPublicDocument = {
  id: number
  title?: string
  created?: string
}

export function DataroomViewerSurface({ slug }: Props) {
  const router = useRouter()
  const [status, setStatus] = React.useState("Loading dataroom...")
  const [sessionToken, setSessionToken] = React.useState("")
  const [documents, setDocuments] = React.useState<DataroomPublicDocument[]>([])
  const [selectedDocumentID, setSelectedDocumentID] = React.useState<number | null>(null)

  React.useEffect(() => {
    const run = async () => {
      const token = window.sessionStorage.getItem("dataroom_session")
      if (!token) {
        router.replace(`/dataroom/${slug}`)
        return
      }
      try {
        await postJson("/api/link-iq/dataroom-public/validate-session", { token, slug })
        const documentsResult = await postJson<{ documents?: DataroomPublicDocument[] }>(
          "/api/link-iq/dataroom-public/documents",
          { token, slug },
        )
        const items = documentsResult.documents ?? []
        setDocuments(items)
        setSelectedDocumentID(items[0]?.id ?? null)
        setSessionToken(token)
        setStatus("")
      } catch {
        window.sessionStorage.removeItem("dataroom_session")
        router.replace(`/dataroom/${slug}`)
      }
    }
    void run()
  }, [router, slug])

  return (
    <section className="flex min-w-0 flex-1">
      <div className="w-96 shrink-0 border-r p-4">
        <h2 className="font-medium">Documents</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Select a published document to preview and download.
        </p>
        <div className="mt-4 max-h-[calc(100vh-220px)] space-y-2 overflow-auto">
          {documents.map((document) => (
            <button
              key={document.id}
              type="button"
              onClick={() => setSelectedDocumentID(document.id)}
              className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                selectedDocumentID === document.id ? "border-primary bg-accent/30" : "hover:bg-muted/40"
              }`}
            >
              <p className="truncate font-medium">{document.title || `Document ${document.id}`}</p>
              <p className="text-xs text-muted-foreground">
                #{document.id} {document.created ? `• ${document.created.slice(0, 10)}` : ""}
              </p>
            </button>
          ))}
        </div>
      </div>
      <div className="min-w-0 flex-1 p-4">
        {status ? (
          <p className="text-sm text-muted-foreground">{status}</p>
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedDocumentID ? `Previewing document #${selectedDocumentID}` : "No document selected"}
              </p>
              {selectedDocumentID ? (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={`/api/link-iq/dataroom-public/documents/${selectedDocumentID}/download?token=${encodeURIComponent(
                      sessionToken,
                    )}&slug=${encodeURIComponent(slug)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download
                  </a>
                </Button>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-md border">
              <DataroomPdfViewer
                slug={slug}
                sessionToken={sessionToken}
                documentId={selectedDocumentID}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
