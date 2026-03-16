"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
import {
  createSupplier,
  deleteSupplier,
  getSuppliers,
  updateSupplier,
  type SupplierApiPayload,
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
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "lucide-react"
import type { CSSProperties } from "react"

type ApiSupplier = {
  id: number
  full_name: string
  address: string | null
  mobile_no: string | null
  email: string | null
  opening_balance: string | number | null
  balance_type: "credit" | "debit" | "none"
  registered_date: string
  created_at: string
}

type SupplierForm = {
  full_name: string
  mobile_no: string
  address: string
  email: string
  registered_date: string
  opening_balance: string
  balance_type: "credit" | "debit" | "none"
}

const PAGE_SIZE = 10
const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'.-]*$/
const MOBILE_PATTERN = /^[+0-9][0-9\-\s]{6,29}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const emptyForm: SupplierForm = {
  full_name: "",
  mobile_no: "",
  address: "",
  email: "",
  registered_date: "",
  opening_balance: "0",
  balance_type: "none",
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = React.useState<ApiSupplier[]>([])
  const [searchTerm, setSearchTerm] = React.useState("")
  const [page, setPage] = React.useState(1)

  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isViewOpen, setIsViewOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  const [selectedSupplier, setSelectedSupplier] = React.useState<ApiSupplier | null>(null)
  const [addForm, setAddForm] = React.useState<SupplierForm>(emptyForm)
  const [editForm, setEditForm] = React.useState<SupplierForm>(emptyForm)

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)

  const loadSuppliers = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getSuppliers<ApiSupplier[]>()
      setSuppliers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suppliers")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadSuppliers()
  }, [loadSuppliers])

  const filteredSuppliers = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) {
      return suppliers
    }

    return suppliers.filter((item) => {
      return (
        item.full_name.toLowerCase().includes(query) ||
        (item.mobile_no || "").toLowerCase().includes(query) ||
        (item.email || "").toLowerCase().includes(query)
      )
    })
  }, [suppliers, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const rows = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredSuppliers.slice(start, start + PAGE_SIZE)
  }, [filteredSuppliers, currentPage])

  const buildPayload = (form: SupplierForm): SupplierApiPayload => {
    return {
      full_name: form.full_name.trim(),
      mobile_no: form.mobile_no.trim(),
      address: form.address.trim() || null,
      email: form.email.trim() || null,
      registered_date: form.registered_date,
      opening_balance: Number(form.opening_balance || 0),
      balance_type: form.balance_type,
    }
  }

  const validateSupplierForm = (form: SupplierForm): string | null => {
    const fullName = form.full_name.trim()
    if (fullName.length < 2 || fullName.length > 120) {
      return "Full name must be between 2 and 120 characters."
    }
    if (!NAME_PATTERN.test(fullName)) {
      return "Full name can only contain letters, spaces, apostrophes, dots, and hyphens."
    }

    const mobile = form.mobile_no.trim()
    if (!mobile) {
      return "Mobile number is required."
    }
    if (!MOBILE_PATTERN.test(mobile)) {
      return "Mobile number format is invalid."
    }

    const email = form.email.trim()
    if (email && !EMAIL_PATTERN.test(email)) {
      return "Please enter a valid email address."
    }

    if (!form.registered_date) {
      return "Registered date is required."
    }

    const openingBalance = Number(form.opening_balance || 0)
    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      return "Opening balance must be a non-negative number."
    }

    return null
  }

  const handleAddSupplier = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationError = validateSupplierForm(addForm)
    if (validationError) {
      setFormError(validationError)
      appNotify.failed("Validation", validationError)
      return
    }

    setFormError(null)

    try {
      await createSupplier(buildPayload(addForm))
      setIsAddOpen(false)
      setAddForm(emptyForm)
      await loadSuppliers()
      setPage(1)
      appNotify.created("Supplier")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create supplier"
      setError(message)
      appNotify.failed("Create supplier", message)
    }
  }

  const handleEditSupplier = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedSupplier) {
      return
    }

    const validationError = validateSupplierForm(editForm)
    if (validationError) {
      setFormError(validationError)
      appNotify.failed("Validation", validationError)
      return
    }

    setFormError(null)

    try {
      await updateSupplier(selectedSupplier.id, buildPayload(editForm))
      setIsEditOpen(false)
      setSelectedSupplier(null)
      await loadSuppliers()
      appNotify.updated("Supplier")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update supplier"
      setError(message)
      appNotify.failed("Update supplier", message)
    }
  }

  const handleDeleteSupplier = async () => {
    if (!deleteId) {
      return
    }

    try {
      await deleteSupplier(deleteId)
      setDeleteId(null)
      await loadSuppliers()
      appNotify.deleted("Supplier")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete supplier"
      setError(message)
      appNotify.failed("Delete supplier", message)
    }
  }

  const openViewModal = (supplier: ApiSupplier) => {
    setSelectedSupplier(supplier)
    setIsViewOpen(true)
  }

  const openEditModal = (supplier: ApiSupplier) => {
    setSelectedSupplier(supplier)
    setEditForm({
      full_name: supplier.full_name,
      mobile_no: supplier.mobile_no || "",
      address: supplier.address || "",
      email: supplier.email || "",
      registered_date: new Date(supplier.registered_date).toISOString().slice(0, 10),
      opening_balance: String(supplier.opening_balance ?? 0),
      balance_type: supplier.balance_type,
    })
    setIsEditOpen(true)
  }

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
                <CardTitle className="text-lg">Suppliers</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage supplier records and balances.
                </p>
                {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
                {formError ? <p className="mt-1 text-xs text-rose-600">{formError}</p> : null}
              </div>

              <Button
                className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]"
                onClick={() => setIsAddOpen(true)}
              >
                <PlusIcon className="mr-1 size-4" />
                Add Supplier
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search supplier name, mobile, or email..."
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
                      <TableHead>ID</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Mobile Number</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Opening Balance</TableHead>
                      <TableHead>Balance Type</TableHead>
                      <TableHead>Registered Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                          Loading suppliers...
                        </TableCell>
                      </TableRow>
                    ) : null}

                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.id}</TableCell>
                        <TableCell className="font-medium">{row.full_name}</TableCell>
                        <TableCell>{row.mobile_no || "-"}</TableCell>
                        <TableCell>{row.email || "-"}</TableCell>
                        <TableCell>{row.address || "-"}</TableCell>
                        <TableCell>${Number(row.opening_balance || 0).toFixed(2)}</TableCell>
                        <TableCell className="capitalize">{row.balance_type}</TableCell>
                        <TableCell>{new Date(row.registered_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openViewModal(row)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-[#3FA3D3]"
                              aria-label="View supplier"
                            >
                              <EyeIcon className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(row)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-amber-600"
                              aria-label="Edit supplier"
                            >
                              <PencilIcon className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(row.id)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-rose-600"
                              aria-label="Delete supplier"
                            >
                              <TrashIcon className="size-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!loading && rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                          No suppliers found.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-start justify-between gap-2 text-sm text-muted-foreground md:flex-row md:items-center">
                <p>
                  Showing {(currentPage - 1) * PAGE_SIZE + (rows.length ? 1 : 0)}-
                  {(currentPage - 1) * PAGE_SIZE + rows.length} of {filteredSuppliers.length} suppliers
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    <ChevronLeftIcon className="size-4" />
                    Prev
                  </Button>
                  <span className="rounded-md border px-3 py-1 text-sm text-foreground">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
            <DialogDescription>Create a supplier with balance type credit, debit, or none.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSupplier} className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="add-full-name" className="text-sm font-medium">Full Name</label>
                <Input
                  id="add-full-name"
                  value={addForm.full_name}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="add-mobile" className="text-sm font-medium">Mobile Number</label>
                <Input
                  id="add-mobile"
                  value={addForm.mobile_no}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, mobile_no: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="add-address" className="text-sm font-medium">Address</label>
              <Input
                id="add-address"
                value={addForm.address}
                onChange={(e) => setAddForm((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="add-email" className="text-sm font-medium">Email</label>
                <Input
                  id="add-email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="add-registered-date" className="text-sm font-medium">Registered Date</label>
                <Input
                  id="add-registered-date"
                  type="date"
                  value={addForm.registered_date}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, registered_date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="add-opening-balance" className="text-sm font-medium">Opening Balance</label>
                <Input
                  id="add-opening-balance"
                  type="number"
                  min="0"
                  step="0.01"
                  value={addForm.opening_balance}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, opening_balance: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="add-balance-type" className="text-sm font-medium">Balance Type</label>
                <Select
                  value={addForm.balance_type}
                  onValueChange={(value) =>
                    setAddForm((prev) => ({
                      ...prev,
                      balance_type: (value as SupplierForm["balance_type"]) || "none",
                    }))
                  }
                >
                  <SelectTrigger id="add-balance-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="debit">Debit</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]">
                Save Supplier
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supplier Details</DialogTitle>
            <DialogDescription>Selected supplier information.</DialogDescription>
          </DialogHeader>
          {selectedSupplier ? (
            <div className="grid gap-3 p-4 text-sm">
              <p><span className="font-medium">Full Name:</span> {selectedSupplier.full_name}</p>
              <p><span className="font-medium">Mobile Number:</span> {selectedSupplier.mobile_no || "-"}</p>
              <p><span className="font-medium">Email:</span> {selectedSupplier.email || "-"}</p>
              <p><span className="font-medium">Address:</span> {selectedSupplier.address || "-"}</p>
              <p><span className="font-medium">Opening Balance:</span> ${Number(selectedSupplier.opening_balance || 0).toFixed(2)}</p>
              <p><span className="font-medium">Balance Type:</span> {selectedSupplier.balance_type}</p>
              <p><span className="font-medium">Registered Date:</span> {new Date(selectedSupplier.registered_date).toLocaleDateString()}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Suppliers</DialogTitle>
            <DialogDescription>Update supplier details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSupplier} className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="edit-full-name" className="text-sm font-medium">Full Name</label>
                <Input
                  id="edit-full-name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-mobile" className="text-sm font-medium">Mobile Number</label>
                <Input
                  id="edit-mobile"
                  value={editForm.mobile_no}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, mobile_no: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-address" className="text-sm font-medium">Address</label>
              <Input
                id="edit-address"
                value={editForm.address}
                onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="edit-email" className="text-sm font-medium">Email</label>
                <Input
                  id="edit-email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-registered-date" className="text-sm font-medium">Registered Date</label>
                <Input
                  id="edit-registered-date"
                  type="date"
                  value={editForm.registered_date}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, registered_date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="edit-opening-balance" className="text-sm font-medium">Opening Balance</label>
                <Input
                  id="edit-opening-balance"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.opening_balance}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, opening_balance: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-balance-type" className="text-sm font-medium">Balance Type</label>
                <Select
                  value={editForm.balance_type}
                  onValueChange={(value) =>
                    setEditForm((prev) => ({
                      ...prev,
                      balance_type: (value as SupplierForm["balance_type"]) || "none",
                    }))
                  }
                >
                  <SelectTrigger id="edit-balance-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="debit">Debit</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected supplier will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSupplier}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}
