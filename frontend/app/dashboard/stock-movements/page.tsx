"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
import {
  getProducts,
  getStockMovements,
  type PaginatedApiResponse,
  type StockMovementRow,
} from "@/lib/api"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

type ProductOption = {
  id: number
  product_name: string
}

const PAGE_SIZE = 20

const formatDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

export default function StockMovementsPage() {
  const [rows, setRows] = React.useState<StockMovementRow[]>([])
  const [products, setProducts] = React.useState<ProductOption[]>([])

  const [page, setPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [total, setTotal] = React.useState(0)

  const [productId, setProductId] = React.useState<string>("all")
  const [type, setType] = React.useState<string>("all")
  const [startDate, setStartDate] = React.useState("")
  const [endDate, setEndDate] = React.useState("")

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const loadProducts = React.useCallback(async () => {
    try {
      const data = await getProducts<ProductOption[]>()
      setProducts(Array.isArray(data) ? data : [])
    } catch {
      setProducts([])
    }
  }, [])

  const loadMovements = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await getStockMovements<PaginatedApiResponse<StockMovementRow>>({
        page,
        limit: PAGE_SIZE,
        product_id: productId === "all" ? undefined : Number(productId),
        type: type === "all" ? undefined : (type as "IN" | "OUT" | "ADJUSTMENT"),
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      })

      setRows(Array.isArray(result?.data) ? result.data : [])
      setTotal(Number(result?.pagination?.total || 0))
      setTotalPages(Math.max(1, Number(result?.pagination?.totalPages || 1)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stock movements")
      setRows([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [page, productId, type, startDate, endDate])

  React.useEffect(() => {
    loadProducts()
  }, [loadProducts])

  React.useEffect(() => {
    loadMovements()
  }, [loadMovements])

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Card>
            <CardHeader>
              <CardTitle>Movement History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <Select value={productId} onValueChange={(value) => { setProductId(value ?? "all"); setPage(1) }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={String(product.id)}>
                        {product.product_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={type} onValueChange={(value) => { setType(value ?? "all"); setPage(1) }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="IN">IN</SelectItem>
                    <SelectItem value="OUT">OUT</SelectItem>
                    <SelectItem value="ADJUSTMENT">ADJUSTMENT</SelectItem>
                  </SelectContent>
                </Select>

                <Input type="datetime-local" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1) }} />
                <Input type="datetime-local" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1) }} />
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Loading stock movements...
                        </TableCell>
                      </TableRow>
                    ) : rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No stock movement records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{formatDateTime(row.created_at)}</TableCell>
                          <TableCell>{row.product_name}</TableCell>
                          <TableCell>{row.warehouse_name}</TableCell>
                          <TableCell>{row.type}</TableCell>
                          <TableCell>{row.quantity}</TableCell>
                          <TableCell>
                            {row.reference_type}
                            {row.reference_id ? ` #${row.reference_id}` : ""}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total records: {total}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <span>
                    Page {page} / {totalPages}
                  </span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <LayoutFooter />
      </SidebarInset>
    </SidebarProvider>
  )
}
