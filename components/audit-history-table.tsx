"use client"

import * as React from "react"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

export type AuditHistoryColumn<Row> = {
  id: string
  label: string
  defaultWidth: number
  minWidth?: number
  sortable?: boolean
  sortValue?: (row: Row) => number | string
  render: (row: Row) => React.ReactNode
  cellClassName?: string
  headerClassName?: string
}

type SortDirection = "asc" | "desc"

type Props<Row> = {
  columns: AuditHistoryColumn<Row>[]
  emptyMessage: string
  getRowId: (row: Row) => string
  maxHeight?: number | string
  rows: Row[]
  defaultSortColumnId?: string
  defaultSortDirection?: SortDirection
  loading?: boolean
  className?: string
}

function sortRows<Row>(
  rows: Row[],
  columns: AuditHistoryColumn<Row>[],
  sortColumnId: string | null,
  sortDirection: SortDirection
) {
  if (!sortColumnId) return rows
  const column = columns.find((candidate) => candidate.id === sortColumnId)
  if (!column?.sortable || !column.sortValue) return rows

  const factor = sortDirection === "asc" ? 1 : -1

  return [...rows].sort((left, right) => {
    const leftValue = column.sortValue?.(left)
    const rightValue = column.sortValue?.(right)

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * factor
    }

    return String(leftValue ?? "").localeCompare(String(rightValue ?? "")) * factor
  })
}

export function AuditHistoryTable<Row>({
  columns,
  emptyMessage,
  getRowId,
  maxHeight = 320,
  rows,
  defaultSortColumnId,
  defaultSortDirection = "desc",
  loading = false,
  className,
}: Props<Row>) {
  const [widths, setWidths] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(columns.map((column) => [column.id, column.defaultWidth]))
  )
  const [sortColumnId, setSortColumnId] = React.useState<string | null>(
    defaultSortColumnId ?? null
  )
  const [sortDirection, setSortDirection] =
    React.useState<SortDirection>(defaultSortDirection)

  React.useEffect(() => {
    setWidths((current) => {
      const next = { ...current }
      for (const column of columns) {
        if (!next[column.id]) {
          next[column.id] = column.defaultWidth
        }
      }
      return next
    })
  }, [columns])

  const sortedRows = React.useMemo(
    () => sortRows(rows, columns, sortColumnId, sortDirection),
    [columns, rows, sortColumnId, sortDirection]
  )

  const handleSort = React.useCallback((columnId: string) => {
    setSortColumnId((currentColumnId) => {
      if (currentColumnId === columnId) {
        setSortDirection((currentDirection) =>
          currentDirection === "asc" ? "desc" : "asc"
        )
        return currentColumnId
      }
      setSortDirection("asc")
      return columnId
    })
  }, [])

  const handleResizeStart = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>, columnId: string, minWidth: number) => {
      event.preventDefault()
      event.stopPropagation()

      const startX = event.clientX
      const startWidth = widths[columnId] ?? minWidth
      const pointerId = event.pointerId

      const move = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startX
        setWidths((current) => ({
          ...current,
          [columnId]: Math.max(minWidth, startWidth + delta),
        }))
      }

      const stop = () => {
        window.removeEventListener("pointermove", move)
        window.removeEventListener("pointerup", stop)
        window.removeEventListener("pointercancel", stop)
      }

      window.addEventListener("pointermove", move)
      window.addEventListener("pointerup", stop)
      window.addEventListener("pointercancel", stop)

      try {
        event.currentTarget.setPointerCapture(pointerId)
      } catch {
        // Ignore browsers that do not support explicit pointer capture here.
      }
    },
    [widths]
  )

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background",
        className
      )}
    >
      <div className="min-h-0 overflow-auto" style={{ maxHeight }}>
        <table className="w-full table-fixed border-collapse text-xs">
          <colgroup>
            {columns.map((column) => (
              <col key={column.id} style={{ width: widths[column.id] ?? column.defaultWidth }} />
            ))}
          </colgroup>

          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b">
              {columns.map((column) => {
                const sortable = Boolean(column.sortable && column.sortValue)
                const isActiveSort = sortColumnId === column.id
                const SortIcon = !sortable
                  ? null
                  : !isActiveSort
                    ? ArrowUpDown
                    : sortDirection === "asc"
                      ? ArrowUp
                      : ArrowDown

                return (
                  <th
                    key={column.id}
                    className={cn(
                      "relative h-10 bg-background px-2 text-left align-middle font-medium text-foreground",
                      column.headerClassName
                    )}
                  >
                    <div className="flex items-center gap-1 pr-3">
                      {sortable ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-left hover:text-foreground"
                          onClick={() => handleSort(column.id)}
                        >
                          <span>{column.label}</span>
                          {SortIcon ? <SortIcon className="size-3.5 text-muted-foreground" /> : null}
                        </button>
                      ) : (
                        <span>{column.label}</span>
                      )}
                    </div>
                    <div
                      role="separator"
                      aria-orientation="vertical"
                      className="absolute inset-y-0 right-0 w-2 cursor-col-resize touch-none"
                      onPointerDown={(event) =>
                        handleResizeStart(event, column.id, column.minWidth ?? 120)
                      }
                    >
                      <div className="absolute inset-y-2 right-0 w-px bg-border" />
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {sortedRows.length > 0 ? (
              sortedRows.map((row) => (
                <tr
                  key={getRowId(row)}
                  className="border-b transition-colors hover:bg-muted/40"
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={cn(
                        "p-2 align-top text-xs text-muted-foreground",
                        column.cellClassName
                      )}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="p-6 text-center text-xs text-muted-foreground"
                >
                  {loading ? "Loading history..." : emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
