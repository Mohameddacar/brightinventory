"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
import {
  createExpense,
  deleteExpense,
  getExpenseTypes,
  getExpenses,
  updateExpense,
  type ExpenseBillApiPayload,
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

type ApiExpense = {
  id: number
  expense_type_id: number
  type_name: string
  invoice_date: string
  receiver_name: string
  amount: string | number
  remarks: string | null
  created_at: string
}

type ApiExpenseType = {
  id: number
  type_name: string
}

type ExpenseForm = {
  expense_type_id: string
  invoice_date: string
  receiver_name: string
  amount: string
  remarks: string
}

const PAGE_SIZE = 10
const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s&'().,-]{1,149}$/

const emptyForm: ExpenseForm = {
  expense_type_id: "",
  invoice_date: "",
  receiver_name: "",
  amount: "",
  remarks: "",
}

export default function ExpenseBillsPage() {
  const [expenses, setExpenses] = React.useState<ApiExpense[]>([])
  const [expenseTypes, setExpenseTypes] = React.useState<ApiExpenseType[]>([])

  const [searchTerm, setSearchTerm] = React.useState("")
  const [page, setPage] = React.useState(1)

  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isViewOpen, setIsViewOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  const [selectedExpense, setSelectedExpense] = React.useState<ApiExpense | null>(null)
  const [addForm, setAddForm] = React.useState<ExpenseForm>(emptyForm)
  const [editForm, setEditForm] = React.useState<ExpenseForm>(emptyForm)

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)

  const loadExpenses = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getExpenses<ApiExpense[]>()
      setExpenses(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load expense bills")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadExpenseTypes = React.useCallback(async () => {
    try {
      const data = await getExpenseTypes<ApiExpenseType[]>()
      const safe = Array.isArray(data) ? data : []
      setExpenseTypes(safe)

      if (safe.length > 0) {
        setAddForm((prev) => ({ ...prev, expense_type_id: prev.expense_type_id || String(safe[0].id) }))
      }
    } catch {
      setExpenseTypes([])
    }
  }, [])

  React.useEffect(() => {
    loadExpenses()
    loadExpenseTypes()
  }, [loadExpenses, loadExpenseTypes])

  const filteredExpenses = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) {
      return expenses
    }

    return expenses.filter((item) => {
      return (
        item.receiver_name.toLowerCase().includes(query) ||
        item.type_name.toLowerCase().includes(query)
      )
    })
  }, [expenses, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const rows = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredExpenses.slice(start, start + PAGE_SIZE)
  }, [filteredExpenses, currentPage])

  const selectedAddExpenseTypeLabel = React.useMemo(() => {
    const selected = expenseTypes.find((item) => String(item.id) === addForm.expense_type_id)
    return selected?.type_name || "Select type"
  }, [expenseTypes, addForm.expense_type_id])

  const selectedEditExpenseTypeLabel = React.useMemo(() => {
    const selected = expenseTypes.find((item) => String(item.id) === editForm.expense_type_id)
    return selected?.type_name || selectedExpense?.type_name || "Select type"
  }, [expenseTypes, editForm.expense_type_id, selectedExpense])

  const validateExpenseForm = React.useCallback((form: ExpenseForm): string | null => {
    if (!form.expense_type_id) {
      return "Expense type is required."
    }

    if (!form.invoice_date) {
      return "Invoice date is required."
    }

    const receiverName = form.receiver_name.trim()
    if (!NAME_PATTERN.test(receiverName)) {
      return "Receiver name is invalid."
    }

    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return "Amount must be greater than 0."
    }

    return null
  }, [])

  const buildPayload = (form: ExpenseForm): ExpenseBillApiPayload => {
    return {
      expense_type_id: Number(form.expense_type_id),
      invoice_date: form.invoice_date,
      receiver_name: form.receiver_name.trim(),
      amount: Number(form.amount),
      remarks: form.remarks.trim() || null,
    }
  }

  const handleAddExpense = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationError = validateExpenseForm(addForm)
    if (validationError) {
      setFormError(validationError)
      appNotify.failed("Validation", validationError)
      return
    }

    setFormError(null)

    try {
      await createExpense(buildPayload(addForm))
      setIsAddOpen(false)
      setAddForm((prev) => ({ ...emptyForm, expense_type_id: prev.expense_type_id }))
      await loadExpenses()
      setPage(1)
      appNotify.created("Expense bill")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create expense bill"
      setError(message)
      appNotify.failed("Create expense bill", message)
    }
  }

  const handleEditExpense = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedExpense) {
      return
    }

    const validationError = validateExpenseForm(editForm)
    if (validationError) {
      setFormError(validationError)
      appNotify.failed("Validation", validationError)
      return
    }

    setFormError(null)

    try {
      await updateExpense(selectedExpense.id, buildPayload(editForm))
      setIsEditOpen(false)
      setSelectedExpense(null)
      await loadExpenses()
      appNotify.updated("Expense bill")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update expense bill"
      setError(message)
      appNotify.failed("Update expense bill", message)
    }
  }

  const handleDeleteExpense = async () => {
    if (!deleteId) {
      return
    }

    try {
      await deleteExpense(deleteId)
      setDeleteId(null)
      await loadExpenses()
      appNotify.deleted("Expense bill")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete expense bill"
      setError(message)
      appNotify.failed("Delete expense bill", message)
    }
  }

  const openViewModal = (expense: ApiExpense) => {
    setSelectedExpense(expense)
    setIsViewOpen(true)
  }

  const openEditModal = (expense: ApiExpense) => {
    setSelectedExpense(expense)
    setEditForm({
      expense_type_id: String(expense.expense_type_id),
      invoice_date: new Date(expense.invoice_date).toISOString().slice(0, 10),
      receiver_name: expense.receiver_name,
      amount: String(expense.amount),
      remarks: expense.remarks || "",
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
                <CardTitle className="text-lg">Expense Bills</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  View and manage all expense bills.
                </p>
                {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
                {formError ? <p className="mt-1 text-xs text-rose-600">{formError}</p> : null}
              </div>

              <Button className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]" onClick={() => setIsAddOpen(true)}>
                <PlusIcon className="mr-1 size-4" />
                Add Expense Bill
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search receiver name or expense type..."
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
                      <TableHead>Expense Type</TableHead>
                      <TableHead>Invoice Date</TableHead>
                      <TableHead>Receiver Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                          Loading expense bills...
                        </TableCell>
                      </TableRow>
                    ) : null}

                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.id}</TableCell>
                        <TableCell className="font-medium">{row.type_name}</TableCell>
                        <TableCell>{new Date(row.invoice_date).toLocaleDateString()}</TableCell>
                        <TableCell>{row.receiver_name}</TableCell>
                        <TableCell>${Number(row.amount).toFixed(2)}</TableCell>
                        <TableCell>{row.remarks || "-"}</TableCell>
                        <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openViewModal(row)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-[#3FA3D3]"
                              aria-label="View expense bill"
                            >
                              <EyeIcon className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(row)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-amber-600"
                              aria-label="Edit expense bill"
                            >
                              <PencilIcon className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(row.id)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-rose-600"
                              aria-label="Delete expense bill"
                            >
                              <TrashIcon className="size-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!loading && rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                          No expense bills found.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-start justify-between gap-2 text-sm text-muted-foreground md:flex-row md:items-center">
                <p>
                  Showing {(currentPage - 1) * PAGE_SIZE + (rows.length ? 1 : 0)}-
                  {(currentPage - 1) * PAGE_SIZE + rows.length} of {filteredExpenses.length} expense bills
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
            <DialogTitle>Add Expense Bill</DialogTitle>
            <DialogDescription>Fill in details to record a new bill.</DialogDescription>
          </DialogHeader>

          <form id="add-expense-form" className="grid gap-3 py-2" onSubmit={handleAddExpense}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Expense Type *</label>
                <Select
                  value={addForm.expense_type_id}
                  onValueChange={(value) => setAddForm((prev) => ({ ...prev, expense_type_id: value || "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type">{selectedAddExpenseTypeLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {expenseTypes.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.type_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Invoice Date *</label>
                <Input
                  type="date"
                  value={addForm.invoice_date}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, invoice_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Receiver Name *</label>
              <Input
                value={addForm.receiver_name}
                onChange={(e) => setAddForm((prev) => ({ ...prev, receiver_name: e.target.value }))}
                placeholder="e.g. Electric Company Inc."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Amount ($) *</label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={addForm.amount}
                onChange={(e) => setAddForm((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Remarks</label>
              <textarea
                className="min-h-20 w-full rounded-lg border border-input bg-transparent p-2.5 text-sm outline-none focus-visible:border-ring"
                value={addForm.remarks}
                onChange={(e) => setAddForm((prev) => ({ ...prev, remarks: e.target.value }))}
                placeholder="Enter any additional details..."
              />
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-expense-form" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]">
              Save Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Update Expense Bill</DialogTitle>
            <DialogDescription>Edit expense bill details and save changes.</DialogDescription>
          </DialogHeader>

          <form id="edit-expense-form" className="grid gap-3 py-2" onSubmit={handleEditExpense}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Expense Type *</label>
                <Select
                  value={editForm.expense_type_id}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, expense_type_id: value || "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type">{selectedEditExpenseTypeLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {expenseTypes.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.type_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Invoice Date *</label>
                <Input
                  type="date"
                  value={editForm.invoice_date}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, invoice_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Receiver Name *</label>
              <Input
                value={editForm.receiver_name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, receiver_name: e.target.value }))}
                placeholder="e.g. Electric Company Inc."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Amount ($) *</label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={editForm.amount}
                onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Remarks</label>
              <textarea
                className="min-h-20 w-full rounded-lg border border-input bg-transparent p-2.5 text-sm outline-none focus-visible:border-ring"
                value={editForm.remarks}
                onChange={(e) => setEditForm((prev) => ({ ...prev, remarks: e.target.value }))}
                placeholder="Enter any additional details..."
              />
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-expense-form" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Expense Bill Details</DialogTitle>
            <DialogDescription>Selected expense bill information.</DialogDescription>
          </DialogHeader>
          {selectedExpense ? (
            <div className="grid gap-3 p-4 text-sm">
              <p><span className="font-medium">Expense Type:</span> {selectedExpense.type_name}</p>
              <p><span className="font-medium">Invoice Date:</span> {new Date(selectedExpense.invoice_date).toLocaleDateString()}</p>
              <p><span className="font-medium">Receiver Name:</span> {selectedExpense.receiver_name}</p>
              <p><span className="font-medium">Amount:</span> ${Number(selectedExpense.amount).toFixed(2)}</p>
              <p><span className="font-medium">Remarks:</span> {selectedExpense.remarks || "-"}</p>
              <p><span className="font-medium">Created At:</span> {new Date(selectedExpense.created_at).toLocaleString()}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense Bill?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected expense bill will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense} className="bg-rose-600 text-white hover:bg-rose-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}
