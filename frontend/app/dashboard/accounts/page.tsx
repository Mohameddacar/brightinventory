"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
import {
  createAccount,
  deleteAccount,
  getAccounts,
  updateAccount,
  type AccountApiPayload,
  type AccountUpdateApiPayload,
  type PaginatedApiResponse,
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
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "lucide-react"
import type { CSSProperties } from "react"

type ApiAccount = {
  id: number
  account_name: string
  account_number: string
  opening_balance: string | number
  balance: string | number
  currency: "USD" | "SOS"
  remarks: string | null
  created_at: string
}

type AccountMutationResponse = {
  message: string
  data: ApiAccount
}

type AccountForm = {
  account_name: string
  account_number: string
  opening_balance: string
  currency: "USD" | "SOS"
  remarks: string
}

type EditAccountForm = {
  account_name: string
  remarks: string
}

const PAGE_SIZE = 10

const emptyForm: AccountForm = {
  account_name: "",
  account_number: "",
  opening_balance: "",
  currency: "USD",
  remarks: "",
}

const emptyEditForm: EditAccountForm = {
  account_name: "",
  remarks: "",
}

const ACCOUNT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s&'().,-]{1,149}$/
const ACCOUNT_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-_/]{1,63}$/

const formatCurrency = (value: string | number, currency: "USD" | "SOS") => {
  const amount = Number(value)
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)
}

export default function AccountsPage() {
  const [accounts, setAccounts] = React.useState<ApiAccount[]>([])

  const [searchTerm, setSearchTerm] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [total, setTotal] = React.useState(0)
  const [totalPages, setTotalPages] = React.useState(1)

  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isViewOpen, setIsViewOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  const [selectedAccount, setSelectedAccount] = React.useState<ApiAccount | null>(null)
  const [addForm, setAddForm] = React.useState<AccountForm>(emptyForm)
  const [editForm, setEditForm] = React.useState<EditAccountForm>(emptyEditForm)

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)

  const loadAccounts = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await getAccounts<PaginatedApiResponse<ApiAccount>>({
        search: searchTerm,
        page,
        limit: PAGE_SIZE,
      })

      const safeRows = Array.isArray(response?.data) ? response.data : []
      const pagination = response?.pagination

      setAccounts(safeRows)
      setTotal(Number(pagination?.total || 0))
      setTotalPages(Math.max(1, Number(pagination?.totalPages || 1)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts")
      setAccounts([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, page])

  React.useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const validateCreateForm = React.useCallback((form: AccountForm): string | null => {
    const accountName = form.account_name.trim()
    if (!accountName) {
      return "Account name is required."
    }

    if (!ACCOUNT_NAME_PATTERN.test(accountName)) {
      return "Account name is invalid."
    }

    const accountNumber = form.account_number.trim()
    if (!accountNumber) {
      return "Account number is required."
    }

    if (!ACCOUNT_NUMBER_PATTERN.test(accountNumber)) {
      return "Account number is invalid."
    }

    const openingBalance = Number(form.opening_balance)
    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      return "Opening balance must be 0 or greater."
    }

    if (form.currency !== "USD" && form.currency !== "SOS") {
      return "Currency must be USD or SOS."
    }

    return null
  }, [])

  const validateEditForm = React.useCallback((form: EditAccountForm): string | null => {
    const accountName = form.account_name.trim()
    if (!accountName) {
      return "Account name is required."
    }

    if (!ACCOUNT_NAME_PATTERN.test(accountName)) {
      return "Account name is invalid."
    }

    return null
  }, [])

  const handleAddAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationError = validateCreateForm(addForm)
    if (validationError) {
      setFormError(validationError)
      appNotify.failed("Validation", validationError)
      return
    }

    setFormError(null)

    const payload: AccountApiPayload = {
      account_name: addForm.account_name.trim(),
      account_number: addForm.account_number.trim(),
      opening_balance: Number(addForm.opening_balance),
      currency: addForm.currency,
      remarks: addForm.remarks.trim() || null,
    }

    try {
      await createAccount<AccountMutationResponse>(payload)
      setIsAddOpen(false)
      setAddForm(emptyForm)
      setPage(1)
      await loadAccounts()
      appNotify.info("Success", "Account created successfully")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create account"
      setError(message)
      appNotify.failed("Create account", message)
    }
  }

  const handleEditAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedAccount) {
      return
    }

    const validationError = validateEditForm(editForm)
    if (validationError) {
      setFormError(validationError)
      appNotify.failed("Validation", validationError)
      return
    }

    setFormError(null)

    const payload: AccountUpdateApiPayload = {
      account_name: editForm.account_name.trim(),
      remarks: editForm.remarks.trim() || null,
    }

    try {
      await updateAccount<AccountMutationResponse>(selectedAccount.id, payload)
      setIsEditOpen(false)
      setSelectedAccount(null)
      await loadAccounts()
      appNotify.updated("Account")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update account"
      setError(message)
      appNotify.failed("Update account", message)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deleteId) {
      return
    }

    try {
      await deleteAccount<{ message: string }>(deleteId)
      setDeleteId(null)
      await loadAccounts()
      appNotify.deleted("Account")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete account"
      setError(message)
      appNotify.failed("Delete account", message)
    }
  }

  const handleExport = () => {
    const headers = ["ID", "Account Name", "Account Number", "Balance", "Created Date"]
    const lines = accounts.map((item) => [
      String(item.id),
      item.account_name,
      item.account_number,
      formatCurrency(item.balance, item.currency),
      new Date(item.created_at).toISOString().slice(0, 10),
    ])

    const csv = [headers, ...lines]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `accounts-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const openViewModal = (account: ApiAccount) => {
    setSelectedAccount(account)
    setIsViewOpen(true)
  }

  const openEditModal = (account: ApiAccount) => {
    setSelectedAccount(account)
    setEditForm({
      account_name: account.account_name,
      remarks: account.remarks || "",
    })
    setIsEditOpen(true)
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
                <CardTitle className="text-lg">Accounts</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">View and manage financial accounts.</p>
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
                  Add Account
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search account name or number..."
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
                      <TableHead>Account Name</TableHead>
                      <TableHead>Account Number</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          Loading accounts...
                        </TableCell>
                      </TableRow>
                    ) : null}

                    {accounts.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{`ACC-${String(row.id).padStart(3, "0")}`}</TableCell>
                        <TableCell className="font-medium">{row.account_name}</TableCell>
                        <TableCell>{row.account_number}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(row.balance, row.currency)}</TableCell>
                        <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
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
                              <DropdownMenuItem onClick={() => openEditModal(row)}>
                                <PencilIcon className="size-4" />
                                <span>Edit</span>
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

                    {!loading && accounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          No accounts found.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-start justify-between gap-2 text-sm text-muted-foreground md:flex-row md:items-center">
                <p>
                  Showing {from}-{to} of {total} accounts
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
            <DialogTitle>Add Account</DialogTitle>
            <DialogDescription>Fill in the details to create a new account.</DialogDescription>
          </DialogHeader>

          <form id="add-account-form" className="grid gap-3 py-2" onSubmit={handleAddAccount}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Account Name *</label>
                <Input
                  value={addForm.account_name}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, account_name: e.target.value }))}
                  placeholder="e.g. Main Cash Account"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Account Number *</label>
                <Input
                  value={addForm.account_number}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, account_number: e.target.value }))}
                  placeholder="e.g. 100001"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Opening Balance *</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addForm.opening_balance}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, opening_balance: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Currency *</label>
                <Select
                  value={addForm.currency}
                  onValueChange={(value) => setAddForm((prev) => ({ ...prev, currency: value as "USD" | "SOS" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="SOS">SOS - Somali Shilling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            <Button type="submit" form="add-account-form" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]">
              Save Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Account Details</DialogTitle>
            <DialogDescription>Selected account information.</DialogDescription>
          </DialogHeader>
          {selectedAccount ? (
            <div className="grid gap-2 text-sm">
              <p><span className="font-medium">ID:</span> {selectedAccount.id}</p>
              <p><span className="font-medium">Account Name:</span> {selectedAccount.account_name}</p>
              <p><span className="font-medium">Account Number:</span> {selectedAccount.account_number}</p>
              <p><span className="font-medium">Opening Balance:</span> {formatCurrency(selectedAccount.opening_balance, selectedAccount.currency)}</p>
              <p><span className="font-medium">Balance:</span> {formatCurrency(selectedAccount.balance, selectedAccount.currency)}</p>
              <p><span className="font-medium">Currency:</span> {selectedAccount.currency}</p>
              <p><span className="font-medium">Remarks:</span> {selectedAccount.remarks || "-"}</p>
              <p><span className="font-medium">Created At:</span> {new Date(selectedAccount.created_at).toLocaleString()}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Update Account</DialogTitle>
            <DialogDescription>Edit account details and save changes.</DialogDescription>
          </DialogHeader>

          <form id="edit-account-form" className="grid gap-3 py-2" onSubmit={handleEditAccount}>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Account Name *</label>
              <Input
                value={editForm.account_name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, account_name: e.target.value }))}
                placeholder="e.g. Main Cash Account"
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
            <Button type="submit" form="edit-account-form" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => (!open ? setDeleteId(null) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected account will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-rose-600 text-white hover:bg-rose-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}
