"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
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

type ApiCategory = {
  id: number
  name: string
  description: string | null
  createdAt: string
}

const PAGE_SIZE = 6
const CATEGORY_NAME_PATTERN = /^[A-Za-z]+(?:\s[A-Za-z]+)*$/
const CATEGORY_DESCRIPTION_PATTERN = /^[A-Za-z0-9]+(?:[A-Za-z0-9\s.,'()-]*[A-Za-z0-9.])?$/
const INVALID_CATEGORY_TERMS = new Set([
  "test",
  "testing",
  "demo",
  "sample",
  "temp",
  "misc",
  "others",
  "other",
  "na",
  "n/a",
  "none",
  "null",
  "unknown",
  "asdf",
  "qwerty",
  "abc",
  "abcd",
  "xyz",
])

export default function CategoriesPage() {
  const [categories, setCategories] = React.useState<ApiCategory[]>([])
  const [searchTerm, setSearchTerm] = React.useState("")
  const [page, setPage] = React.useState(1)

  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isViewOpen, setIsViewOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  const [selectedCategory, setSelectedCategory] = React.useState<ApiCategory | null>(null)
  const [newCategoryName, setNewCategoryName] = React.useState("")
  const [newCategoryDescription, setNewCategoryDescription] = React.useState("")
  const [editCategoryName, setEditCategoryName] = React.useState("")
  const [editCategoryDescription, setEditCategoryDescription] = React.useState("")

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)

  const isLikelyPlaceholder = React.useCallback((value: string): boolean => {
    const normalized = value.trim().toLowerCase()
    if (!normalized) {
      return true
    }

    if (INVALID_CATEGORY_TERMS.has(normalized)) {
      return true
    }

    if (/^(.)\1+$/i.test(normalized.replace(/\s+/g, ""))) {
      return true
    }

    return false
  }, [])

  const validateCategoryInput = React.useCallback((name: string, description: string): string | null => {
    const cleanName = name.trim()
    const cleanDescription = description.trim()

    if (cleanName.length < 3 || cleanName.length > 100) {
      return "Category name must be between 3 and 100 characters."
    }

    if (!CATEGORY_NAME_PATTERN.test(cleanName)) {
      return "Category name must contain only letters and spaces."
    }

    if (isLikelyPlaceholder(cleanName)) {
      return "Category name looks invalid. Please use a real category name."
    }

    if (cleanDescription) {
      if (cleanDescription.length < 10 || cleanDescription.length > 300) {
        return "Description must be between 10 and 300 characters when provided."
      }

      if (!/[A-Za-z]/.test(cleanDescription)) {
        return "Description must contain meaningful text."
      }

      if (!CATEGORY_DESCRIPTION_PATTERN.test(cleanDescription)) {
        return "Description contains invalid characters."
      }

      if (isLikelyPlaceholder(cleanDescription)) {
        return "Description looks invalid. Please enter a real description."
      }
    }

    return null
  }, [isLikelyPlaceholder])

  const loadCategories = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getCategories<ApiCategory[]>()
      setCategories(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const filteredCategories = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) {
      return categories
    }

    return categories.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        (item.description ?? "").toLowerCase().includes(query),
    )
  }, [categories, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const paginatedRows = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredCategories.slice(start, start + PAGE_SIZE)
  }, [filteredCategories, currentPage])

  const handleAddCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationError = validateCategoryInput(newCategoryName, newCategoryDescription)
    if (validationError) {
      setFormError(validationError)
      appNotify.failed("Validation", validationError)
      return
    }

    setFormError(null)

    try {
      await createCategory({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || null,
      })
      setNewCategoryName("")
      setNewCategoryDescription("")
      setIsAddOpen(false)
      await loadCategories()
      setPage(1)
      appNotify.created("Category")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create category"
      setError(message)
      appNotify.failed("Create category", message)
    }
  }

  const openView = (category: ApiCategory) => {
    setSelectedCategory(category)
    setIsViewOpen(true)
  }

  const openEdit = (category: ApiCategory) => {
    setSelectedCategory(category)
    setEditCategoryName(category.name)
    setEditCategoryDescription(category.description ?? "")
    setIsEditOpen(true)
  }

  const handleEditCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedCategory) {
      return
    }

    const validationError = validateCategoryInput(editCategoryName, editCategoryDescription)
    if (validationError) {
      setFormError(validationError)
      appNotify.failed("Validation", validationError)
      return
    }

    setFormError(null)

    try {
      await updateCategory(selectedCategory.id, {
        name: editCategoryName.trim(),
        description: editCategoryDescription.trim() || null,
      })
      setIsEditOpen(false)
      setSelectedCategory(null)
      await loadCategories()
      appNotify.updated("Category")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update category"
      setError(message)
      appNotify.failed("Update category", message)
    }
  }

  const handleDeleteCategory = async () => {
    if (!deleteId) {
      return
    }

    try {
      await deleteCategory(deleteId)
      setDeleteId(null)
      await loadCategories()
      appNotify.deleted("Category")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete category"
      setError(message)
      appNotify.failed("Delete category", message)
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
                <CardTitle className="text-lg">Categories</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage product categories with searchable and paginated records.
                </p>
                {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
                {formError ? <p className="mt-1 text-xs text-rose-600">{formError}</p> : null}
              </div>

              <Button className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]" onClick={() => setIsAddOpen(true)}>
                <PlusIcon className="mr-1 size-4" />
                Add Category
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search category by name..."
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
                      <TableHead>Category Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          Loading categories...
                        </TableCell>
                      </TableRow>
                    ) : null}

                    {paginatedRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.id}</TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.description || "-"}</TableCell>
                        <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openView(row)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-[#3FA3D3]"
                              aria-label="View category"
                            >
                              <EyeIcon className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-amber-600"
                              aria-label="Edit category"
                            >
                              <PencilIcon className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(row.id)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-rose-600"
                              aria-label="Delete category"
                            >
                              <TrashIcon className="size-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!loading && paginatedRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          No categories found.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-start justify-between gap-2 text-sm text-muted-foreground md:flex-row md:items-center">
                <p>
                  Showing {(currentPage - 1) * PAGE_SIZE + (paginatedRows.length ? 1 : 0)}-
                  {(currentPage - 1) * PAGE_SIZE + paginatedRows.length} of {filteredCategories.length} categories
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
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>Create a new category for product grouping.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCategory} className="space-y-4 p-4">
            <div className="space-y-2">
              <label htmlFor="new-category" className="text-sm font-medium">Category Name</label>
              <Input
                id="new-category"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="new-category-description" className="text-sm font-medium">Description</label>
              <Input
                id="new-category-description"
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]">
                Save Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Category Details</DialogTitle>
            <DialogDescription>View selected category information.</DialogDescription>
          </DialogHeader>
          {selectedCategory ? (
            <div className="grid gap-3 p-4 text-sm">
              <p><span className="font-medium">ID:</span> {selectedCategory.id}</p>
              <p><span className="font-medium">Category Name:</span> {selectedCategory.name}</p>
              <p><span className="font-medium">Description:</span> {selectedCategory.description || "-"}</p>
              <p><span className="font-medium">Created At:</span> {new Date(selectedCategory.createdAt).toLocaleString()}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category name and save.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditCategory} className="space-y-4 p-4">
            <div className="space-y-2">
              <label htmlFor="edit-category" className="text-sm font-medium">Category Name</label>
              <Input
                id="edit-category"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-category-description" className="text-sm font-medium">Description</label>
              <Input
                id="edit-category-description"
                value={editCategoryDescription}
                onChange={(e) => setEditCategoryDescription(e.target.value)}
                placeholder="Optional description"
              />
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
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected category will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}
