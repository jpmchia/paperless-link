"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"

export type Document = {
  id: number
  title: string
  created: string
  added: string
  modified: string
  archive_serial_number: number | null
  custom_fields?: { value: any, field: number }[]
}

export const columns: ColumnDef<Document>[] = [
  {
    accessorKey: "archive_serial_number",
    header: "ASN",
    cell: ({ row }: { row: any }) => {
      const asn = row.getValue("archive_serial_number") as number | null
      if (!asn) return <span className="text-muted-foreground">-</span>
      return <Badge variant="outline">#{asn}</Badge>
    },
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }: { row: any }) => {
      return <div className="font-medium max-w-[400px] truncate" title={row.getValue("title")}>{row.getValue("title")}</div>
    },
  },
  {
    accessorKey: "created",
    header: "Created",
    cell: ({ row }: { row: any }) => {
      const dateStr = row.getValue("created") as string
      const displayDate = dateStr ? dateStr.split("T")[0] : ""
      return <div className="text-muted-foreground whitespace-nowrap">{displayDate}</div>
    },
  },
  {
    accessorKey: "added",
    header: "Added",
    cell: ({ row }: { row: any }) => {
      const dateStr = row.getValue("added") as string
      const displayDate = dateStr ? dateStr.split("T")[0] : ""
      return <div className="text-muted-foreground whitespace-nowrap">{displayDate}</div>
    },
  },
]
