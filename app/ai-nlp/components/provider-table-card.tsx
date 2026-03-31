"use client"

import { Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AIProvider } from "@/lib/link-iq-types"

type Props = {
  providers: AIProvider[]
  selectedProviderID: string
  onSelect: (provider: AIProvider) => void
  onCreateNew: () => void
}

export function ProviderTableCard({
  providers,
  selectedProviderID,
  onSelect,
  onCreateNew,
}: Props) {
  return (
    <Card className="min-h-0 overflow-hidden">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm">Providers</CardTitle>
            <CardDescription>
              Manage the model providers available to LinkIQ.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={onCreateNew}>
            <Plus className="size-4" />
            New provider
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 overflow-hidden p-4">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border">
          <div className="min-h-0 flex-1 overflow-auto">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="sticky top-0 z-10 w-[30%] bg-card">Provider</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[44%] bg-card">Base API URL</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[14%] bg-card">Source</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[12%] bg-card text-right">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.length > 0 ? (
                  providers.map((provider) => (
                    <TableRow
                      key={provider.provider_id}
                      data-state={
                        provider.provider_id === selectedProviderID ? "selected" : undefined
                      }
                      className="cursor-pointer"
                      onClick={() => onSelect(provider)}
                    >
                      <TableCell className="py-2.5">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-sm">{provider.label}</div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {provider.compatibility_mode === "anthropic"
                              ? "Anthropic"
                              : "OpenAI-compatible"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="truncate py-2.5 text-xs text-muted-foreground">
                        {provider.base_url}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs">
                        {providerSourceLabel(provider.provider_type)}
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        <Badge variant="outline">{provider.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="px-4 py-6 text-sm text-muted-foreground">
                      No providers configured yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function providerSourceLabel(providerType: string) {
  switch (providerType) {
    case "self_hosted":
    case "local":
      return "Self-hosted"
    case "linkiq":
      return "LinkIQ managed"
    default:
      return "External"
  }
}
