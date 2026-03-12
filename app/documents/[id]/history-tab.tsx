import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return `Just now`
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`
  const diffInYears = Math.floor(diffInDays / 365)
  return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`
}

export function HistoryTab({ history = [], documentTypes = [], correspondents = [], storagePaths = [], tagsList = [] }: { history: any[], documentTypes?: any[], correspondents?: any[], storagePaths?: any[], tagsList?: any[] }) {
  const getLookupName = (field: string, id: any) => {
    if (typeof id !== 'number' && typeof id !== 'string') return null;
    let list: any[] = []
    if (field === 'document_type') list = documentTypes
    else if (field === 'correspondent') list = correspondents
    else if (field === 'storage_path') list = storagePaths
    else if (field === 'tags') list = tagsList
    
    const found = list.find(item => Number(item.id) === Number(id))
    return found?.name || found?.username || null
  }

  if (!history || history.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-muted-foreground text-sm italic">
        No history available for this document.
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="px-6 py-6 max-w-4xl pb-16">
        <div className="border border-border rounded-md divide-y divide-border bg-card">
          {history.map((item, index) => {
            const actionText = item.action?.replace(/_/g, " ") || "Unknown"
            const actionLower = actionText.toLowerCase()
            const isUpdate = actionLower.includes("update")
            const isCreate = actionLower.includes("create")
            
            return (
              <div key={index} className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {item.created || item.timestamp ? formatRelativeDate(item.created || item.timestamp) : "Unknown date"}
                    </span>
                    <span className="text-sm italic font-medium">
                      {item.actor?.username || "System"}
                    </span>
                  </div>
                  <Badge 
                    variant={isUpdate ? "secondary" : isCreate ? "default" : "outline"}
                    className="text-xs font-normal"
                  >
                    {actionText.charAt(0).toUpperCase() + actionText.slice(1)}
                  </Badge>
                </div>
                
                {item.changes && Object.keys(item.changes).length > 0 && (
                  <ul className="text-sm space-y-1 mt-1 pl-4 list-none m-0">
                    {Object.entries(item.changes).map(([field, change]: any) => {
                      let displayField = field.replace(/_/g, ' ')
                      displayField = displayField.charAt(0).toUpperCase() + displayField.slice(1)
                      
                      let newValStr = ""
                      if (Array.isArray(change) && change.length === 2) {
                         const newVal = change[1]
                         if (Array.isArray(newVal)) {
                             newValStr = newVal.map(v => {
                               if (typeof v === 'object' && v !== null) {
                                  const obj = v as any; return obj.name || obj.id || JSON.stringify(obj)
                               }
                               return getLookupName(field, v) || String(v)
                             }).join(', ')
                         } else if (typeof newVal === 'object' && newVal !== null) {
                             const obj = newVal as any; newValStr = obj.name || JSON.stringify(obj)
                         } else {
                             newValStr = getLookupName(field, newVal) || String(newVal ?? 'None')
                         }
                      } else {
                         if (Array.isArray(change)) {
                             newValStr = change.map(v => {
                               if (typeof v === 'object' && v !== null) {
                                  const obj = v as any; return obj.name || obj.id || JSON.stringify(obj)
                               }
                               return getLookupName(field, v) || String(v)
                             }).join(', ')
                         } else if (typeof change === 'object' && change !== null) {
                             const obj = change as any; newValStr = obj.name || JSON.stringify(obj)
                         } else {
                             newValStr = getLookupName(field, change) || String(change ?? 'None')
                         }
                      }
                      
                      return (
                        <li key={field} className="relative before:content-['∘'] before:absolute before:-left-4 before:text-muted-foreground text-muted-foreground">
                            <span className="text-foreground">{displayField}:</span> {newValStr}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </ScrollArea>
  )
}
