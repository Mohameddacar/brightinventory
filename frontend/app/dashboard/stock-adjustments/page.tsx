"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
import {
  createStockAdjustment,
  getProducts,
  getStockMovements,
  getWarehouses,
  type InventoryAdjustmentPayload,
  type PaginatedApiResponse,
  type StockMovementRow,
  type WarehouseOption,
} from "@/lib/api"
import { appNotify } from "@/lib/notify"
import { Button } from "@/components/ui/button"
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
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type ProductOption = {
  id: number
  product_name: string
}

type AdjustmentForm = {
  product_id: string
  warehouse_id: string
  adjustment_quantity: string
  reason: string
}

const emptyForm: AdjustmentForm = {
  product_id: "",
  warehouse_id: "",
  adjustment_quantity: "",
  reason: "",
}

const formatDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

export default function StockAdjustmentsPage() {
  const [products, setProducts] = React.useState<ProductOption[]>([])
  const [warehouses, setWarehouses] = React.useState<WarehouseOption[]>([])
  const [rows, setRows] = React.useState<StockMovementRow[]>([])
  const [form, setForm] = React.useState<AdjustmentForm>(emptyForm)
  const [submitting, setSubmitting] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const loadLookup = React.useCallback(async () => {
    try {
      const [productsData, warehousesData] = await Promise.all([
        getProducts<ProductOption[]>(),
        getWarehouses<WarehouseOption[]>(),
      ])

      setProducts(Array.isArray(productsData) ? productsData : [])
      setWarehouses(Array.isArray(warehousesData) ? warehousesData : [])
    } catch {
      setProducts([])
      setWarehouses([])
    }
  }, [])

  const loadAdjustments = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await getStockMovements<PaginatedApiResponse<StockMovementRow>>({
        type: "ADJUSTMENT",
        page: 1,
        limit: 50,
      })

      setRows(Array.isArray(response?.data) ? response.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stock adjustments")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadLookup()
    loadAdjustments()
  }, [loadLookup, loadAdjustments])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const productId = Number(form.product_id)
    const warehouseId = Number(form.warehouse_id)
    const adjustmentQuantity = Number(form.adjustment_quantity)

    if (!Number.isFinite(productId) || productId <= 0) {
      appNotify.failed("Validation", "Please select a product.")
      return
    }

    if (!Number.isFinite(warehouseId) || warehouseId <= 0) {
      appNotify.failed("Validation", "Please select a warehouse.")
      return
    }

    if (!Number.isFinite(adjustmentQuantity) || adjustmentQuantity === 0 || !Number.isInteger(adjustmentQuantity)) {
      appNotify.failed("Validation", "Adjustment quantity must be a non-zero integer.")
      return
    }

    const payload: InventoryAdjustmentPayload = {
      product_id: productId,
      warehouse_id: warehouseId,
      adjustment_quantity: adjustmentQuantity,
      reason: form.reason.trim() || null,
    }

    try {
      setSubmitting(true)
      await createStockAdjustment(payload)
      setForm(emptyForm)
      await loadAdjustments()
      appNotify.completed("Stock adjustment", "Inventory updated and movement logged successfully.")
    } catch (err) {
      appNotify.failed("Create adjustment", err instanceof Error ? err.message : "Failed to create stock adjustment")
    } finally {
      setSubmitting(false)
    }
  }

  const handleProductChange = (value: string | null) => {
    const nextValue = value || ""
    setForm((prev) => ({ ...prev, product_id: nextValue }))
  }

  const handleWarehouseChange = (value: string | null) => {
    const nextValue = value || ""
    setForm((prev) => ({ ...prev, warehouse_id: nextValue }))
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Card>
            <CardHeader>
              <CardTitle>Create Adjustment</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
                <Select value={form.product_id} onValueChange={handleProductChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={String(product.id)}>
                        {product.product_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={form.warehouse_id} onValueChange={handleWarehouseChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                        {warehouse.warehouse_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  step="1"
                  placeholder="Adjustment quantity (e.g. 10 or -5)"
                  value={form.adjustment_quantity}
                  onChange={(event) => setForm((prev) => ({ ...prev, adjustment_quantity: event.target.value }))}
                />

                <Input
                  placeholder="Reason"
                  value={form.reason}
                  onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
                />

                <div className="md:col-span-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Saving..." : "Create Adjustment"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Adjustments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Loading adjustments...
                        </TableCell>
                      </TableRow>
                    ) : rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No adjustment records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{formatDateTime(row.created_at)}</TableCell>
                          <TableCell>{row.product_name}</TableCell>
                          <TableCell>{row.warehouse_name}</TableCell>
                          <TableCell>{row.quantity}</TableCell>
                          <TableCell>{row.note || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
        <LayoutFooter />
      </SidebarInset>
    </SidebarProvider>
  )
}
