"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
import {
  createPaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  updatePaymentMethod,
  type PaginatedApiResponse,
  type PaymentMethodApiPayload,
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

type ApiPaymentMethod = {
  id: number
  type: string
  created_at: string
}

type PaymentMethodMutationResponse = {
  message: string
  data: ApiPaymentMethod
}

type PaymentMethodForm = {
  type: string
}

const PAGE_SIZE = 10

const emptyForm: PaymentMethodForm = {
  type: "",
}

export default function PaymentMethodsPage() {
  const [methods, setMethods] = React.useState<ApiPaymentMethod[]>([])

  const [searchTerm, setSearchTerm] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [total, setTotal] = React.useState(0)
  const [totalPages, setTotalPages] = React.useState(1)

  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isViewOpen, setIsViewOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  const [selectedMethod, setSelectedMethod] = React.useState<ApiPaymentMethod | null>(null)
  const [addForm, setAddForm] = React.useState<PaymentMethodForm>(emptyForm)
  const [editForm, setEditForm] = React.useState<PaymentMethodForm>(emptyForm)

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)

  const loadMethods = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await getPaymentMethods<PaginatedApiResponse<ApiPaymentMethod>>({
        search: searchTerm,
        page,
        limit: PAGE_SIZE,
      })

      const safeRows = Array.isArray(response?.data) ? response.data : []
      const pagination = response?.pagination

      setMethods(safeRows)
      setTotal(Number(pagination?.total || 0))
      setTotalPages(Math.max(1, Number(pagination?.totalPages || 1)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payment methods")
      setMethods([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, page])

  React.useEffect(() => {
    loadMethods()
  }, [loadMethods])

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const validateType = React.useCallback((type: string): string | null => {
    const value = type.trim()
    if (!value) {
      return "Type is required."
    }

    if (!/^[A-Za-z0-9][A-Za-z0-9\s&'().+-]{1,98}$/.test(value)) {
      return "Type is invalid."
    }

    return null
  }, [])

  const handleAddMethod = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationError = validateType(addForm.type)
    if (validationError) {
      setFormError(validationError)
      appNotify.failed("Validation", validationError)
      return
    }

    setFormError(null)

    const payload: PaymentMethodApiPayload = {
      type: addForm.type.trim(),
    }

    try {
      await createPaymentMethod<PaymentMethodMutationResponse>(payload)
      setIsAddOpen(false)
      setAddForm(emptyForm)
      setPage(1)
      await loadMethods()
      appNotify.info("Success", "Payment method created successfully")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create payment method"
      setError(message)
      appNotify.failed("Create payment method", message)
    }
  }

  const handleEditMethod = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedMethod) {
      return
    }

    const validationError = validateType(editForm.type)
    if (validationError) {
      setFormError(validationError)
      appNotify.failed("Validation", validationError)
      return
    }

    setFormError(null)

    try {
      await updatePaymentMethod<PaymentMethodMutationResponse>(selectedMethod.id, {
        type: editForm.type.trim(),
      })
      setIsEditOpen(false)
      setSelectedMethod(null)
      await loadMethods()
      appNotify.updated("Payment method")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update payment method"
      setError(message)
      appNotify.failed("Update payment method", message)
    }
  }

  const handleDeleteMethod = async () => {
    if (!deleteId) {
      return
    }

    try {
      await deletePaymentMethod<{ message: string }>(deleteId)
      setDeleteId(null)
      await loadMethods()
      appNotify.deleted("Payment method")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete payment method"
      setError(message)
      appNotify.failed("Delete payment method", message)
    }
  }

  const handleExport = () => {
    const headers = ["ID", "Type", "Created Date"]
    const lines = methods.map((item) => [
      String(item.id),
      item.type,
      new Date(item.created_at).toISOString().slice(0, 10),
    ])

    const csv = [headers, ...lines]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `payment-methods-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const openViewModal = (paymentMethod: ApiPaymentMethod) => {
    setSelectedMethod(paymentMethod)
    setIsViewOpen(true)
  }

  const openEditModal = (paymentMethod: ApiPaymentMethod) => {
    setSelectedMethod(paymentMethod)
    setEditForm({
      type: paymentMethod.type,
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
                <CardTitle className="text-lg">Payment Methods</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Manage available payment methods for transactions.</p>
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
                  Add Payment Method
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search payment method..."
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
                      <TableHead>Type</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          Loading payment methods...
                        </TableCell>
                      </TableRow>
                    ) : null}

                    {methods.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{`PM-${String(row.id).padStart(3, "0")}`}</TableCell>
                        <TableCell className="font-medium">{row.type}</TableCell>
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

                    {!loading && methods.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          No payment methods found.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-start justify-between gap-2 text-sm text-muted-foreground md:flex-row md:items-center">
                <p>
                  Showing {from}-{to} of {total} payment methods
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
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>Fill in the details to create a new payment method.</DialogDescription>
          </DialogHeader>

          <form id="add-payment-method-form" className="grid gap-3 py-2" onSubmit={handleAddMethod}>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Type *</label>
              <Input
                value={addForm.type}
                onChange={(e) => setAddForm((prev) => ({ ...prev, type: e.target.value }))}
                placeholder="e.g. Cash, Bank Transfer, EVC Plus"
              />
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-payment-method-form" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]">
              Save Method
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Method Details</DialogTitle>
            <DialogDescription>Selected payment method information.</DialogDescription>
          </DialogHeader>
          {selectedMethod ? (
            <div className="grid gap-2 text-sm">
              <p><span className="font-medium">ID:</span> {selectedMethod.id}</p>
              <p><span className="font-medium">Type:</span> {selectedMethod.type}</p>
              <p><span className="font-medium">Created At:</span> {new Date(selectedMethod.created_at).toLocaleString()}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Update Payment Method</DialogTitle>
            <DialogDescription>Edit payment method details and save changes.</DialogDescription>
          </DialogHeader>

          <form id="edit-payment-method-form" className="grid gap-3 py-2" onSubmit={handleEditMethod}>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Type *</label>
              <Input
                value={editForm.type}
                onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value }))}
                placeholder="e.g. Cash, Bank Transfer, EVC Plus"
              />
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-payment-method-form" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => (!open ? setDeleteId(null) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Method?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected payment method will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMethod} className="bg-rose-600 text-white hover:bg-rose-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}
