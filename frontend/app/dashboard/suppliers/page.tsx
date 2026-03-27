"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
import {
  createSupplier,
  createSupplierPayment,
  deleteSupplier,
  getPurchases,
  getSupplierPayments,
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

type ApiPurchase = {
  id: number
  transaction_number: string
  supplier_id: number
  purchase_date: string
  grand_total: string | number
  paid: string | number
  rest: string | number
}

type ApiSupplierPayment = {
  id: number
  supplier_id: number
  purchase_id: number | null
  payment_mode: string
  amount: string | number
  remarks: string | null
  payment_date: string
}

type PurchasePaymentStatus = "not-paid" | "partial" | "full-paid"

type SupplierPurchaseSummary = ApiPurchase & {
  initialPaidAmount: number
  paidThroughPayments: number
  totalPaidAmount: number
  effectiveOutstanding: number
  paymentStatus: PurchasePaymentStatus
}

type SupplierActionKey = "supplier-detail" | "edit-supplier" | "delete-supplier" | "supplier-payments"

type SupplierAction = {
  key: SupplierActionKey
  label: string
  icon: React.ComponentType<{ className?: string }>
  isDanger?: boolean
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

type SupplierPaymentForm = {
  purchase_id: string
  payment_date: string
  payment_mode: string
  cash_amount: string
  amount: string
  remarks: string
}

const PAGE_SIZE = 10
const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'.-]*$/
const MOBILE_PATTERN = /^[+0-9][0-9\-\s]{6,29}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ACTION_ITEMS: SupplierAction[] = [
  { key: "supplier-detail", label: "Supplier Details", icon: EyeIcon },
  { key: "edit-supplier", label: "Edit Supplier", icon: PencilIcon },
  { key: "supplier-payments", label: "Supplier Payments", icon: WalletCardsIcon },
  { key: "delete-supplier", label: "Delete Supplier", icon: TrashIcon, isDanger: true },
]

const emptyForm: SupplierForm = {
  full_name: "",
  mobile_no: "",
  address: "",
  email: "",
  registered_date: "",
  opening_balance: "0",
  balance_type: "none",
}

const getDefaultPaymentForm = (purchase?: SupplierPurchaseSummary | null): SupplierPaymentForm => ({
  purchase_id: purchase ? String(purchase.id) : "",
  payment_date: new Date().toISOString().slice(0, 16),
  payment_mode: "cash",
  cash_amount: purchase ? String(purchase.effectiveOutstanding.toFixed(2)) : "0",
  amount: purchase ? String(purchase.effectiveOutstanding.toFixed(2)) : "0",
  remarks: "",
})

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatCurrency(value: string | number | null | undefined) {
  return `$${toNumber(value).toFixed(2)}`
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-CA")
}

function getPurchasePaymentStatus(outstanding: number, totalPaid: number): PurchasePaymentStatus {
  if (outstanding <= 0) {
    return "full-paid"
  }

  if (totalPaid <= 0) {
    return "not-paid"
  }

  return "partial"
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = React.useState<ApiSupplier[]>([])
  const [purchases, setPurchases] = React.useState<ApiPurchase[]>([])
  const [supplierPayments, setSupplierPayments] = React.useState<ApiSupplierPayment[]>([])

  const [searchTerm, setSearchTerm] = React.useState("")
  const [page, setPage] = React.useState(1)

  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isViewOpen, setIsViewOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isPaymentsOpen, setIsPaymentsOpen] = React.useState(false)
  const [isAddPaymentOpen, setIsAddPaymentOpen] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  const [selectedSupplier, setSelectedSupplier] = React.useState<ApiSupplier | null>(null)
  const [addForm, setAddForm] = React.useState<SupplierForm>(emptyForm)
  const [editForm, setEditForm] = React.useState<SupplierForm>(emptyForm)
  const [paymentForm, setPaymentForm] = React.useState<SupplierPaymentForm>(getDefaultPaymentForm())

  const [loading, setLoading] = React.useState(true)
  const [financeLoading, setFinanceLoading] = React.useState(true)
  const [paymentSubmitLoading, setPaymentSubmitLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [paymentError, setPaymentError] = React.useState<string | null>(null)

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

  const loadFinanceData = React.useCallback(async () => {
    setFinanceLoading(true)

    try {
      const [purchaseData, paymentData] = await Promise.all([
        getPurchases<ApiPurchase[]>(),
        getSupplierPayments<ApiSupplierPayment[]>(),
      ])

      setPurchases(Array.isArray(purchaseData) ? purchaseData : [])
      setSupplierPayments(Array.isArray(paymentData) ? paymentData : [])
    } catch {
      // Finance sub-panels remain available with currently loaded data.
    } finally {
      setFinanceLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadSuppliers()
    void loadFinanceData()
  }, [loadSuppliers, loadFinanceData])

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

  const selectedSupplierPurchases = React.useMemo(() => {
    if (!selectedSupplier) {
      return []
    }

    return purchases
      .filter((item) => Number(item.supplier_id) === Number(selectedSupplier.id))
      .sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime())
  }, [purchases, selectedSupplier])

  const selectedSupplierPayments = React.useMemo(() => {
    if (!selectedSupplier) {
      return []
    }

    return supplierPayments
      .filter((item) => Number(item.supplier_id) === Number(selectedSupplier.id))
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
  }, [supplierPayments, selectedSupplier])

  const selectedSupplierPaymentsByPurchaseId = React.useMemo(() => {
    const totals = new Map<number, number>()

    for (const payment of selectedSupplierPayments) {
      if (!payment.purchase_id) {
        continue
      }

      const purchaseId = Number(payment.purchase_id)
      const current = totals.get(purchaseId) || 0
      totals.set(purchaseId, current + toNumber(payment.amount))
    }

    return totals
  }, [selectedSupplierPayments])

  const selectedSupplierPurchaseSummaries = React.useMemo<SupplierPurchaseSummary[]>(() => {
    return selectedSupplierPurchases.map((purchase) => {
      const grandTotal = toNumber(purchase.grand_total)
      const rawDue = toNumber(purchase.rest)
      const baseDue = Math.max(0, rawDue)
      const initialPaidAmount = Math.max(0, grandTotal - baseDue)
      const paidThroughPayments = selectedSupplierPaymentsByPurchaseId.get(Number(purchase.id)) || 0
      const totalPaidAmount = Math.min(grandTotal, initialPaidAmount + paidThroughPayments)
      const effectiveOutstanding = Math.max(0, grandTotal - totalPaidAmount)
      const paymentStatus = getPurchasePaymentStatus(effectiveOutstanding, totalPaidAmount)

      return {
        ...purchase,
        initialPaidAmount,
        paidThroughPayments,
        totalPaidAmount,
        effectiveOutstanding,
        paymentStatus,
      }
    })
  }, [selectedSupplierPurchases, selectedSupplierPaymentsByPurchaseId])

  const selectedSupplierOutstandingPurchases = React.useMemo(() => {
    return selectedSupplierPurchaseSummaries.filter((item) => item.effectiveOutstanding > 0)
  }, [selectedSupplierPurchaseSummaries])

  const selectedSupplierOutstandingTotal = React.useMemo(() => {
    return selectedSupplierOutstandingPurchases.reduce(
      (sum, item) => sum + item.effectiveOutstanding,
      0
    )
  }, [selectedSupplierOutstandingPurchases])

  const selectedInvoice = React.useMemo<SupplierPurchaseSummary | null>(() => {
    if (!paymentForm.purchase_id) {
      return null
    }

    return (
      selectedSupplierOutstandingPurchases.find(
        (item) => Number(item.id) === Number(paymentForm.purchase_id)
      ) || null
    )
  }, [selectedSupplierOutstandingPurchases, paymentForm.purchase_id])

  const purchaseById = React.useMemo(() => {
    return new Map(selectedSupplierPurchaseSummaries.map((item) => [Number(item.id), item]))
  }, [selectedSupplierPurchaseSummaries])

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

  const openPaymentsModal = async (supplier: ApiSupplier) => {
    setSelectedSupplier(supplier)
    setPaymentError(null)
    setIsPaymentsOpen(true)
    await loadFinanceData()
  }

  const openAddPaymentModal = (supplier: ApiSupplier) => {
    const duePurchases = selectedSupplierPurchaseSummaries
      .filter((item) => Number(item.supplier_id) === Number(supplier.id) && item.effectiveOutstanding > 0)
      .sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime())

    const firstDuePurchase = duePurchases[0] || null

    setSelectedSupplier(supplier)
    setPaymentError(null)
    setPaymentForm(getDefaultPaymentForm(firstDuePurchase))
    setIsAddPaymentOpen(true)
  }

  const handleSupplierActionClick = async (action: SupplierAction, supplier: ApiSupplier) => {
    if (action.key === "supplier-detail") {
      openViewModal(supplier)
      return
    }

    if (action.key === "edit-supplier") {
      openEditModal(supplier)
      return
    }

    if (action.key === "delete-supplier") {
      setDeleteId(supplier.id)
      return
    }

    if (action.key === "supplier-payments") {
      await openPaymentsModal(supplier)
    }
  }

  const handleSupplierPaymentSubmit = async () => {
    if (!selectedSupplier) {
      return
    }

    const selectedPurchaseId = Number(paymentForm.purchase_id)
    if (!selectedPurchaseId) {
      const message = "Invoice number is required."
      setPaymentError(message)
      appNotify.failed("Add Supplier Payment", message)
      return
    }

    if (!paymentForm.payment_date) {
      const message = "Payment date is required."
      setPaymentError(message)
      appNotify.failed("Add Supplier Payment", message)
      return
    }

    const paymentAmount = toNumber(paymentForm.amount)
    if (paymentAmount <= 0) {
      const message = "Payment amount must be greater than 0."
      setPaymentError(message)
      appNotify.failed("Add Supplier Payment", message)
      return
    }

    const cashAmount = toNumber(paymentForm.cash_amount)
    if (cashAmount < 0) {
      const message = "Cash amount cannot be negative."
      setPaymentError(message)
      appNotify.failed("Add Supplier Payment", message)
      return
    }

    if (cashAmount > paymentAmount) {
      const message = "Cash amount cannot be greater than payment amount."
      setPaymentError(message)
      appNotify.failed("Add Supplier Payment", message)
      return
    }

    const invoiceOutstanding = toNumber(selectedInvoice?.effectiveOutstanding)
    if (selectedInvoice && paymentAmount > invoiceOutstanding) {
      const message = `Payment amount cannot exceed outstanding balance (${formatCurrency(invoiceOutstanding)}).`
      setPaymentError(message)
      appNotify.failed("Add Supplier Payment", message)
      return
    }

    if (selectedInvoice && selectedInvoice.paymentStatus === "full-paid") {
      const message = "This invoice is already fully paid."
      setPaymentError(message)
      appNotify.failed("Add Supplier Payment", message)
      return
    }

    setPaymentSubmitLoading(true)
    setPaymentError(null)

    try {
      const remarksParts: string[] = []
      if (cashAmount > 0) {
        remarksParts.push(`Cash Amount: ${formatCurrency(cashAmount)}`)
      }
      if (paymentForm.remarks.trim()) {
        remarksParts.push(paymentForm.remarks.trim())
      }

      await createSupplierPayment({
        supplier_id: Number(selectedSupplier.id),
        purchase_id: selectedPurchaseId,
        payment_mode: paymentForm.payment_mode,
        amount: paymentAmount,
        payment_date: new Date(paymentForm.payment_date).toISOString(),
        remarks: remarksParts.length > 0 ? remarksParts.join(" | ") : null,
      })

      setIsAddPaymentOpen(false)
      setIsPaymentsOpen(true)
      await Promise.all([loadSuppliers(), loadFinanceData()])
      appNotify.completed("Supplier Payment", "Supplier payment submitted successfully.")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit supplier payment"
      setPaymentError(message)
      appNotify.failed("Add Supplier Payment", message)
    } finally {
      setPaymentSubmitLoading(false)
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
                <CardTitle className="text-lg">Suppliers</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage supplier records, balances, and supplier payments.
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
                        <TableCell>{formatCurrency(row.opening_balance || 0)}</TableCell>
                        <TableCell className="capitalize">{row.balance_type}</TableCell>
                        <TableCell>{new Date(row.registered_date).toLocaleDateString()}</TableCell>
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
                                        void handleSupplierActionClick(action, row)
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
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Supplier Details</DialogTitle>
            <DialogDescription>
              Supplier profile, outstanding balances, and recent purchase activity.
            </DialogDescription>
          </DialogHeader>

          {selectedSupplier ? (
            <div className="space-y-4 p-2">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-semibold">Supplier Info</p>
                  <p className="text-sm font-medium">{selectedSupplier.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedSupplier.email || "-"}</p>
                  <p className="text-sm text-muted-foreground">{selectedSupplier.mobile_no || "-"}</p>
                  <p className="text-sm text-muted-foreground">{selectedSupplier.address || "-"}</p>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-semibold">Balance Overview</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Opening Balance</span>
                      <span>{formatCurrency(selectedSupplier.opening_balance || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Balance Type</span>
                      <span className="capitalize">{selectedSupplier.balance_type}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Outstanding Purchases</span>
                      <span>{selectedSupplierOutstandingPurchases.length}</span>
                    </div>
                    <div className="flex items-center justify-between font-semibold text-rose-600">
                      <span>Total Outstanding</span>
                      <span>{formatCurrency(selectedSupplierOutstandingTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-semibold">Supplier Meta</p>
                  <p className="text-sm">Registered: {new Date(selectedSupplier.registered_date).toLocaleDateString()}</p>
                  <p className="text-sm">Created: {new Date(selectedSupplier.created_at).toLocaleString()}</p>
                  <p className="text-sm">Payment Records: {selectedSupplierPayments.length}</p>
                </div>
              </div>

              <div className="rounded-lg border">
                <div className="border-b px-4 py-3 text-sm font-semibold">Recent Purchases</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Purchase Date</TableHead>
                      <TableHead>Grand Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSupplierPurchaseSummaries.length > 0 ? (
                      selectedSupplierPurchaseSummaries.slice(0, 5).map((purchase) => (
                        <TableRow key={purchase.id}>
                          <TableCell className="font-medium">{purchase.transaction_number}</TableCell>
                          <TableCell>{new Date(purchase.purchase_date).toLocaleString()}</TableCell>
                          <TableCell>{formatCurrency(purchase.grand_total)}</TableCell>
                          <TableCell>{formatCurrency(purchase.totalPaidAmount)}</TableCell>
                          <TableCell className="font-semibold text-rose-600">{formatCurrency(purchase.effectiveOutstanding)}</TableCell>
                          <TableCell>
                            <span
                              className={
                                purchase.paymentStatus === "full-paid"
                                  ? "font-medium text-emerald-600"
                                  : purchase.paymentStatus === "partial"
                                    ? "font-medium text-amber-600"
                                    : "font-medium text-rose-600"
                              }
                            >
                              {purchase.paymentStatus === "full-paid"
                                ? "Full Paid"
                                : purchase.paymentStatus === "partial"
                                  ? "Partial"
                                  : "Not Paid"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                          No purchases found for this supplier.
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

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
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

      <Dialog open={isPaymentsOpen} onOpenChange={setIsPaymentsOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Supplier Payments</DialogTitle>
            <DialogDescription>
              Review payment history and settle outstanding supplier balances.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-2">
            {selectedSupplier ? (
              <div className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Supplier: {selectedSupplier.full_name}</p>
                    <p className="text-muted-foreground">Email: {selectedSupplier.email || "-"}</p>
                  </div>
                  <div className="text-right">
                    <p>Outstanding Purchases: {selectedSupplierOutstandingPurchases.length}</p>
                    <p className="font-semibold text-rose-600">Outstanding Balance: {formatCurrency(selectedSupplierOutstandingTotal)}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-end">
              <Button
                type="button"
                className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]"
                onClick={() => {
                  if (!selectedSupplier) {
                    return
                  }
                  openAddPaymentModal(selectedSupplier)
                }}
              >
                <PlusIcon className="mr-1 size-4" />
                Add Supplier Payment
              </Button>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Remarks / Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financeLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                        Loading supplier payments...
                      </TableCell>
                    </TableRow>
                  ) : selectedSupplierPayments.length > 0 ? (
                    selectedSupplierPayments.map((payment) => {
                      const purchase = payment.purchase_id
                        ? purchaseById.get(Number(payment.purchase_id))
                        : null

                      return (
                        <TableRow key={payment.id}>
                          <TableCell>{new Date(payment.payment_date).toLocaleString()}</TableCell>
                          <TableCell>{purchase?.transaction_number || "-"}</TableCell>
                          <TableCell className="capitalize">{payment.payment_mode || "cash"}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>{payment.remarks || "-"}</TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                        No supplier payment records yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsPaymentsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Supplier Payment</DialogTitle>
            <DialogDescription>
              Record a payment made to supplier for outstanding purchase invoices.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-2">
            {paymentError ? <p className="text-sm text-rose-600">{paymentError}</p> : null}

            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-semibold">Section 1: Invoice Information</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Invoice Number</label>
                  <Select
                    value={paymentForm.purchase_id}
                    onValueChange={(value) => {
                      const invoice = selectedSupplierOutstandingPurchases.find(
                        (item) => Number(item.id) === Number(value)
                      )

                      setPaymentForm((prev) => ({
                        ...prev,
                        purchase_id: value ? String(value) : "",
                        amount: invoice ? String(invoice.effectiveOutstanding.toFixed(2)) : prev.amount,
                        cash_amount: invoice ? String(invoice.effectiveOutstanding.toFixed(2)) : prev.cash_amount,
                      }))
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedSupplierOutstandingPurchases.length > 0 ? (
                        selectedSupplierOutstandingPurchases.map((invoice) => (
                          <SelectItem key={invoice.id} value={String(invoice.id)}>
                            {invoice.transaction_number} - Due {formatCurrency(invoice.effectiveOutstanding)}
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
                  <label className="text-xs font-medium text-muted-foreground">Purchase Date</label>
                  <Input value={selectedInvoice ? new Date(selectedInvoice.purchase_date).toLocaleString() : "-"} readOnly />
                </div>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-semibold">Section 2: Supplier Information</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Supplier</label>
                  <Input value={selectedSupplier?.full_name || "-"} readOnly />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Outstanding Balance</label>
                  <Input value={formatCurrency(selectedInvoice?.effectiveOutstanding || 0)} readOnly />
                </div>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-semibold">Section 3: Payment Information</p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Payment Method</label>
                  <Select
                    value={paymentForm.payment_mode}
                    onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, payment_mode: value || "cash" }))}
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

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Cash Amount</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentForm.cash_amount}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, cash_amount: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Payment Amount</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-semibold">Section 4: Additional Information</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Payment Date</label>
                  <Input
                    type="datetime-local"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, payment_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Remarks / Notes</label>
                  <Input
                    value={paymentForm.remarks}
                    placeholder="Optional"
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, remarks: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddPaymentOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]"
              onClick={handleSupplierPaymentSubmit}
              disabled={paymentSubmitLoading || selectedSupplierOutstandingPurchases.length === 0}
            >
              {paymentSubmitLoading ? "Saving..." : "Submit Payment"}
            </Button>
          </DialogFooter>
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
