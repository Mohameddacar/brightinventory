"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
import {
  createCustomer,
  createCustomerReceipt,
  deleteCustomer,
  getCustomerReceipts,
  getCustomers,
  getSales,
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
  EyeIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  WalletCardsIcon,
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

type ApiSale = {
  id: number
  invoice_no: string
  customer_id: number
  invoice_date: string
  grand_total: string | number
  paid: string | number
  rest: string | number
}

type ApiCustomerReceipt = {
  id: number
  customer_id: number
  invoice_no: number
  payment_mode: string
  amount: string | number
  remarks: string | null
  created_at: string
}

type ReceiptPaymentStatus = "not-paid" | "partial" | "full-paid"

type CustomerSaleSummary = ApiSale & {
  initialPaidAmount: number
  paidThroughReceipts: number
  totalPaidAmount: number
  effectiveOutstanding: number
  paymentStatus: ReceiptPaymentStatus
}

type CustomerActionKey = "customer-detail" | "edit-customer" | "delete-customer" | "customer-receipts"

type CustomerAction = {
  key: CustomerActionKey
  label: string
  icon: React.ComponentType<{ className?: string }>
  isDanger?: boolean
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

type CustomerReceiptForm = {
  invoice_id: string
  invoice_date: string
  customer_id: string
  payment_mode: string
  amount: string
  remarks: string
}

const PAGE_SIZE = 10
const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'.-]{1,119}$/
const MOBILE_PATTERN = /^[+0-9][0-9\-\s]{6,29}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ACTION_ITEMS: CustomerAction[] = [
  { key: "customer-detail", label: "Customer Details", icon: EyeIcon },
  { key: "edit-customer", label: "Edit Customer", icon: PencilIcon },
  { key: "customer-receipts", label: "Customer Receipts", icon: WalletCardsIcon },
  { key: "delete-customer", label: "Delete Customer", icon: TrashIcon, isDanger: true },
]

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

const getDefaultReceiptForm = (sale?: CustomerSaleSummary | null): CustomerReceiptForm => ({
  invoice_id: sale ? String(sale.id) : "",
  invoice_date: new Date().toISOString().slice(0, 16),
  customer_id: sale ? String(sale.customer_id) : "",
  payment_mode: "cash",
  amount: sale ? String(sale.effectiveOutstanding.toFixed(2)) : "0",
  remarks: "",
})

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatCurrency(value: string | number | null | undefined) {
  return `$${toNumber(value).toFixed(2)}`
}

function getPaymentStatus(outstanding: number, totalPaid: number): ReceiptPaymentStatus {
  if (outstanding <= 0) {
    return "full-paid"
  }

  if (totalPaid <= 0) {
    return "not-paid"
  }

  return "partial"
}

export default function CustomersPage() {
  const [customers, setCustomers] = React.useState<ApiCustomer[]>([])
  const [sponsors, setSponsors] = React.useState<ApiSponsor[]>([])
  const [sales, setSales] = React.useState<ApiSale[]>([])
  const [customerReceipts, setCustomerReceipts] = React.useState<ApiCustomerReceipt[]>([])

  const [searchTerm, setSearchTerm] = React.useState("")
  const [page, setPage] = React.useState(1)

  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isViewOpen, setIsViewOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isReceiptsOpen, setIsReceiptsOpen] = React.useState(false)
  const [isAddReceiptOpen, setIsAddReceiptOpen] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  const [selectedCustomer, setSelectedCustomer] = React.useState<ApiCustomer | null>(null)
  const [addForm, setAddForm] = React.useState<CustomerForm>(emptyForm)
  const [editForm, setEditForm] = React.useState<CustomerForm>(emptyForm)
  const [receiptForm, setReceiptForm] = React.useState<CustomerReceiptForm>(getDefaultReceiptForm())

  const [loading, setLoading] = React.useState(true)
  const [financeLoading, setFinanceLoading] = React.useState(true)
  const [receiptSubmitLoading, setReceiptSubmitLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [receiptError, setReceiptError] = React.useState<string | null>(null)

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

  const loadFinanceData = React.useCallback(async () => {
    setFinanceLoading(true)

    try {
      const [saleData, receiptData] = await Promise.all([
        getSales<ApiSale[]>(),
        getCustomerReceipts<ApiCustomerReceipt[]>(),
      ])

      setSales(Array.isArray(saleData) ? saleData : [])
      setCustomerReceipts(Array.isArray(receiptData) ? receiptData : [])
    } catch {
      // Keep current finance data if loading fails.
    } finally {
      setFinanceLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadCustomers()
    void loadSponsors()
    void loadFinanceData()
  }, [loadCustomers, loadSponsors, loadFinanceData])

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

  const selectedCustomerReceipts = React.useMemo(() => {
    if (!selectedCustomer) {
      return []
    }

    return customerReceipts
      .filter((item) => Number(item.customer_id) === Number(selectedCustomer.id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [customerReceipts, selectedCustomer])

  const selectedCustomerSales = React.useMemo(() => {
    if (!selectedCustomer) {
      return []
    }

    return sales
      .filter((item) => Number(item.customer_id) === Number(selectedCustomer.id))
      .sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime())
  }, [sales, selectedCustomer])

  const selectedCustomerReceiptsBySaleId = React.useMemo(() => {
    const totals = new Map<number, number>()

    for (const receipt of selectedCustomerReceipts) {
      const saleId = Number(receipt.invoice_no)
      const current = totals.get(saleId) || 0
      totals.set(saleId, current + toNumber(receipt.amount))
    }

    return totals
  }, [selectedCustomerReceipts])

  const selectedCustomerSaleSummaries = React.useMemo<CustomerSaleSummary[]>(() => {
    return selectedCustomerSales.map((sale) => {
      const grandTotal = toNumber(sale.grand_total)
      const rawDue = toNumber(sale.rest)
      const baseDue = Math.max(0, rawDue)
      const initialPaidAmount = Math.max(0, grandTotal - baseDue)
      const paidThroughReceipts = selectedCustomerReceiptsBySaleId.get(Number(sale.id)) || 0
      const totalPaidAmount = Math.min(grandTotal, initialPaidAmount + paidThroughReceipts)
      const effectiveOutstanding = Math.max(0, grandTotal - totalPaidAmount)
      const paymentStatus = getPaymentStatus(effectiveOutstanding, totalPaidAmount)

      return {
        ...sale,
        initialPaidAmount,
        paidThroughReceipts,
        totalPaidAmount,
        effectiveOutstanding,
        paymentStatus,
      }
    })
  }, [selectedCustomerSales, selectedCustomerReceiptsBySaleId])

  const selectedCustomerOutstandingSales = React.useMemo(() => {
    return selectedCustomerSaleSummaries.filter((item) => item.effectiveOutstanding > 0)
  }, [selectedCustomerSaleSummaries])

  const selectedCustomerOutstandingTotal = React.useMemo(() => {
    return selectedCustomerOutstandingSales.reduce((sum, item) => sum + item.effectiveOutstanding, 0)
  }, [selectedCustomerOutstandingSales])

  const selectedInvoice = React.useMemo<CustomerSaleSummary | null>(() => {
    if (!receiptForm.invoice_id) {
      return null
    }

    return (
      selectedCustomerOutstandingSales.find(
        (item) => Number(item.id) === Number(receiptForm.invoice_id)
      ) || null
    )
  }, [selectedCustomerOutstandingSales, receiptForm.invoice_id])

  const salesById = React.useMemo(() => {
    return new Map(selectedCustomerSaleSummaries.map((item) => [Number(item.id), item]))
  }, [selectedCustomerSaleSummaries])

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

  const openReceiptsModal = async (customer: ApiCustomer) => {
    setSelectedCustomer(customer)
    setReceiptError(null)
    setIsReceiptsOpen(true)
    await loadFinanceData()
  }

  const openAddReceiptModal = (customer: ApiCustomer) => {
    const dueInvoices = selectedCustomerSaleSummaries
      .filter((item) => Number(item.customer_id) === Number(customer.id) && item.effectiveOutstanding > 0)
      .sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime())

    const firstDueInvoice = dueInvoices[0] || null

    setSelectedCustomer(customer)
    setReceiptError(null)
    setReceiptForm(getDefaultReceiptForm(firstDueInvoice))
    setIsAddReceiptOpen(true)
  }

  const handleCustomerActionClick = async (action: CustomerAction, customer: ApiCustomer) => {
    if (action.key === "customer-detail") {
      openViewModal(customer)
      return
    }

    if (action.key === "edit-customer") {
      openEditModal(customer)
      return
    }

    if (action.key === "delete-customer") {
      setDeleteId(customer.id)
      return
    }

    if (action.key === "customer-receipts") {
      await openReceiptsModal(customer)
    }
  }

  const handleCustomerReceiptSubmit = async () => {
    if (!selectedCustomer) {
      return
    }

    const selectedSaleId = Number(receiptForm.invoice_id)
    if (!selectedSaleId) {
      const message = "Invoice is required."
      setReceiptError(message)
      appNotify.failed("Add Customer Receipt", message)
      return
    }

    if (!receiptForm.invoice_date) {
      const message = "Invoice date is required."
      setReceiptError(message)
      appNotify.failed("Add Customer Receipt", message)
      return
    }

    const paymentAmount = toNumber(receiptForm.amount)
    if (paymentAmount <= 0) {
      const message = "Amount must be greater than 0."
      setReceiptError(message)
      appNotify.failed("Add Customer Receipt", message)
      return
    }

    if (selectedInvoice && selectedInvoice.paymentStatus === "full-paid") {
      const message = "This invoice is already fully paid."
      setReceiptError(message)
      appNotify.failed("Add Customer Receipt", message)
      return
    }

    const invoiceOutstanding = toNumber(selectedInvoice?.effectiveOutstanding)
    if (selectedInvoice && paymentAmount > invoiceOutstanding) {
      const message = `Amount cannot exceed outstanding balance (${formatCurrency(invoiceOutstanding)}).`
      setReceiptError(message)
      appNotify.failed("Add Customer Receipt", message)
      return
    }

    setReceiptSubmitLoading(true)
    setReceiptError(null)

    try {
      await createCustomerReceipt({
        customer_id: Number(selectedCustomer.id),
        invoice_no: selectedSaleId,
        payment_mode: receiptForm.payment_mode,
        amount: paymentAmount,
        remarks: receiptForm.remarks.trim() ? receiptForm.remarks.trim() : null,
        created_at: new Date(receiptForm.invoice_date).toISOString(),
      })

      setIsAddReceiptOpen(false)
      setIsReceiptsOpen(true)
      await Promise.all([loadCustomers(), loadFinanceData()])
      appNotify.completed("Customer Receipt", "Customer receipt saved successfully.")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save customer receipt"
      setReceiptError(message)
      appNotify.failed("Add Customer Receipt", message)
    } finally {
      setReceiptSubmitLoading(false)
    }
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
                  Manage all customer records and customer receipts from customer actions.
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
                        <TableCell>{formatCurrency(row.opening_balance || 0)}</TableCell>
                        <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button className="bg-linear-to-r from-[#5ea5ff] to-[#3f83f8] text-white hover:from-[#4f97f6] hover:to-[#2f75eb]" />}>
                              Action
                              <ChevronDownIcon className="ml-1 size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              {ACTION_ITEMS.map((action) => {
                                const ActionIcon = action.icon

                                return (
                                  <React.Fragment key={action.key}>
                                    {action.isDanger ? <DropdownMenuSeparator /> : null}
                                    <DropdownMenuItem
                                      variant={action.isDanger ? "destructive" : "default"}
                                      onClick={() => {
                                        void handleCustomerActionClick(action, row)
                                      }}
                                    >
                                      <ActionIcon className="size-4" />
                                      <span>{action.label}</span>
                                    </DropdownMenuItem>
                                  </React.Fragment>
                                )
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
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
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              Customer profile, outstanding invoices, and recent invoice status.
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer ? (
            <div className="space-y-4 p-2">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-semibold">Customer Info</p>
                  <p className="text-sm font-medium">{selectedCustomer.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.email || "-"}</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.mobile_no || "-"}</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.address || "-"}</p>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-semibold">Balance Overview</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Opening Balance</span>
                      <span>{formatCurrency(selectedCustomer.opening_balance || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Outstanding Invoices</span>
                      <span>{selectedCustomerOutstandingSales.length}</span>
                    </div>
                    <div className="flex items-center justify-between font-semibold text-rose-600">
                      <span>Total Outstanding</span>
                      <span>{formatCurrency(selectedCustomerOutstandingTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-semibold">Customer Meta</p>
                  <p className="text-sm">Type: {selectedCustomer.customer_type || "regular"}</p>
                  <p className="text-sm">Sponsor: {selectedCustomer.sponsor_name || "None"}</p>
                  <p className="text-sm">Receipts: {selectedCustomerReceipts.length}</p>
                </div>
              </div>

              <div className="rounded-lg border">
                <div className="border-b px-4 py-3 text-sm font-semibold">Recent Invoices</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Invoice Date</TableHead>
                      <TableHead>Grand Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCustomerSaleSummaries.length > 0 ? (
                      selectedCustomerSaleSummaries.slice(0, 5).map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">{sale.invoice_no}</TableCell>
                          <TableCell>{new Date(sale.invoice_date).toLocaleString()}</TableCell>
                          <TableCell>{formatCurrency(sale.grand_total)}</TableCell>
                          <TableCell>{formatCurrency(sale.totalPaidAmount)}</TableCell>
                          <TableCell className="font-semibold text-rose-600">{formatCurrency(sale.effectiveOutstanding)}</TableCell>
                          <TableCell>
                            <span
                              className={
                                sale.paymentStatus === "full-paid"
                                  ? "font-medium text-emerald-600"
                                  : sale.paymentStatus === "partial"
                                    ? "font-medium text-amber-600"
                                    : "font-medium text-rose-600"
                              }
                            >
                              {sale.paymentStatus === "full-paid"
                                ? "Full Paid"
                                : sale.paymentStatus === "partial"
                                  ? "Partial"
                                  : "Not Paid"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                          No invoices found for this customer.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReceiptsOpen} onOpenChange={setIsReceiptsOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Customer Receipts</DialogTitle>
            <DialogDescription>
              Review receipt history and settle outstanding customer invoices.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-2">
            {selectedCustomer ? (
              <div className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Customer: {selectedCustomer.full_name}</p>
                    <p className="text-muted-foreground">Email: {selectedCustomer.email || "-"}</p>
                  </div>
                  <div className="text-right">
                    <p>Outstanding Invoices: {selectedCustomerOutstandingSales.length}</p>
                    <p className="font-semibold text-rose-600">Outstanding Balance: {formatCurrency(selectedCustomerOutstandingTotal)}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-end">
              <Button
                type="button"
                className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]"
                onClick={() => {
                  if (!selectedCustomer) {
                    return
                  }
                  openAddReceiptModal(selectedCustomer)
                }}
              >
                <PlusIcon className="mr-1 size-4" />
                Add Customer Receipt
              </Button>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financeLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                        Loading customer receipts...
                      </TableCell>
                    </TableRow>
                  ) : selectedCustomerReceipts.length > 0 ? (
                    selectedCustomerReceipts.map((receipt) => {
                      const sale = salesById.get(Number(receipt.invoice_no))

                      return (
                        <TableRow key={receipt.id}>
                          <TableCell>{new Date(receipt.created_at).toLocaleString()}</TableCell>
                          <TableCell>{sale?.invoice_no || `Invoice #${receipt.invoice_no}`}</TableCell>
                          <TableCell className="capitalize">{receipt.payment_mode || "cash"}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(receipt.amount)}</TableCell>
                          <TableCell>{receipt.remarks || "-"}</TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                        No customer receipt records yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsReceiptsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddReceiptOpen} onOpenChange={setIsAddReceiptOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Customer Receipt</DialogTitle>
            <DialogDescription>HOME / CUSTOMER RECEIPT</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-2">
            {receiptError ? <p className="text-sm text-rose-600">{receiptError}</p> : null}

            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-semibold">Section: INVOICE DETAILS</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Invoice</label>
                  <Select
                    value={receiptForm.invoice_id}
                    onValueChange={(value) => {
                      const invoice = selectedCustomerOutstandingSales.find(
                        (item) => Number(item.id) === Number(value)
                      )

                      setReceiptForm((prev) => ({
                        ...prev,
                        invoice_id: value ? String(value) : "",
                        customer_id: selectedCustomer ? String(selectedCustomer.id) : "",
                        amount: invoice ? String(invoice.effectiveOutstanding.toFixed(2)) : prev.amount,
                      }))
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCustomerOutstandingSales.length > 0 ? (
                        selectedCustomerOutstandingSales.map((invoice) => (
                          <SelectItem key={invoice.id} value={String(invoice.id)}>
                            {invoice.invoice_no} - Due {formatCurrency(invoice.effectiveOutstanding)}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No outstanding invoices
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Invoice Date</label>
                  <Input
                    type="datetime-local"
                    value={receiptForm.invoice_date}
                    placeholder="mm/dd/yyyy"
                    onChange={(e) => setReceiptForm((prev) => ({ ...prev, invoice_date: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-semibold">Section: CUSTOMER DETAILS</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Customer Name</label>
                  <Input value={selectedCustomer?.full_name || ""} placeholder="Select Customer" readOnly />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Balance</label>
                  <Input value={formatCurrency(selectedInvoice?.effectiveOutstanding || 0)} placeholder="$ 0.00" readOnly />
                </div>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-semibold">Section: PAYMENT DETAILS</p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Payment Mode</label>
                  <Select
                    value={receiptForm.payment_mode}
                    onValueChange={(value) => setReceiptForm((prev) => ({ ...prev, payment_mode: value || "cash" }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Amount</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={receiptForm.amount}
                    placeholder="$ 0.00"
                    onChange={(e) => setReceiptForm((prev) => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Remarks</label>
                <Input
                  value={receiptForm.remarks}
                  placeholder="Add any additional notes here..."
                  onChange={(e) => setReceiptForm((prev) => ({ ...prev, remarks: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddReceiptOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]"
              onClick={handleCustomerReceiptSubmit}
              disabled={receiptSubmitLoading || selectedCustomerOutstandingSales.length === 0}
            >
              {receiptSubmitLoading ? "Saving..." : "Save Receipt"}
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
