import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

function formatFileSize(bytes?: number) {
  if (bytes === undefined || bytes === null) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatDate(dateString?: string) {
  if (!dateString) return "Unknown"
  const d = new Date(dateString)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function MetadataTab({ metadata, document }: { metadata: any, document: any }) {
  if (!metadata) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-muted-foreground">
        No metadata available for this document.
      </div>
    )
  }

  const renderSimpleRow = (label: string, value: any) => {
    if (value === null || value === undefined) return null
    return (
      <div className="flex flex-col sm:flex-row py-2 text-sm">
        <div className="w-1/3 text-muted-foreground font-medium pr-4">{label}</div>
        <div className="w-2/3 text-foreground break-all">{String(value)}</div>
      </div>
    )
  }
  
  const renderArchivedMetadata = (data: any) => {
    if (!data || Object.keys(data).length === 0) return null
    
    if (Array.isArray(data)) {
        return (
          <div className="space-y-1">
            {data.map((item, i) => {
              if (typeof item === 'object' && item !== null) {
                 const obj = item as any
                 const keyStr = obj.prefix ? `${obj.prefix}:${obj.key}` : obj.key || `Item ${i}`
                 const valStr = obj.value !== undefined ? String(obj.value) : JSON.stringify(obj)
                 return (
                  <div key={i} className="flex flex-col sm:flex-row py-1.5 text-sm">
                    <div className="w-1/3 text-muted-foreground font-medium pr-4 break-all">{keyStr}</div>
                    <div className="w-2/3 text-foreground break-all">{valStr}</div>
                  </div>
                )
              }
              return (
                <div key={i} className="py-1.5 text-sm w-full break-all">{String(item)}</div>
              )
            })}
          </div>
        )
    }

    return (
      <div className="space-y-1">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex flex-col sm:flex-row py-1.5 text-sm">
            <div className="w-1/3 text-muted-foreground font-medium pr-4 break-all">{key}</div>
            <div className="w-2/3 text-foreground break-all">{String(value)}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="px-6 py-6 pb-20 max-w-4xl space-y-2">
        
        {renderSimpleRow("Date modified", formatDate(document?.modified))}
        {renderSimpleRow("Date added", formatDate(document?.added))}
        {renderSimpleRow("Media filename", metadata.media_filename)}
        
        <div className="py-2" /> {/* Spacer */}
        
        {renderSimpleRow("Original filename", metadata.original_filename)}
        {renderSimpleRow("Original MD5 checksum", metadata.original_checksum)}
        {renderSimpleRow("Original file size", formatFileSize(metadata.original_size))}
        {renderSimpleRow("Original mime type", metadata.original_mime_type)}
        
        <div className="py-2" /> {/* Spacer */}

        {metadata.has_archive_version && (
          <>
            {renderSimpleRow("Archive MD5 checksum", metadata.archive_checksum)}
            {renderSimpleRow("Archive file size", formatFileSize(metadata.archive_size))}
            
            {metadata.archive_metadata && Object.keys(metadata.archive_metadata).length > 0 && (
              <div className="mt-6">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="archived-metadata" className="border-none">
                    <AccordionTrigger className="hover:no-underline rounded-md px-4 py-2 bg-muted/20 text-sm font-semibold justify-start gap-4">
                      Archived document metadata
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 px-2">
                      {renderArchivedMetadata(metadata.archive_metadata)}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
            
            {/* Fallback to original metadata/media_info if no archive_metadata */}
            {!metadata.archive_metadata && metadata.media_info && Object.keys(metadata.media_info).length > 0 && (
              <div className="mt-6">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="media-info" className="border-none">
                    <AccordionTrigger className="hover:no-underline rounded-md px-4 py-2 bg-muted/20 text-sm font-semibold justify-start gap-4">
                      Document media info
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 px-2">
                      {renderArchivedMetadata(metadata.media_info)}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </>
        )}
      </div>
    </ScrollArea>
  )
}
