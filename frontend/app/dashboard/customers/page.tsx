"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  getSponsors,
  updateCustomer,
  type CustomerApiPayload,
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

type ApiCustomer = {
  id: number
  full_name: string
  gender: string | null
  address: string | null
  mobile_no: string | null
  email: string | null
  customer_type: string | null
  sponsor_id: number | null
  sponsor_name: string | null
  opening_balance: string | number | null
  balance_type: "credit" | "debit"
  registered_date: string
  created_at: string
}

type ApiSponsor = {
  id: number
  full_name: string
}

type CustomerForm = {
  full_name: string
  gender: "male" | "female"
  address: string
  mobile_no: string
  email: string
  customer_type: string
  sponsor_id: string
  opening_balance: string
  balance_type: "credit" | "debit"
  registered_date: string
}

const PAGE_SIZE = 10
const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'.-]{1,119}$/
const MOBILE_PATTERN = /^[+0-9][0-9\-\s]{6,29}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const emptyForm: CustomerForm = {
  full_name: "",
  gender: "male",
  address: "",
  mobile_no: "",
  email: "",
  customer_type: "regular",
  sponsor_id: "none",
  opening_balance: "0",
  balance_type: "credit",
  registered_date: "",
}

export default function CustomersPage() {
  const [customers, setCustomers] = React.useState<ApiCustomer[]>([])
  const [sponsors, setSponsors] = React.useState<ApiSponsor[]>([])

  const [searchTerm, setSearchTerm] = React.useState("")
  const [page, setPage] = React.useState(1)

  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isViewOpen, setIsViewOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  const [selectedCustomer, setSelectedCustomer] = React.useState<ApiCustomer | null>(null)
  const [addForm, setAddForm] = React.useState<CustomerForm>(emptyForm)
  const [editForm, setEditForm] = React.useState<CustomerForm>(emptyForm)

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)

  const loadCustomers = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getCustomers<ApiCustomer[]>()
      setCustomers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSponsors = React.useCallback(async () => {
    try {
      const data = await getSponsors<ApiSponsor[]>()
      setSponsors(Array.isArray(data) ? data : [])
    } catch {
      setSponsors([])
    }
  }, [])

  React.useEffect(() => {
    loadCustomers()
    loadSponsors()
  }, [loadCustomers, loadSponsors])

  const filteredCustomers = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) {
      return customers
    }

    return customers.filter((item) => {
      return (
        item.full_name.toLowerCase().includes(query) ||
        (item.mobile_no || "").toLowerCase().includes(query) ||
        (item.email || "").toLowerCase().includes(query)
      )
    })
  }, [customers, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const rows = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredCustomers.slice(start, start + PAGE_SIZE)
  }, [filteredCustomers, currentPage])

  const selectedAddSponsorLabel = React.useMemo(() => {
    if (!addForm.sponsor_id || addForm.sponsor_id === "none") {
      return "None"
    }

    const sponsor = sponsors.find((item) => String(item.id) === addForm.sponsor_id)
    return sponsor?.full_name || "None"
  }, [addForm.sponsor_id, sponsors])

  const selectedEditSponsorLabel = React.useMemo(() => {
    if (!editForm.sponsor_id || editForm.sponsor_id === "none") {
      return "None"
    }

    const sponsor = sponsors.find((item) => String(item.id) === editForm.sponsor_id)
    if (sponsor) {
      return sponsor.full_name
    }

    return selectedCustomer?.sponsor_name || "None"
  }, [editForm.sponsor_id, sponsors, selectedCustomer])

  const validateCustomerForm = React.useCallback((form: CustomerForm): string | null => {
    const fullName = form.full_name.trim()
    if (!NAME_PATTERN.test(fullName)) {
      return "Full name is required and must be 2 to 120 valid characters."
    }

    const mobile = form.mobile_no.trim()
    if (!MOBILE_PATTERN.test(mobile)) {
      return "Mobile number format is invalid."
    }

    const email = form.email.trim()
    if (email && !EMAIL_PATTERN.test(email)) {
      return "Please enter a valid email address."
    }

    const openingBalance = Number(form.opening_balance || 0)
    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      return "Opening balance must be a non-negative number."
    }

    if (!form.registered_date) {
      return "Registered date is required."
    }

    return null
  }, [])

  const buildPayload = (form: CustomerForm): CustomerApiPayload => {
    return {
      full_name: form.full_name.trim(),
      gender: form.gender,
      address: form.address.trim() || null,
      mobile_no: form.mobile_no.trim(),
      email: form.email.trim() || null,
      customer_type: form.customer_type.trim() || "regular",
      sponsor_id: form.sponsor_id && form.sponsor_id !== "none" ? Number(form.sponsor_id) : null,
      opening_balance: Number(form.opening_balance || 0),
      balance_type: form.balance_type,
      registered_date: form.registered_date,
    }
  }

  const handleAddCustomer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationError = validateCustomerForm(addForm)
    if (validationError) {
      setFormError(validationError)
      appNotify.failed("Validation", validationError)
      return
    }

    setFormError(null)

    try {
      await createCustomer(buildPayload(addForm))
      setIsAddOpen(false)
      setAddForm(emptyForm)
      await loadCustomers()
      setPage(1)
      appNotify.created("Customer")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create customer"
      setError(message)
      appNotify.failed("Create customer", message)
    }
  }

  const handleEditCustomer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedCustomer) {
      return
    }

    const validationError = validateCustomerForm(editForm)
    if (validationError) {
      setFormError(validationError)
      appNotify.failed("Validation", validationError)
      return
    }

    setFormError(null)

    try {
      await updateCustomer(selectedCustomer.id, buildPayload(editForm))
      setIsEditOpen(false)
      setSelectedCustomer(null)
      await loadCustomers()
      appNotify.updated("Customer")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update customer"
      setError(message)
      appNotify.failed("Update customer", message)
    }
  }

  const handleDeleteCustomer = async () => {
    if (!deleteId) {
      return
    }

    try {
      await deleteCustomer(deleteId)
      setDeleteId(null)
      await loadCustomers()
      appNotify.deleted("Customer")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete customer"
      setError(message)
      appNotify.failed("Delete customer", message)
    }
  }

  const openViewModal = (customer: ApiCustomer) => {
    setSelectedCustomer(customer)
    setIsViewOpen(true)
  }

  const openEditModal = (customer: ApiCustomer) => {
    setSelectedCustomer(customer)
    setEditForm({
      full_name: customer.full_name,
      gender: customer.gender === "female" ? "female" : "male",
      address: customer.address || "",
      mobile_no: customer.mobile_no || "",
      email: customer.email || "",
      customer_type: customer.customer_type || "regular",
      sponsor_id: customer.sponsor_id ? String(customer.sponsor_id) : "none",
      opening_balance: String(customer.opening_balance ?? 0),
      balance_type: customer.balance_type || "credit",
      registered_date: new Date(customer.registered_date).toISOString().slice(0, 10),
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
                <CardTitle className="text-lg">Customers</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage all customer records with sponsor-name selection.
                </p>
                {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
                {formError ? <p className="mt-1 text-xs text-rose-600">{formError}</p> : null}
              </div>

              <Button className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]" onClick={() => setIsAddOpen(true)}>
                <PlusIcon className="mr-1 size-4" />
                Add Customer
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search customer name or mobile..."
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
                      <TableHead>Gender</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Sponsor</TableHead>
                      <TableHead>Opening Balance</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                          Loading customers...
                        </TableCell>
                      </TableRow>
                    ) : null}

                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.id}</TableCell>
                        <TableCell className="font-medium">{row.full_name}</TableCell>
                        <TableCell className="capitalize">{row.gender || "-"}</TableCell>
                        <TableCell>{row.mobile_no || "-"}</TableCell>
                        <TableCell>{row.email || "-"}</TableCell>
                        <TableCell className="capitalize">{row.customer_type || "regular"}</TableCell>
                        <TableCell>{row.sponsor_name || "None"}</TableCell>
                        <TableCell>${Number(row.opening_balance || 0).toFixed(2)}</TableCell>
                        <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openViewModal(row)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-[#3FA3D3]"
                              aria-label="View customer"
                            >
                              <EyeIcon className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(row)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-amber-600"
                              aria-label="Edit customer"
                            >
                              <PencilIcon className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(row.id)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-rose-600"
                              aria-label="Delete customer"
                            >
                              <TrashIcon className="size-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!loading && rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                          No customers found.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-start justify-between gap-2 text-sm text-muted-foreground md:flex-row md:items-center">
                <p>
                  Showing {(currentPage - 1) * PAGE_SIZE + (rows.length ? 1 : 0)}-
                  {(currentPage - 1) * PAGE_SIZE + rows.length} of {filteredCustomers.length} customers
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    <ChevronLeftIcon className="size-4" />
                    Previous
                  </Button>
                  <span className="rounded-md border px-3 py-1 text-sm text-foreground">{currentPage}</span>
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
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
            <DialogDescription>Insert customer details and save.</DialogDescription>
          </DialogHeader>

          <form id="add-customer-form" className="grid gap-3 py-2" onSubmit={handleAddCustomer}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
                <Input
                  value={addForm.full_name}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Gender *</label>
                <Select
                  value={addForm.gender}
                  onValueChange={(value) => setAddForm((prev) => ({ ...prev, gender: value === "female" ? "female" : "male" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Address</label>
              <Input
                value={addForm.address}
                onChange={(e) => setAddForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Street address"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Mobile Number *</label>
                <Input
                  value={addForm.mobile_no}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, mobile_no: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <Input
                  value={addForm.customer_type}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, customer_type: e.target.value }))}
                  placeholder="regular"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Sponsor</label>
                <Select
                  value={addForm.sponsor_id}
                  onValueChange={(value) => setAddForm((prev) => ({ ...prev, sponsor_id: value || "none" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sponsor">{selectedAddSponsorLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {sponsors.map((sponsor) => (
                      <SelectItem key={sponsor.id} value={String(sponsor.id)}>
                        {sponsor.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Opening Balance</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addForm.opening_balance}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, opening_balance: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Balance Type *</label>
                <Select
                  value={addForm.balance_type}
                  onValueChange={(value) => setAddForm((prev) => ({ ...prev, balance_type: value === "debit" ? "debit" : "credit" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="debit">Debit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Registered Date *</label>
                <Input
                  type="date"
                  value={addForm.registered_date}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, registered_date: e.target.value }))}
                />
              </div>
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-customer-form" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]">
              Save Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Update Customer</DialogTitle>
            <DialogDescription>Edit customer details and save changes.</DialogDescription>
          </DialogHeader>

          <form id="edit-customer-form" className="grid gap-3 py-2" onSubmit={handleEditCustomer}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
                <Input
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Gender *</label>
                <Select
                  value={editForm.gender}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, gender: value === "female" ? "female" : "male" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Address</label>
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Street address"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Mobile Number *</label>
                <Input
                  value={editForm.mobile_no}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, mobile_no: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <Input
                  value={editForm.customer_type}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, customer_type: e.target.value }))}
                  placeholder="regular"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Sponsor</label>
                <Select
                  value={editForm.sponsor_id}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, sponsor_id: value || "none" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sponsor">{selectedEditSponsorLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {sponsors.map((sponsor) => (
                      <SelectItem key={sponsor.id} value={String(sponsor.id)}>
                        {sponsor.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Opening Balance</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.opening_balance}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, opening_balance: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Balance Type *</label>
                <Select
                  value={editForm.balance_type}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, balance_type: value === "debit" ? "debit" : "credit" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="debit">Debit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Registered Date *</label>
                <Input
                  type="date"
                  value={editForm.registered_date}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, registered_date: e.target.value }))}
                />
              </div>
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-customer-form" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]">
              Update Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>View all customer information.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 text-sm">
            <div><span className="font-medium">Full Name:</span> {selectedCustomer?.full_name || "-"}</div>
            <div><span className="font-medium">Gender:</span> {selectedCustomer?.gender || "-"}</div>
            <div><span className="font-medium">Mobile:</span> {selectedCustomer?.mobile_no || "-"}</div>
            <div><span className="font-medium">Email:</span> {selectedCustomer?.email || "-"}</div>
            <div><span className="font-medium">Type:</span> {selectedCustomer?.customer_type || "regular"}</div>
            <div><span className="font-medium">Sponsor:</span> {selectedCustomer?.sponsor_name || "None"}</div>
            <div><span className="font-medium">Opening Balance:</span> ${Number(selectedCustomer?.opening_balance || 0).toFixed(2)}</div>
            <div><span className="font-medium">Balance Type:</span> {selectedCustomer?.balance_type || "-"}</div>
            <div><span className="font-medium">Address:</span> {selectedCustomer?.address || "-"}</div>
            <div>
              <span className="font-medium">Created At:</span>{" "}
              {selectedCustomer ? new Date(selectedCustomer.created_at).toLocaleString() : "-"}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected customer will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={handleDeleteCustomer}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}
