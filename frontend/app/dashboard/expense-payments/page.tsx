"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
import {
  createExpensePayment,
  deleteExpensePayment,
  getExpensePayments,
  getExpenses,
  updateExpensePayment,
  type ExpensePaymentApiPayload,
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
  DownloadIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "lucide-react"
import type { CSSProperties } from "react"

type ApiExpenseBill = {
  id: number
  receiver_name: string
  amount: string | number
  invoice_date: string
}

type ApiExpensePayment = {
  id: number
  expense_bill_id: number
  payment_mode: "Cash" | "Bank Transfer" | "Card" | "Mobile Banking" | "Cheque"
  cash: string | number
  amount: string | number
  remarks: string | null
  payment_date: string
  receiver_name?: string
  invoice_date?: string
}

type ExpensePaymentForm = {
  expense_bill_id: string
  payment_mode: ApiExpensePayment["payment_mode"]
  payment_date: string
  cash: string
  amount: string
  remarks: string
}

const PAGE_SIZE = 10
const PAYMENT_MODES: Array<ApiExpensePayment["payment_mode"]> = [
  "Cash",
  "Bank Transfer",
  "Card",
  "Mobile Banking",
  "Cheque",
]

const emptyForm: ExpensePaymentForm = {
  expense_bill_id: "",
  payment_mode: "Cash",
  payment_date: "",
  cash: "",
  amount: "",
  remarks: "",
}

export default function ExpensePaymentsPage() {
  const [payments, setPayments] = React.useState<ApiExpensePayment[]>([])
  const [expenseBills, setExpenseBills] = React.useState<ApiExpenseBill[]>([])

  const [searchTerm, setSearchTerm] = React.useState("")
  const [page, setPage] = React.useState(1)

  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isViewOpen, setIsViewOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  const [selectedPayment, setSelectedPayment] = React.useState<ApiExpensePayment | null>(null)
  const [addForm, setAddForm] = React.useState<ExpensePaymentForm>(emptyForm)
  const [editForm, setEditForm] = React.useState<ExpensePaymentForm>(emptyForm)

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)

  const loadExpensePayments = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getExpensePayments<ApiExpensePayment[]>()
      setPayments(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load expense payments")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadExpenseBills = React.useCallback(async () => {
    try {
      const data = await getExpenses<ApiExpenseBill[]>()
      const safe = Array.isArray(data) ? data : []
      setExpenseBills(safe)

      if (safe.length > 0) {
        setAddForm((prev) => ({ ...prev, expense_bill_id: prev.expense_bill_id || String(safe[0].id) }))
      }
    } catch {
      setExpenseBills([])
    }
  }, [])

  React.useEffect(() => {
    loadExpensePayments()
    loadExpenseBills()
  }, [loadExpensePayments, loadExpenseBills])

  const expenseBillMap = React.useMemo(() => {
    return new Map(expenseBills.map((bill) => [bill.id, bill]))
  }, [expenseBills])

  const getExpenseBillLabel = React.useCallback(
    (expenseBillId: number) => {
      const bill = expenseBillMap.get(expenseBillId)
      if (!bill) {
        return `#${expenseBillId}`
      }
      return `#${bill.id} - ${bill.receiver_name}`
    },
    [expenseBillMap],
  )

  const filteredPayments = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) {
      return payments
    }

    return payments.filter((item) => {
      const billLabel = getExpenseBillLabel(item.expense_bill_id).toLowerCase()
      const paymentMode = String(item.payment_mode || "").toLowerCase()
      const remarks = String(item.remarks || "").toLowerCase()
      return billLabel.includes(query) || paymentMode.includes(query) || remarks.includes(query)
    })
  }, [payments, searchTerm, getExpenseBillLabel])

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const rows = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredPayments.slice(start, start + PAGE_SIZE)
  }, [filteredPayments, currentPage])

  const selectedAddBillLabel = React.useMemo(() => {
    const selected = expenseBills.find((item) => String(item.id) === addForm.expense_bill_id)
    return selected ? `#${selected.id} - ${selected.receiver_name}` : "Select Expense Bill"
  }, [expenseBills, addForm.expense_bill_id])

  const selectedEditBillLabel = React.useMemo(() => {
    const selected = expenseBills.find((item) => String(item.id) === editForm.expense_bill_id)
    if (selected) {
      return `#${selected.id} - ${selected.receiver_name}`
    }
    if (selectedPayment) {
      return getExpenseBillLabel(selectedPayment.expense_bill_id)
    }
    return "Select Expense Bill"
  }, [expenseBills, editForm.expense_bill_id, selectedPayment, getExpenseBillLabel])

  const validateForm = React.useCallback((form: ExpensePaymentForm): string | null => {
    if (!form.expense_bill_id) {
      return "Expense bill is required."
    }

    if (!PAYMENT_MODES.includes(form.payment_mode)) {
      return "Payment mode is invalid."
    }

    if (!form.payment_date || Number.isNaN(new Date(form.payment_date).getTime())) {
      return "Payment date is required."
    }

    const cash = Number(form.cash)
    if (!Number.isFinite(cash) || cash < 0) {
      return "Cash must be 0 or greater."
    }

    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return "Amount must be greater than 0."
    }

    return null
  }, [])

  const buildPayload = (form: ExpensePaymentForm): ExpensePaymentApiPayload => ({
    expense_bill_id: Number(form.expense_bill_id),
    payment_mode: form.payment_mode,
    payment_date: form.payment_date,
    cash: Number(form.cash),
    amount: Number(form.amount),
    remarks: form.remarks.trim() || null,
  })

  const handleAddPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationError = validateForm(addForm)
    if (validationError) {
      setFormError(validationError)
      appNotify.failed("Validation", validationError)
      return
    }

    setFormError(null)

    try {
      await createExpensePayment(buildPayload(addForm))
      setIsAddOpen(false)
      setAddForm((prev) => ({ ...emptyForm, payment_mode: prev.payment_mode, expense_bill_id: prev.expense_bill_id }))
      await loadExpensePayments()
      setPage(1)
      appNotify.created("Expense payment")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create expense payment"
      setError(message)
      appNotify.failed("Create expense payment", message)
    }
  }

  const handleEditPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedPayment) {
      return
    }

    const validationError = validateForm(editForm)
    if (validationError) {
      setFormError(validationError)
      appNotify.failed("Validation", validationError)
      return
    }

    setFormError(null)

    try {
      await updateExpensePayment(selectedPayment.id, buildPayload(editForm))
      setIsEditOpen(false)
      setSelectedPayment(null)
      await loadExpensePayments()
      appNotify.updated("Expense payment")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update expense payment"
      setError(message)
      appNotify.failed("Update expense payment", message)
    }
  }

  const handleDeletePayment = async () => {
    if (!deleteId) {
      return
    }

    try {
      await deleteExpensePayment(deleteId)
      setDeleteId(null)
      await loadExpensePayments()
      appNotify.deleted("Expense payment")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete expense payment"
      setError(message)
      appNotify.failed("Delete expense payment", message)
    }
  }

  const handleExport = () => {
    const headers = ["ID", "Expense Bill", "Payment Mode", "Cash", "Amount", "Payment Date", "Remarks"]
    const lines = filteredPayments.map((item) => [
      String(item.id),
      getExpenseBillLabel(item.expense_bill_id),
      item.payment_mode,
      String(Number(item.cash).toFixed(2)),
      String(Number(item.amount).toFixed(2)),
      new Date(item.payment_date).toISOString().slice(0, 10),
      (item.remarks || "").replace(/\r?\n/g, " "),
    ])

    const csv = [headers, ...lines]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `expense-payments-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const openViewModal = (payment: ApiExpensePayment) => {
    setSelectedPayment(payment)
    setIsViewOpen(true)
  }

  const openEditModal = (payment: ApiExpensePayment) => {
    setSelectedPayment(payment)
    setEditForm({
      expense_bill_id: String(payment.expense_bill_id),
      payment_mode: payment.payment_mode,
      payment_date: new Date(payment.payment_date).toISOString().slice(0, 10),
      cash: String(payment.cash),
      amount: String(payment.amount),
      remarks: payment.remarks || "",
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
                <CardTitle className="text-lg">Expense Payments</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">View and manage expense bill payments.</p>
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
                  Add Payment
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search expense bill or payment mode..."
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
                      <TableHead>Expense Bill</TableHead>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead>Cash</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          Loading expense payments...
                        </TableCell>
                      </TableRow>
                    ) : null}

                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{`#${row.id}`}</TableCell>
                        <TableCell>{getExpenseBillLabel(row.expense_bill_id)}</TableCell>
                        <TableCell>
                          <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                            {row.payment_mode}
                          </span>
                        </TableCell>
                        <TableCell>${Number(row.cash).toFixed(2)}</TableCell>
                        <TableCell className="font-medium">${Number(row.amount).toFixed(2)}</TableCell>
                        <TableCell>{new Date(row.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openViewModal(row)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-[#3FA3D3]"
                              aria-label="View expense payment"
                            >
                              <EyeIcon className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(row)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-amber-600"
                              aria-label="Edit expense payment"
                            >
                              <PencilIcon className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(row.id)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-rose-600"
                              aria-label="Delete expense payment"
                            >
                              <TrashIcon className="size-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!loading && rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          No expense payments found.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-start justify-between gap-2 text-sm text-muted-foreground md:flex-row md:items-center">
                <p>
                  Showing {(currentPage - 1) * PAGE_SIZE + (rows.length ? 1 : 0)}-
                  {(currentPage - 1) * PAGE_SIZE + rows.length} of {filteredPayments.length} expense payments
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Expense Payment</DialogTitle>
            <DialogDescription>Record payment details for an expense bill.</DialogDescription>
          </DialogHeader>

          <form id="add-expense-payment-form" className="grid gap-3 py-2" onSubmit={handleAddPayment}>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Expense Bill *</label>
              <Select
                value={addForm.expense_bill_id}
                onValueChange={(value) => setAddForm((prev) => ({ ...prev, expense_bill_id: value || "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Expense Bill">{selectedAddBillLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {expenseBills.map((bill) => (
                    <SelectItem key={bill.id} value={String(bill.id)}>
                      {`#${bill.id} - ${bill.receiver_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Payment Mode *</label>
                <Select
                  value={addForm.payment_mode}
                  onValueChange={(value) => setAddForm((prev) => ({ ...prev, payment_mode: value as ApiExpensePayment["payment_mode"] }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Payment Date *</label>
                <Input
                  type="date"
                  value={addForm.payment_date}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, payment_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Cash *</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addForm.cash}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, cash: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Amount *</label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={addForm.amount}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, amount: e.target.value }))}
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
                placeholder="Enter any additional payment details..."
              />
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-expense-payment-form" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]">
              Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Update Expense Payment</DialogTitle>
            <DialogDescription>Edit payment details and save changes.</DialogDescription>
          </DialogHeader>

          <form id="edit-expense-payment-form" className="grid gap-3 py-2" onSubmit={handleEditPayment}>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Expense Bill *</label>
              <Select
                value={editForm.expense_bill_id}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, expense_bill_id: value || "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Expense Bill">{selectedEditBillLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {expenseBills.map((bill) => (
                    <SelectItem key={bill.id} value={String(bill.id)}>
                      {`#${bill.id} - ${bill.receiver_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Payment Mode *</label>
                <Select
                  value={editForm.payment_mode}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, payment_mode: value as ApiExpensePayment["payment_mode"] }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Payment Date *</label>
                <Input
                  type="date"
                  value={editForm.payment_date}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, payment_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Cash *</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.cash}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, cash: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Amount *</label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Remarks</label>
              <textarea
                className="min-h-20 w-full rounded-lg border border-input bg-transparent p-2.5 text-sm outline-none focus-visible:border-ring"
                value={editForm.remarks}
                onChange={(e) => setEditForm((prev) => ({ ...prev, remarks: e.target.value }))}
                placeholder="Enter any additional payment details..."
              />
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-expense-payment-form" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Expense Payment Details</DialogTitle>
            <DialogDescription>Selected expense payment information.</DialogDescription>
          </DialogHeader>
          {selectedPayment ? (
            <div className="grid gap-3 p-4 text-sm">
              <p><span className="font-medium">Expense Bill:</span> {getExpenseBillLabel(selectedPayment.expense_bill_id)}</p>
              <p><span className="font-medium">Payment Mode:</span> {selectedPayment.payment_mode}</p>
              <p><span className="font-medium">Payment Date:</span> {new Date(selectedPayment.payment_date).toLocaleDateString()}</p>
              <p><span className="font-medium">Cash:</span> ${Number(selectedPayment.cash).toFixed(2)}</p>
              <p><span className="font-medium">Amount:</span> ${Number(selectedPayment.amount).toFixed(2)}</p>
              <p><span className="font-medium">Remarks:</span> {selectedPayment.remarks || "-"}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected expense payment will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePayment} className="bg-rose-600 text-white hover:bg-rose-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}
