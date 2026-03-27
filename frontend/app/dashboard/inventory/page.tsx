"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
import {
  getInventoryOverview,
  getWarehouses,
  type InventoryOverviewRow,
  type WarehouseOption,
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
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { SearchIcon } from "lucide-react"

export default function InventoryOverviewPage() {
  const [rows, setRows] = React.useState<InventoryOverviewRow[]>([])
  const [warehouses, setWarehouses] = React.useState<WarehouseOption[]>([])
  const [search, setSearch] = React.useState("")
  const [warehouseId, setWarehouseId] = React.useState<string>("all")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const loadWarehouses = React.useCallback(async () => {
    try {
      const data = await getWarehouses<WarehouseOption[]>()
      setWarehouses(Array.isArray(data) ? data : [])
    } catch {
      setWarehouses([])
    }
  }, [])

  const loadInventory = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getInventoryOverview<InventoryOverviewRow[]>({
        search,
        warehouse_id: warehouseId === "all" ? undefined : Number(warehouseId),
      })

      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [search, warehouseId])

  React.useEffect(() => {
    loadWarehouses()
  }, [loadWarehouses])

  React.useEffect(() => {
    loadInventory()
  }, [loadInventory])

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by product name or code"
                    className="pl-9"
                  />
                </div>
                <Select value={warehouseId} onValueChange={(value) => setWarehouseId(value ?? "all")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Warehouses</SelectItem>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                        {warehouse.warehouse_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Quantity Available</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Loading inventory...
                        </TableCell>
                      </TableRow>
                    ) : rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No inventory records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => (
                        <TableRow key={row.id} className={row.stock_status === "LOW" ? "bg-red-50/50" : ""}>
                          <TableCell>{row.product_name}</TableCell>
                          <TableCell>{row.product_code}</TableCell>
                          <TableCell>{row.warehouse_name}</TableCell>
                          <TableCell>{row.quantity_on_hand}</TableCell>
                          <TableCell>
                            <Badge variant={row.stock_status === "LOW" ? "destructive" : "secondary"}>
                              {row.stock_status === "LOW" ? "Low" : "Normal"}
                            </Badge>
                          </TableCell>
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
