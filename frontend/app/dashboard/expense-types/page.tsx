"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
import {
  createExpenseType,
  deleteExpenseType,
  getExpenseTypes,
  updateExpenseType,
  type ExpenseTypeApiPayload,
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

type ApiExpenseType = {
  id: number
  type_name: string
  created_at: string
}

type ExpenseTypeForm = {
  type_name: string
  created_at: string
}

const PAGE_SIZE = 10
const TYPE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9\s&'().-]{1,118}$/

const emptyForm: ExpenseTypeForm = {
  type_name: "",
  created_at: "",
}

export default function ExpenseTypesPage() {
  const [expenseTypes, setExpenseTypes] = React.useState<ApiExpenseType[]>([])
  const [searchTerm, setSearchTerm] = React.useState("")
  const [page, setPage] = React.useState(1)

  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isViewOpen, setIsViewOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  const [selectedExpenseType, setSelectedExpenseType] = React.useState<ApiExpenseType | null>(null)
  const [addForm, setAddForm] = React.useState<ExpenseTypeForm>(emptyForm)
  const [editForm, setEditForm] = React.useState<ExpenseTypeForm>(emptyForm)

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)

  const loadExpenseTypes = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getExpenseTypes<ApiExpenseType[]>()
      setExpenseTypes(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load expense types")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadExpenseTypes()
  }, [loadExpenseTypes])

  const filteredExpenseTypes = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) {
      return expenseTypes
    }

    return expenseTypes.filter((item) => {
      return item.type_name.toLowerCase().includes(query)
    })
  }, [expenseTypes, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredExpenseTypes.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const rows = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredExpenseTypes.slice(start, start + PAGE_SIZE)
  }, [filteredExpenseTypes, currentPage])

  const validateExpenseTypeForm = React.useCallback((form: ExpenseTypeForm): string | null => {
    const typeName = form.type_name.trim()
    if (!TYPE_NAME_PATTERN.test(typeName)) {
      return "Type name is required and must be 2 to 119 valid characters."
    }

    if (!form.created_at) {
      return "Created date is required."
    }

    return null
  }, [])

  const buildPayload = (form: ExpenseTypeForm): ExpenseTypeApiPayload => {
    return {
      type_name: form.type_name.trim(),
      created_at: form.created_at,
    }
  }

  const handleAddExpenseType = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationError = validateExpenseTypeForm(addForm)
    if (validationError) {
      setFormError(validationError)
      appNotify.failed("Validation", validationError)
      return
    }

    setFormError(null)

    try {
      await createExpenseType(buildPayload(addForm))
      setIsAddOpen(false)
      setAddForm(emptyForm)
      await loadExpenseTypes()
      setPage(1)
      appNotify.created("Expense type")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create expense type"
      setError(message)
      appNotify.failed("Create expense type", message)
    }
  }

  const handleEditExpenseType = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedExpenseType) {
      return
    }

    const validationError = validateExpenseTypeForm(editForm)
    if (validationError) {
      setFormError(validationError)
      appNotify.failed("Validation", validationError)
      return
    }

    setFormError(null)

    try {
      await updateExpenseType(selectedExpenseType.id, buildPayload(editForm))
      setIsEditOpen(false)
      setSelectedExpenseType(null)
      await loadExpenseTypes()
      appNotify.updated("Expense type")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update expense type"
      setError(message)
      appNotify.failed("Update expense type", message)
    }
  }

  const handleDeleteExpenseType = async () => {
    if (!deleteId) {
      return
    }

    try {
      await deleteExpenseType(deleteId)
      setDeleteId(null)
      await loadExpenseTypes()
      appNotify.deleted("Expense type")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete expense type"
      setError(message)
      appNotify.failed("Delete expense type", message)
    }
  }

  const openViewModal = (expenseType: ApiExpenseType) => {
    setSelectedExpenseType(expenseType)
    setIsViewOpen(true)
  }

  const openEditModal = (expenseType: ApiExpenseType) => {
    setSelectedExpenseType(expenseType)
    setEditForm({
      type_name: expenseType.type_name,
      created_at: new Date(expenseType.created_at).toISOString().slice(0, 10),
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
                <CardTitle className="text-lg">Expense Types</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  View and manage expense type categories.
                </p>
                {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
                {formError ? <p className="mt-1 text-xs text-rose-600">{formError}</p> : null}
              </div>

              <Button className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]" onClick={() => setIsAddOpen(true)}>
                <PlusIcon className="mr-1 size-4" />
                Add Expense Type
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search expense type..."
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
                      <TableHead>Type Name</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          Loading expense types...
                        </TableCell>
                      </TableRow>
                    ) : null}

                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.id}</TableCell>
                        <TableCell className="font-medium">{row.type_name}</TableCell>
                        <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openViewModal(row)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-[#3FA3D3]"
                              aria-label="View expense type"
                            >
                              <EyeIcon className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(row)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-amber-600"
                              aria-label="Edit expense type"
                            >
                              <PencilIcon className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(row.id)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-rose-600"
                              aria-label="Delete expense type"
                            >
                              <TrashIcon className="size-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!loading && rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          No expense types found.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-start justify-between gap-2 text-sm text-muted-foreground md:flex-row md:items-center">
                <p>
                  Showing {(currentPage - 1) * PAGE_SIZE + (rows.length ? 1 : 0)}-
                  {(currentPage - 1) * PAGE_SIZE + rows.length} of {filteredExpenseTypes.length} expense types
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Expense Type</DialogTitle>
            <DialogDescription>Create a new expense type category.</DialogDescription>
          </DialogHeader>

          <form id="add-expense-type-form" className="grid gap-3 py-2" onSubmit={handleAddExpenseType}>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Type Name *</label>
              <Input
                value={addForm.type_name}
                onChange={(e) => setAddForm((prev) => ({ ...prev, type_name: e.target.value }))}
                placeholder="Enter expense type name"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Created Date *</label>
              <Input
                type="date"
                value={addForm.created_at}
                onChange={(e) => setAddForm((prev) => ({ ...prev, created_at: e.target.value }))}
              />
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-expense-type-form" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]">
              Save Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Expense Type Details</DialogTitle>
            <DialogDescription>Selected expense type information.</DialogDescription>
          </DialogHeader>
          {selectedExpenseType ? (
            <div className="grid gap-3 p-4 text-sm">
              <p><span className="font-medium">ID:</span> {selectedExpenseType.id}</p>
              <p><span className="font-medium">Type Name:</span> {selectedExpenseType.type_name}</p>
              <p><span className="font-medium">Created Date:</span> {new Date(selectedExpenseType.created_at).toLocaleDateString()}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Expense Type</DialogTitle>
            <DialogDescription>Edit expense type details and save changes.</DialogDescription>
          </DialogHeader>

          <form id="edit-expense-type-form" className="grid gap-3 py-2" onSubmit={handleEditExpenseType}>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Type Name *</label>
              <Input
                value={editForm.type_name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, type_name: e.target.value }))}
                placeholder="Enter expense type name"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Created Date *</label>
              <Input
                type="date"
                value={editForm.created_at}
                onChange={(e) => setEditForm((prev) => ({ ...prev, created_at: e.target.value }))}
              />
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-expense-type-form" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense Type?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected expense type will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpenseType} className="bg-rose-600 text-white hover:bg-rose-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}
