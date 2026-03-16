"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
import {
  createProduct,
  deleteProduct,
  getCategories,
  getNextProductCode,
  getProducts,
  uploadProductImage,
  updateProduct,
  type ProductApiPayload,
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
  BarcodeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "lucide-react"
import type { CSSProperties } from "react"

type ApiProduct = {
  id: number
  category_id: number
  category_name: string
  product_code: string
  product_name: string
  description: string | null
  image: string | null
  has_expire_date?: boolean
  expire_date?: string | null
  opening_quantity: number
  minimum_sale_quantity?: number
  stock_alert?: number
  purchase_cost: string | number
  sale_cost: string | number
  reorder_level?: number
  created_at?: string
}

type ApiCategory = {
  id: number
  category_name?: string
  name?: string
}

type ProductForm = {
  product_name: string
  category_id: string
  product_code: string
  image: string
  has_expire_date: "yes" | "no"
  expire_date: string
  opening_quantity: string
  minimum_sale_quantity: string
  stock_alert: string
  purchase_cost: string
  sale_cost: string
  reorder_level: string
  description: string
}

const PAGE_SIZE = 5

const emptyForm: ProductForm = {
  product_name: "",
  category_id: "",
  product_code: "",
  image: "",
  has_expire_date: "no",
  expire_date: "",
  opening_quantity: "",
  minimum_sale_quantity: "0",
  stock_alert: "0",
  purchase_cost: "",
  sale_cost: "",
  reorder_level: "",
  description: "",
}

const API_ORIGIN = "http://localhost:5000"
const PLACEHOLDER_IMAGE = "/placeholder-product.svg"

const generateLocalBarcode = () => `${Date.now()}${Math.floor(100 + Math.random() * 900)}`.slice(-12)

export default function ProductsPage() {
  const [products, setProducts] = React.useState<ApiProduct[]>([])
  const [categories, setCategories] = React.useState<ApiCategory[]>([])
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)

  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isViewOpen, setIsViewOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  const [selectedProduct, setSelectedProduct] = React.useState<ApiProduct | null>(null)
  const [addForm, setAddForm] = React.useState<ProductForm>(emptyForm)
  const [editForm, setEditForm] = React.useState<ProductForm>(emptyForm)
  const [submitting, setSubmitting] = React.useState(false)

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const toImageUrl = React.useCallback((imagePath: string | null | undefined) => {
    if (!imagePath) {
      return null
    }

    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath
    }

    if (imagePath.startsWith("/")) {
      return `${API_ORIGIN}${imagePath}`
    }

    return `${API_ORIGIN}/${imagePath}`
  }, [])

  const validateProductForm = React.useCallback((form: ProductForm): string | null => {
    if (!form.product_name.trim() || form.product_name.trim().length < 2) {
      return "Product name must be at least 2 characters."
    }

    if (!form.category_id) {
      return "Category is required."
    }

    const openingQuantity = Number(form.opening_quantity)
    if (!Number.isInteger(openingQuantity) || openingQuantity < 0) {
      return "Opening quantity must be a non-negative integer."
    }

    const minimumSaleQuantity = Number(form.minimum_sale_quantity || 0)
    if (!Number.isInteger(minimumSaleQuantity) || minimumSaleQuantity < 0) {
      return "Minimum sale quantity must be a non-negative integer."
    }

    const stockAlert = Number(form.stock_alert || 0)
    if (!Number.isInteger(stockAlert) || stockAlert < 0) {
      return "Stock alert must be a non-negative integer."
    }

    const purchaseCost = Number(form.purchase_cost)
    const saleCost = Number(form.sale_cost)
    if (!Number.isFinite(purchaseCost) || purchaseCost < 0) {
      return "Purchase cost must be a non-negative number."
    }
    if (!Number.isFinite(saleCost) || saleCost < 0) {
      return "Sale cost must be a non-negative number."
    }

    if (form.has_expire_date === "yes" && !form.expire_date) {
      return "Expire date is required when 'Has Expire Date' is Yes."
    }

    return null
  }, [])

  const loadProducts = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getProducts<ApiProduct[]>()
      setProducts(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCategories = React.useCallback(async () => {
    try {
      const data = await getCategories<ApiCategory[]>()
      setCategories(Array.isArray(data) ? data : [])
    } catch {
      setCategories([])
    }
  }, [])

  React.useEffect(() => {
    loadProducts()
    loadCategories()
  }, [loadProducts, loadCategories])

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) {
      return products
    }

    return products.filter((item) => {
      return (
        item.product_name.toLowerCase().includes(query) ||
        item.category_name.toLowerCase().includes(query) ||
        item.product_code.toLowerCase().includes(query)
      )
    })
  }, [products, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const rows = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, currentPage])

  const buildPayload = (form: ProductForm): ProductApiPayload => {
    const hasExpireDate = form.has_expire_date === "yes"

    return {
      category_id: Number(form.category_id),
      product_code: form.product_code.trim() || null,
      product_name: form.product_name.trim(),
      description: form.description.trim() || null,
      image: form.image.trim() || null,
      has_expire_date: hasExpireDate,
      expire_date: hasExpireDate && form.expire_date ? form.expire_date : null,
      opening_quantity: Number(form.opening_quantity),
      minimum_sale_quantity: Number(form.minimum_sale_quantity || 0),
      stock_alert: Number(form.stock_alert || 0),
      purchase_cost: Number(form.purchase_cost),
      sale_cost: Number(form.sale_cost),
      reorder_level: Number(form.stock_alert || 0),
    }
  }

  const handleAddImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const uploaded = await uploadProductImage(file)
      setAddForm((prev) => ({ ...prev, image: uploaded.image }))
      appNotify.created("Product image")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload image"
      appNotify.failed("Upload image", message)
    }
  }

  const handleGenerateAddBarcode = async () => {
    try {
      const result = await getNextProductCode()
      setAddForm((prev) => ({ ...prev, product_code: result.code }))
      appNotify.updated("Product code")
    } catch (err) {
      const fallbackCode = generateLocalBarcode()
      setAddForm((prev) => ({ ...prev, product_code: fallbackCode }))
      appNotify.updated("Product code")
    }
  }

  const handleGenerateEditBarcode = async () => {
    try {
      const result = await getNextProductCode()
      setEditForm((prev) => ({ ...prev, product_code: result.code }))
      appNotify.updated("Product code")
    } catch (err) {
      const fallbackCode = generateLocalBarcode()
      setEditForm((prev) => ({ ...prev, product_code: fallbackCode }))
      appNotify.updated("Product code")
    }
  }

  const handleEditImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const uploaded = await uploadProductImage(file)
      setEditForm((prev) => ({ ...prev, image: uploaded.image }))
      appNotify.updated("Product image")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload image"
      appNotify.failed("Upload image", message)
    }
  }

  const handleAddProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationError = validateProductForm(addForm)
    if (validationError) {
      appNotify.failed("Validation", validationError)
      return
    }

    setSubmitting(true)

    try {
      await createProduct(buildPayload(addForm))
      setIsAddOpen(false)
      setAddForm(emptyForm)
      await loadProducts()
      appNotify.created("Product")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create product"
      setError(message)
      appNotify.failed("Create product", message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedProduct) {
      return
    }

    const validationError = validateProductForm(editForm)
    if (validationError) {
      appNotify.failed("Validation", validationError)
      return
    }

    setSubmitting(true)

    try {
      await updateProduct(selectedProduct.id, buildPayload(editForm))
      setIsEditOpen(false)
      setSelectedProduct(null)
      await loadProducts()
      appNotify.updated("Product")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update product"
      setError(message)
      appNotify.failed("Update product", message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteProduct = async () => {
    if (!deleteId) {
      return
    }

    try {
      await deleteProduct(deleteId)
      setDeleteId(null)
      await loadProducts()
      appNotify.deleted("Product")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete product"
      setError(message)
      appNotify.failed("Delete product", message)
    }
  }

  const openViewModal = (product: ApiProduct) => {
    setSelectedProduct(product)
    setIsViewOpen(true)
  }

  const openEditModal = (product: ApiProduct) => {
    setSelectedProduct(product)
    setEditForm({
      product_name: product.product_name,
      category_id: String(product.category_id),
      product_code: product.product_code,
      image: product.image || "",
      has_expire_date: product.has_expire_date ? "yes" : "no",
      expire_date: product.expire_date ? new Date(product.expire_date).toISOString().slice(0, 10) : "",
      opening_quantity: String(product.opening_quantity),
      minimum_sale_quantity: String(product.minimum_sale_quantity ?? 0),
      stock_alert: String(product.stock_alert ?? product.reorder_level ?? 0),
      purchase_cost: String(product.purchase_cost),
      sale_cost: String(product.sale_cost),
      reorder_level: String(product.stock_alert ?? product.reorder_level ?? 0),
      description: product.description || "",
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
                <CardTitle className="text-lg">Products</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage products, categories, stock status, and pricing.
                </p>
                {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
              </div>

              <Button
                className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]"
                onClick={() => setIsAddOpen(true)}
              >
                <PlusIcon className="mr-1 size-4" />
                Add Product
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by product, category, or SKU..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                />
              </div>

              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead>Stock Alert</TableHead>
                      <TableHead>Purchase Cost</TableHead>
                      <TableHead>Sale Cost</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          Loading products...
                        </TableCell>
                      </TableRow>
                    ) : null}

                    {rows.map((row) => {
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.product_name}</TableCell>
                          <TableCell>{row.category_name}</TableCell>
                          <TableCell>
                            <a href={toImageUrl(row.image) || PLACEHOLDER_IMAGE} target="_blank" rel="noreferrer" className="inline-block">
                              <img
                                src={toImageUrl(row.image) || PLACEHOLDER_IMAGE}
                                alt={row.product_name}
                                className="h-10 w-10 rounded-md border object-cover"
                              />
                            </a>
                          </TableCell>
                          <TableCell>{row.stock_alert ?? row.reorder_level ?? 0}</TableCell>
                          <TableCell>${Number(row.purchase_cost).toFixed(2)}</TableCell>
                          <TableCell>${Number(row.sale_cost).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openViewModal(row)}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-[#3FA3D3]"
                                aria-label="View product"
                              >
                                <EyeIcon className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(row)}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-amber-600"
                                aria-label="Edit product"
                              >
                                <PencilIcon className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteId(row.id)}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-rose-600"
                                aria-label="Delete product"
                              >
                                <TrashIcon className="size-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}

                    {!loading && rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          No products found.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-start justify-between gap-2 text-sm text-muted-foreground md:flex-row md:items-center">
                <p>
                  Showing {(currentPage - 1) * PAGE_SIZE + (rows.length ? 1 : 0)}-
                  {(currentPage - 1) * PAGE_SIZE + rows.length} of {filtered.length} products
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
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>Create a product with professional defaults and auto barcode generation.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddProduct} className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="add-product-name" className="text-sm font-medium">Product Name</label>
                <Input
                  id="add-product-name"
                  value={addForm.product_name}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, product_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="add-product-category" className="text-sm font-medium">Category</label>
                <Select
                  value={addForm.category_id}
                  onValueChange={(value) =>
                    setAddForm((prev) => ({ ...prev, category_id: value || "" }))
                  }
                >
                  <SelectTrigger id="add-product-category" className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.category_name || category.name || `Category ${category.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="add-sku" className="text-sm font-medium">Product Code (Barcode)</label>
                <div className="flex gap-2">
                  <Input
                    id="add-sku"
                    value={addForm.product_code}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, product_code: e.target.value }))}
                    placeholder="Auto generated if left empty"
                  />
                  <Button type="button" variant="outline" onClick={handleGenerateAddBarcode}>
                    <BarcodeIcon className="mr-1 size-4" />
                    Generate
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="add-image" className="text-sm font-medium">Product Image</label>
                <Input
                  id="add-image"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleAddImageUpload}
                />
                {addForm.image ? (
                  <a href={toImageUrl(addForm.image) || undefined} target="_blank" rel="noreferrer" className="text-xs text-[#3FA3D3] hover:underline">
                    Uploaded image preview
                  </a>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="add-opening-qty" className="text-sm font-medium">Opening Quantity</label>
                <Input
                  id="add-opening-qty"
                  type="number"
                  min="0"
                  value={addForm.opening_quantity}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, opening_quantity: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="add-min-sale-qty" className="text-sm font-medium">Minimum Sale Quantity</label>
                <Input
                  id="add-min-sale-qty"
                  type="number"
                  min="0"
                  value={addForm.minimum_sale_quantity}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, minimum_sale_quantity: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="add-stock-alert" className="text-sm font-medium">Stock Alert</label>
              <Input
                id="add-stock-alert"
                type="number"
                min="0"
                value={addForm.stock_alert}
                onChange={(e) => setAddForm((prev) => ({ ...prev, stock_alert: e.target.value, reorder_level: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="add-purchase-cost" className="text-sm font-medium">Purchase Cost</label>
                <Input
                  id="add-purchase-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={addForm.purchase_cost}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, purchase_cost: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="add-sale-cost" className="text-sm font-medium">Sale Cost</label>
                <Input
                  id="add-sale-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={addForm.sale_cost}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, sale_cost: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="add-description" className="text-sm font-medium">Description</label>
              <Input
                id="add-description"
                value={addForm.description}
                onChange={(e) => setAddForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]" disabled={submitting}>
                Save Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>Selected product overview.</DialogDescription>
          </DialogHeader>
          {selectedProduct ? (
            <div className="grid gap-3 p-4 text-sm">
              <p><span className="font-medium">Product Name:</span> {selectedProduct.product_name}</p>
              <p><span className="font-medium">Category:</span> {selectedProduct.category_name}</p>
              <p><span className="font-medium">Product Code:</span> {selectedProduct.product_code}</p>
              <p><span className="font-medium">Purchase Cost:</span> ${Number(selectedProduct.purchase_cost).toFixed(2)}</p>
              <p><span className="font-medium">Sale Cost:</span> ${Number(selectedProduct.sale_cost).toFixed(2)}</p>
              <p><span className="font-medium">Opening Quantity:</span> {selectedProduct.opening_quantity}</p>
              <p><span className="font-medium">Minimum Sale Quantity:</span> {selectedProduct.minimum_sale_quantity ?? 0}</p>
              <p><span className="font-medium">Stock Alert:</span> {selectedProduct.stock_alert ?? selectedProduct.reorder_level ?? 0}</p>
              <div className="space-y-2">
                <p><span className="font-medium">Image:</span></p>
                <a href={toImageUrl(selectedProduct.image) || PLACEHOLDER_IMAGE} target="_blank" rel="noreferrer" className="inline-block">
                  <img
                    src={toImageUrl(selectedProduct.image) || PLACEHOLDER_IMAGE}
                    alt={selectedProduct.product_name}
                    className="h-20 w-20 rounded-md border object-cover"
                  />
                </a>
              </div>
              <p><span className="font-medium">Has Expire Date:</span> {selectedProduct.has_expire_date ? "Yes" : "No"}</p>
              <p><span className="font-medium">Expire Date:</span> {selectedProduct.expire_date ? new Date(selectedProduct.expire_date).toLocaleDateString() : "-"}</p>
              <p><span className="font-medium">Description:</span> {selectedProduct.description || "N/A"}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update details and save changes.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProduct} className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="edit-product-name" className="text-sm font-medium">Product Name</label>
                <Input
                  id="edit-product-name"
                  value={editForm.product_name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, product_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-category" className="text-sm font-medium">Category</label>
                <Select
                  value={editForm.category_id}
                  onValueChange={(value) =>
                    setEditForm((prev) => ({ ...prev, category_id: value || "" }))
                  }
                >
                  <SelectTrigger id="edit-category" className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.category_name || category.name || `Category ${category.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="edit-sku" className="text-sm font-medium">Product Code (Barcode)</label>
                <div className="flex gap-2">
                  <Input
                    id="edit-sku"
                    value={editForm.product_code}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, product_code: e.target.value }))}
                    placeholder="Auto generated if left empty"
                  />
                  <Button type="button" variant="outline" onClick={handleGenerateEditBarcode}>
                    <BarcodeIcon className="mr-1 size-4" />
                    Generate
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-image" className="text-sm font-medium">Product Image</label>
                <Input
                  id="edit-image"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleEditImageUpload}
                />
                {editForm.image ? (
                  <a href={toImageUrl(editForm.image) || undefined} target="_blank" rel="noreferrer" className="text-xs text-[#3FA3D3] hover:underline">
                    Uploaded image preview
                  </a>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="edit-expire-flag" className="text-sm font-medium">Has Expire Date</label>
                <Select
                  value={editForm.has_expire_date}
                  onValueChange={(value) =>
                    setEditForm((prev) => ({
                      ...prev,
                      has_expire_date: value === "yes" ? "yes" : "no",
                      expire_date: value === "yes" ? prev.expire_date : "",
                    }))
                  }
                >
                  <SelectTrigger id="edit-expire-flag" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-expire-date" className="text-sm font-medium">Expire Date</label>
                <Input
                  id="edit-expire-date"
                  type="date"
                  value={editForm.expire_date}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, expire_date: e.target.value }))}
                  disabled={editForm.has_expire_date !== "yes"}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="edit-stock" className="text-sm font-medium">Stock</label>
                <Input
                  id="edit-stock"
                  type="number"
                  min="0"
                  value={editForm.opening_quantity}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, opening_quantity: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-min-sale-qty" className="text-sm font-medium">Minimum Sale Quantity</label>
                <Input
                  id="edit-min-sale-qty"
                  type="number"
                  min="0"
                  value={editForm.minimum_sale_quantity}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, minimum_sale_quantity: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-stock-alert" className="text-sm font-medium">Stock Alert</label>
              <Input
                id="edit-stock-alert"
                type="number"
                min="0"
                value={editForm.stock_alert}
                onChange={(e) => setEditForm((prev) => ({ ...prev, stock_alert: e.target.value, reorder_level: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="edit-purchase-cost" className="text-sm font-medium">Purchase Cost</label>
                <Input
                  id="edit-purchase-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.purchase_cost}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, purchase_cost: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-sale-cost" className="text-sm font-medium">Sale Cost</label>
                <Input
                  id="edit-sale-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.sale_cost}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, sale_cost: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-description" className="text-sm font-medium">Description</label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]" disabled={submitting}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected product will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}
