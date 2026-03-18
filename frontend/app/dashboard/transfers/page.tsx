"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
import {
  createTransfer,
  deleteTransfer,
  getTransferWarehouses,
  getTransfers,
  type PaginatedApiResponse,
  type TransferApiPayload,
  type WarehouseOption,
} from "@/lib/api"
import { appNotify } from "@/lib/notify"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  EyeIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "lucide-react"
import type { CSSProperties } from "react"

type ApiTransfer = {
  id: number
  transfer_date: string
  reference_no: string
  from_warehouse_id: number
  from_warehouse_name: string
  to_warehouse_id: number
  to_warehouse_name: string
  total_products: string | number
  grand_total: string | number
  remarks: string | null
  created_at: string
}

type TransferMutationResponse = {
  message: string
  data: ApiTransfer
}

type TransferForm = {
  transfer_date: string
  reference_no: string
  from_warehouse_id: string
  to_warehouse_id: string
  total_products: string
  grand_total: string
  remarks: string
}

const PAGE_SIZE = 10

const emptyForm: TransferForm = {
  transfer_date: "",
  reference_no: "",
  from_warehouse_id: "",
  to_warehouse_id: "",
  total_products: "",
  grand_total: "",
  remarks: "",
}

const REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-_/]{1,63}$/

export default function TransfersPage() {
  const [transfers, setTransfers] = React.useState<ApiTransfer[]>([])
  const [warehouses, setWarehouses] = React.useState<WarehouseOption[]>([])

  const [searchTerm, setSearchTerm] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [total, setTotal] = React.useState(0)
  const [totalPages, setTotalPages] = React.useState(1)

  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isViewOpen, setIsViewOpen] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  const [selectedTransfer, setSelectedTransfer] = React.useState<ApiTransfer | null>(null)
  const [addForm, setAddForm] = React.useState<TransferForm>(emptyForm)

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)

  const loadTransfers = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await getTransfers<PaginatedApiResponse<ApiTransfer>>({
        search: searchTerm,
        page,
        limit: PAGE_SIZE,
      })

      const safeRows = Array.isArray(response?.data) ? response.data : []
      const pagination = response?.pagination

      setTransfers(safeRows)
      setTotal(Number(pagination?.total || 0))
      setTotalPages(Math.max(1, Number(pagination?.totalPages || 1)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transfers")
      setTransfers([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, page])

  const loadWarehouses = React.useCallback(async () => {
    try {
      const data = await getTransferWarehouses<WarehouseOption[]>()
      const safe = Array.isArray(data) ? data : []
      setWarehouses(safe)

      if (safe.length >= 2) {
        setAddForm((prev) => ({
          ...prev,
          from_warehouse_id: prev.from_warehouse_id || String(safe[0].id),
          to_warehouse_id: prev.to_warehouse_id || String(safe[1].id),
        }))
      }
    } catch {
      setWarehouses([])
    }
  }, [])

  React.useEffect(() => {
    loadTransfers()
  }, [loadTransfers])

  React.useEffect(() => {
    loadWarehouses()
  }, [loadWarehouses])

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const validateForm = React.useCallback((form: TransferForm): string | null => {
    if (!form.transfer_date || Number.isNaN(new Date(form.transfer_date).getTime())) {
      return "Date is required."
    }

    const referenceNo = form.reference_no.trim()
    if (!referenceNo) {
      return "Reference is required."
    }

    if (!REF_PATTERN.test(referenceNo)) {
      return "Reference is invalid."
    }

    const fromWarehouse = Number(form.from_warehouse_id)
    const toWarehouse = Number(form.to_warehouse_id)

    if (!Number.isFinite(fromWarehouse) || fromWarehouse <= 0) {
      return "From warehouse is required."
    }

    if (!Number.isFinite(toWarehouse) || toWarehouse <= 0) {
      return "To warehouse is required."
    }

    if (fromWarehouse === toWarehouse) {
      return "From warehouse and To warehouse cannot be the same."
    }

    const totalProducts = Number(form.total_products)
    if (!Number.isFinite(totalProducts) || totalProducts <= 0) {
      return "Total products must be greater than 0."
    }

    const grandTotal = Number(form.grand_total)
    if (!Number.isFinite(grandTotal) || grandTotal < 0) {
      return "Grand total must be 0 or greater."
    }

    return null
  }, [])

  const handleAddTransfer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationError = validateForm(addForm)
    if (validationError) {
      setFormError(validationError)
      appNotify.failed("Validation", validationError)
      return
    }

    setFormError(null)

    const payload: TransferApiPayload = {
      transfer_date: addForm.transfer_date,
      reference_no: addForm.reference_no.trim(),
      from_warehouse_id: Number(addForm.from_warehouse_id),
      to_warehouse_id: Number(addForm.to_warehouse_id),
      total_products: Number(addForm.total_products),
      grand_total: Number(addForm.grand_total),
      remarks: addForm.remarks.trim() || null,
    }

    try {
      await createTransfer<TransferMutationResponse>(payload)
      setIsAddOpen(false)
      setAddForm((prev) => ({
        ...emptyForm,
        from_warehouse_id: prev.from_warehouse_id,
        to_warehouse_id: prev.to_warehouse_id,
      }))
      setPage(1)
      await loadTransfers()
      appNotify.created("Transfer")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create transfer"
      setError(message)
      appNotify.failed("Create transfer", message)
    }
  }

  const handleDeleteTransfer = async () => {
    if (!deleteId) {
      return
    }

    try {
      await deleteTransfer<{ message: string }>(deleteId)
      setDeleteId(null)
      await loadTransfers()
      appNotify.deleted("Transfer")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete transfer"
      setError(message)
      appNotify.failed("Delete transfer", message)
    }
  }

  const handleExport = () => {
    const headers = ["Date", "Ref", "From Warehouse", "To Warehouse", "Total Products", "Grand Total"]
    const lines = transfers.map((item) => [
      new Date(item.transfer_date).toISOString().slice(0, 10),
      item.reference_no,
      item.from_warehouse_name,
      item.to_warehouse_name,
      String(item.total_products),
      String(Number(item.grand_total).toFixed(2)),
    ])

    const csv = [headers, ...lines]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `transfers-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const openViewModal = (transfer: ApiTransfer) => {
    setSelectedTransfer(transfer)
    setIsViewOpen(true)
  }

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total)

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />

        <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">All Transfers</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">View and manage stock transfer records.</p>
                {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
                {formError ? <p className="mt-1 text-xs text-rose-600">{formError}</p> : null}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleExport}>
                  <DownloadIcon className="mr-1 size-4" />
                  Export
                </Button>
                <Button className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]" onClick={() => setIsAddOpen(true)}>
                  <PlusIcon className="mr-1 size-4" />
                  Add Transfer
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search reference or warehouse..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setPage(1)
                  }}
                />
              </div>

              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Ref</TableHead>
                      <TableHead>From Warehouse</TableHead>
                      <TableHead>To Warehouse</TableHead>
                      <TableHead>Total Products</TableHead>
                      <TableHead>Grand Total</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          Loading transfers...
                        </TableCell>
                      </TableRow>
                    ) : null}

                    {transfers.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{new Date(row.transfer_date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium text-[#3FA3D3]">{row.reference_no}</TableCell>
                        <TableCell>{row.from_warehouse_name}</TableCell>
                        <TableCell>{row.to_warehouse_name}</TableCell>
                        <TableCell>{row.total_products}</TableCell>
                        <TableCell>${Number(row.grand_total).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                              Action
                              <ChevronDownIcon className="ml-1 size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => openViewModal(row)}>
                                <EyeIcon className="size-4" />
                                <span>View</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => setDeleteId(row.id)}>
                                <TrashIcon className="size-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!loading && transfers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          No transfers found.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-start justify-between gap-2 text-sm text-muted-foreground md:flex-row md:items-center">
                <p>
                  Showing {from}-{to} of {total} transfers
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    <ChevronLeftIcon className="size-4" />
                    Previous
                  </Button>
                  <span className="rounded-md border px-3 py-1 text-sm text-foreground">{page}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    Next
                    <ChevronRightIcon className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <LayoutFooter />
        </div>
      </SidebarInset>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Transfer</DialogTitle>
            <DialogDescription>Fill in transfer details to create a new record.</DialogDescription>
          </DialogHeader>

          <form id="add-transfer-form" className="grid gap-3 py-2" onSubmit={handleAddTransfer}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Date *</label>
                <Input
                  type="date"
                  value={addForm.transfer_date}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, transfer_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Ref *</label>
                <Input
                  value={addForm.reference_no}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, reference_no: e.target.value }))}
                  placeholder="e.g. TRF-001"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">From Warehouse *</label>
                <Select
                  value={addForm.from_warehouse_id}
                  onValueChange={(value) => setAddForm((prev) => ({ ...prev, from_warehouse_id: value || "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.warehouse_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">To Warehouse *</label>
                <Select
                  value={addForm.to_warehouse_id}
                  onValueChange={(value) => setAddForm((prev) => ({ ...prev, to_warehouse_id: value || "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.warehouse_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Total Products *</label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={addForm.total_products}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, total_products: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Grand Total *</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addForm.grand_total}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, grand_total: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Remarks</label>
              <textarea
                className="min-h-20 w-full rounded-lg border border-input bg-transparent p-2.5 text-sm outline-none focus-visible:border-ring"
                value={addForm.remarks}
                onChange={(e) => setAddForm((prev) => ({ ...prev, remarks: e.target.value }))}
                placeholder="Enter additional notes..."
              />
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-transfer-form" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]">
              Save Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Details</DialogTitle>
            <DialogDescription>Selected transfer information.</DialogDescription>
          </DialogHeader>
          {selectedTransfer ? (
            <div className="grid gap-2 text-sm">
              <p><span className="font-medium">Date:</span> {new Date(selectedTransfer.transfer_date).toLocaleDateString()}</p>
              <p><span className="font-medium">Ref:</span> {selectedTransfer.reference_no}</p>
              <p><span className="font-medium">From Warehouse:</span> {selectedTransfer.from_warehouse_name}</p>
              <p><span className="font-medium">To Warehouse:</span> {selectedTransfer.to_warehouse_name}</p>
              <p><span className="font-medium">Total Products:</span> {selectedTransfer.total_products}</p>
              <p><span className="font-medium">Grand Total:</span> ${Number(selectedTransfer.grand_total).toFixed(2)}</p>
              <p><span className="font-medium">Remarks:</span> {selectedTransfer.remarks || "-"}</p>
              <p><span className="font-medium">Created:</span> {new Date(selectedTransfer.created_at).toLocaleString()}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => (!open ? setDeleteId(null) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transfer?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected transfer will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTransfer} className="bg-rose-600 text-white hover:bg-rose-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}
