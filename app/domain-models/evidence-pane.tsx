"use client"

import { AlertCircle, Link2, Loader2, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ExampleDocument } from "@/lib/link-iq-types"

type SummaryRow = {
  key: string
  label: string
  value: string
}

type Props = {
  boundExampleDocumentIDs: Set<string>
  exampleDocumentSearch: string
  exampleDocuments: ExampleDocument[]
  loadingExampleDocuments: boolean
  selectedExampleDocument: ExampleDocument | null
  selectedExampleDocumentID: string
  sourceID: string
  onExampleDocumentSearchChange: (value: string) => void
  onLoadExampleDocuments: () => void
  onSelectedExampleDocumentIDChange: (value: string) => void
  onToggleBoundExampleDocument: (document: ExampleDocument, checked: boolean) => void
  buildDocumentSummary: (document: ExampleDocument | null) => SummaryRow[]
  extractDocumentContent: (document: ExampleDocument | null) => string
}

export function DomainModelsEvidencePane({
  boundExampleDocumentIDs,
  buildDocumentSummary,
  exampleDocumentSearch,
  exampleDocuments,
  extractDocumentContent,
  loadingExampleDocuments,
  onExampleDocumentSearchChange,
  onLoadExampleDocuments,
  onSelectedExampleDocumentIDChange,
  onToggleBoundExampleDocument,
  selectedExampleDocument,
  selectedExampleDocumentID,
  sourceID,
}: Props) {
  return (
    <Card className="min-h-0 overflow-hidden">
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b p-4">
          <div className="text-sm font-medium">Example Document Evidence</div>
          <div className="text-[11px] text-muted-foreground">
            Validate the active context against real source documents.
          </div>
          <Input
            className="mt-3"
            placeholder="Filter examples"
            value={exampleDocumentSearch}
            onChange={(event) => onExampleDocumentSearchChange(event.target.value)}
          />
          <div className="mt-3 grid gap-2">
            <Label htmlFor="example-document-select">Example Document</Label>
            <Select
              value={selectedExampleDocumentID || "__none__"}
              onValueChange={(value) =>
                onSelectedExampleDocumentIDChange(value === "__none__" ? "" : value)
              }
            >
              <SelectTrigger id="example-document-select" className="w-full">
                <SelectValue placeholder="Choose example document" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Choose example document</SelectItem>
                {exampleDocuments.map((document) => (
                  <SelectItem key={document.document_id} value={document.document_id}>
                    {document.title || `Document ${document.document_id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadExampleDocuments}
              disabled={loadingExampleDocuments}
            >
              {loadingExampleDocuments ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCcw className="size-4" />
              )}
              Reload
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedExampleDocument}
              onClick={() =>
                selectedExampleDocument
                  ? onToggleBoundExampleDocument(
                      selectedExampleDocument,
                      !boundExampleDocumentIDs.has(selectedExampleDocument.document_id)
                    )
                  : undefined
              }
            >
              <Link2 className="size-4" />
              {selectedExampleDocument &&
              boundExampleDocumentIDs.has(selectedExampleDocument.document_id)
                ? "Unbind Example"
                : "Bind Example"}
            </Button>
            {selectedExampleDocument ? (
              <Button asChild variant="outline" size="sm">
                <a href={`/documents/${selectedExampleDocument.document_id}`}>
                  Open Document
                </a>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-4">
          {!selectedExampleDocumentID ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 text-center text-muted-foreground">
              <AlertCircle className="size-4" />
              <p>Select an example document to inspect the evidence payload.</p>
            </div>
          ) : !selectedExampleDocument ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 text-center text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <p>Loading example document…</p>
            </div>
          ) : (
            <Tabs defaultValue="summary" className="flex h-full min-h-0 flex-col overflow-hidden">
              <div className="mb-3">
                <div className="truncate text-sm font-medium">
                  {selectedExampleDocument.title ||
                    `Document ${selectedExampleDocument.document_id}`}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Source {selectedExampleDocument.source_id || sourceID}
                </div>
              </div>
              <TabsList variant="line" className="justify-start border-b p-0">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
              </TabsList>
              <div className="min-h-0 flex-1 overflow-hidden">
                <TabsContent value="summary" className="h-full overflow-y-auto px-1 py-3">
                  <div className="grid gap-3">
                    {buildDocumentSummary(selectedExampleDocument).map((row) => (
                      <div key={row.key} className="rounded-md border bg-background p-3">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {row.label}
                        </div>
                        <div className="mt-1 text-sm">{row.value}</div>
                      </div>
                    ))}
                    {buildDocumentSummary(selectedExampleDocument).length === 0 ? (
                      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                        No summary fields were available in the example payload.
                      </div>
                    ) : null}
                  </div>
                </TabsContent>
                <TabsContent value="content" className="h-full overflow-y-auto px-1 py-3">
                  <div className="rounded-md border bg-background p-3">
                    <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                      {extractDocumentContent(selectedExampleDocument) ||
                        "No OCR/content text was available in the example payload."}
                    </pre>
                  </div>
                </TabsContent>
                <TabsContent value="json" className="h-full overflow-y-auto px-1 py-3">
                  <div className="rounded-md border bg-background p-3">
                    <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                      {JSON.stringify(selectedExampleDocument.result ?? {}, null, 2)}
                    </pre>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </div>
    </Card>
  )
}
