import { Copy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { OpenDocumentLink } from "@/components/open-document-link"

interface DuplicateDocument {
  id: number
  title: string
  created?: string
  added?: string
}

interface DuplicatesTabProps {
  duplicates: DuplicateDocument[]
}

export function DuplicatesTab({ duplicates }: DuplicatesTabProps) {
  if (duplicates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground py-16">
        <Copy className="h-8 w-8 opacity-30" />
        <p className="text-sm">No duplicate documents detected.</p>
        <p className="text-xs text-center max-w-xs">
          Duplicates are identified by matching content checksums.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4 h-full overflow-y-auto">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium">Potential Duplicates</h4>
        <Badge variant="secondary" className="text-xs">{duplicates.length}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        These documents share the same content checksum as the current document.
      </p>
      <div className="space-y-2">
        {duplicates.map((doc) => (
          <div key={doc.id} className="rounded-lg border p-3 flex items-center justify-between gap-2 hover:bg-muted/30 transition-colors">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-medium truncate">{doc.title}</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>ID: {doc.id}</span>
                {doc.created && <span>Created: {new Date(doc.created).toLocaleDateString()}</span>}
              </div>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" asChild>
              <OpenDocumentLink documentId={doc.id} title={doc.title}>
                Open
              </OpenDocumentLink>
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
