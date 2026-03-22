import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowDownUp, ChevronLeft, ChevronRight, Search } from "lucide-react"
import type { ReportColumn } from "@/components/reports/types"

type DynamicTableProps = {
  columns: ReportColumn[]
  rows: Array<Record<string, string | number>>
  searchTerm: string
  onSearchChange: (value: string) => void
  sortKey: string
  sortDirection: "asc" | "desc"
  onSortChange: (key: string) => void
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  totalRows: number
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
})

function renderCell(value: string | number, type?: ReportColumn["type"]) {
  if (type === "currency") {
    return currencyFormatter.format(Number.isFinite(Number(value)) ? Number(value) : 0)
  }

  if (type === "date") {
    const date = new Date(String(value))
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-CA")
    }
  }

  if (type === "status") {
    const status = String(value).toLowerCase()
    const statusClass =
      status === "paid" || status === "active"
        ? "bg-emerald-100 text-emerald-700"
        : status === "due" || status === "unpaid"
          ? "bg-red-100 text-red-700"
          : "bg-amber-100 text-amber-700"

    return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass}`}>{String(value)}</span>
  }

  return String(value ?? "")
}

export function DynamicTable({
  columns,
  rows,
  searchTerm,
  onSearchChange,
  sortKey,
  sortDirection,
  onSortChange,
  page,
  totalPages,
  onPageChange,
  totalRows,
}: DynamicTableProps) {

  return (
    <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-bold text-[#0F172A]">Report Table</h2>
        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-[#64748B]" />
          <Input
            value={searchTerm}
            onChange={(event) => {
              onSearchChange(event.target.value)
            }}
            placeholder="Search table..."
            className="h-10 rounded-xl border-[#E2E8F0] pl-9"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-[#E2E8F0]">
              {columns.map((column) => (
                <th key={column.key} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-[#0F172A]"
                    onClick={() => onSortChange(column.key)}
                  >
                    {column.label}
                    <ArrowDownUp className={`size-3.5 ${sortKey === column.key ? "text-[#3B82F6]" : ""}`} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(columns.length, 1)} className="px-3 py-8 text-center text-sm text-[#64748B]">
                  No report data found for selected filters.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${index}-${String(row[columns[0]?.key || "id"] ?? index)}`} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-3 text-sm font-medium text-[#0F172A]">
                      {renderCell(row[column.key] ?? "", column.type)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-[#64748B]">
          Page {page} of {Math.max(1, totalPages)} · {totalRows} rows · Sort: {sortDirection.toUpperCase()}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-8 border-[#E2E8F0]"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8 border-[#E2E8F0]"
            onClick={() => onPageChange(Math.min(Math.max(1, totalPages), page + 1))}
            disabled={page >= Math.max(1, totalPages)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}
