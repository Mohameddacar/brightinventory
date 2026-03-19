import { Badge } from "@/components/ui/badge"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Table as UITable,
} from "@/components/ui/table"

type InventoryAlert = {
  productName: string
  sku: string
  warehouse: string
  currentStock: string
  status: string
}

type TableProps = {
  rows: InventoryAlert[]
}

export function Table({ rows }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <UITable>
        <TableHeader>
          <TableRow className="border-[#E2E8F0]">
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Product Name</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">SKU</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Warehouse</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Current Stock</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.sku} className="border-[#E2E8F0] transition-colors hover:bg-[#F8FAFC]">
              <TableCell className="min-w-48 font-semibold text-[#0F172A]">{row.productName}</TableCell>
              <TableCell className="text-[#64748B]">{row.sku}</TableCell>
              <TableCell className="text-[#64748B]">{row.warehouse}</TableCell>
              <TableCell>
                <span className="font-semibold text-[#EF4444]">{row.currentStock.split("/")[0].trim()}</span>
                <span className="text-[#94A3B8]"> / {row.currentStock.split("/")[1]?.trim()}</span>
              </TableCell>
              <TableCell>
                <Badge className="rounded-md bg-red-50 font-semibold text-[#EF4444] hover:bg-red-50">{row.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </UITable>
    </div>
  )
}
