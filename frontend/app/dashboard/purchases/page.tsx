"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
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
  createPurchase,
  getPurchaseById,
  getPurchaseItemsByPurchaseId,
  getPurchases,
  getSuppliers,
  getWarehouses,
  searchProducts,
  updatePurchase,
  type ProductSearchResult,
  type PurchaseCreatePayload,
} from "@/lib/api"
import { appNotify } from "@/lib/notify"
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  EyeIcon,
  FileDownIcon,
  FilterIcon,
  MailIcon,
  MessageSquareIcon,
  MinusIcon,
  PencilIcon,
  PlusCircleIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  Trash2Icon,
  WalletCardsIcon,
  XIcon,
} from "lucide-react"
import type { CSSProperties } from "react"

type ApiPurchase = {
  id: number
  transaction_number: string
  supplier_id: number
  supplier_name: string
  warehouse_id?: number | null
  warehouse_name?: string | null
  purchase_date: string
  payment_mode: string
  cash_amount: string | number
  total: string | number
  discount: string | number
  discount_type?: string | null
  order_tax?: string | number
  shipping?: string | number
  total_amount?: string | number
  grand_total: string | number
  paid: string | number
  rest: string | number
  notes?: string | null
  created_at: string
}

type ApiPurchaseDetail = ApiPurchase & {
  items: Array<{
    product_id: number
    product_name: string
    barcode: string | null
    unit_cost: string | number
    current_stock: string | number
    quantity: number
    discount: string | number
    tax: string | number
    subtotal: string | number
  }>
}

type ApiPurchaseItem = {
  product_id: number
  product_name: string
  barcode: string | null
  unit_cost: string | number
  current_stock: string | number
  quantity: number
  discount: string | number
  tax: string | number
}

type ApiSupplier = {
  id: number
  full_name?: string
  supplier_name?: string
}

type ApiWarehouse = {
  id: number
  warehouse_name: string
  location: string | null
}

type PurchaseActionKey =
  | "purchase-detail"
  | "edit-purchase"
  | "purchase-return"
  | "show-payments"
  | "create-payment"
  | "download-pdf"
  | "send-email"
  | "send-sms"
  | "delete-purchase"

type PurchaseAction = {
  key: PurchaseActionKey
  label: string
  icon: React.ComponentType<{ className?: string }>
  isDanger?: boolean
}

type PurchaseItemRow = {
  product_id: number
  product_name: string
  barcode: string | null
  unit_cost: number
  current_stock: number
  quantity: number
  discount: number
  tax: number
}

type PurchaseFormState = {
  purchase_date: string
  supplier_id: string
  warehouse_id: string
  order_tax: string
  discount: string
  discount_type: "fixed" | "percent"
  shipping: string
  notes: string
}

const PAGE_SIZE = 10

const ACTION_ITEMS: PurchaseAction[] = [
  { key: "purchase-detail", label: "Purchase Detail", icon: EyeIcon },
  { key: "edit-purchase", label: "Edit Purchase", icon: PencilIcon },
  { key: "purchase-return", label: "Purchase Return", icon: RotateCcwIcon },
  { key: "show-payments", label: "Show Payments", icon: WalletCardsIcon },
  { key: "create-payment", label: "Create Payment", icon: PlusCircleIcon },
  { key: "download-pdf", label: "Download Pdf", icon: FileDownIcon },
  { key: "send-email", label: "Send Email", icon: MailIcon },
  { key: "send-sms", label: "Send SMS", icon: MessageSquareIcon },
  { key: "delete-purchase", label: "Delete Purchase", icon: Trash2Icon, isDanger: true },
]

const defaultPurchaseForm: PurchaseFormState = {
  purchase_date: new Date().toISOString().slice(0, 16),
  supplier_id: "",
  warehouse_id: "",
  order_tax: "0",
  discount: "0",
  discount_type: "fixed",
  shipping: "0",
  notes: "",
}

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatCurrency(value: string | number) {
  return `$${toNumber(value).toFixed(2)}`
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-CA")
}

function getPaymentModeTone(mode: string) {
  const normalized = mode.toLowerCase()

  if (normalized.includes("cash")) {
    return "bg-emerald-100 text-emerald-700"
  }

  if (normalized.includes("bank")) {
    return "bg-blue-100 text-blue-700"
  }

  if (normalized.includes("credit")) {
    return "bg-violet-100 text-violet-700"
  }

  return "bg-zinc-100 text-zinc-700"
}

function getPaymentStatus(purchase: ApiPurchase) {
  const paid = toNumber(purchase.paid)
  const due = toNumber(purchase.rest)

  if (due <= 0) {
    return { label: "Paid", className: "bg-emerald-100 text-emerald-700" }
  }

  if (paid > 0) {
    return { label: "Partial", className: "bg-blue-100 text-blue-700" }
  }

  return { label: "Unpaid", className: "bg-amber-100 text-amber-700" }
}

function getItemSubtotal(item: PurchaseItemRow) {
  const subtotal = item.quantity * item.unit_cost + item.tax - item.discount
  return subtotal > 0 ? subtotal : 0
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = React.useState<ApiPurchase[]>([])
  const [suppliers, setSuppliers] = React.useState<ApiSupplier[]>([])
  const [warehouses, setWarehouses] = React.useState<ApiWarehouse[]>([])

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)

  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isActionOpen, setIsActionOpen] = React.useState(false)
  const [selectedPurchase, setSelectedPurchase] = React.useState<ApiPurchase | null>(null)
  const [selectedAction, setSelectedAction] = React.useState<PurchaseAction | null>(null)

  const [addForm, setAddForm] = React.useState<PurchaseFormState>(defaultPurchaseForm)
  const [purchaseItems, setPurchaseItems] = React.useState<PurchaseItemRow[]>([])
  const [productSearch, setProductSearch] = React.useState("")
  const [productOptions, setProductOptions] = React.useState<ProductSearchResult[]>([])
  const [searchLoading, setSearchLoading] = React.useState(false)
  const [submitLoading, setSubmitLoading] = React.useState(false)
  const [isEditMode, setIsEditMode] = React.useState(false)
  const [editingPurchaseId, setEditingPurchaseId] = React.useState<number | null>(null)
  const [editSupplierLabel, setEditSupplierLabel] = React.useState("")
  const [editWarehouseLabel, setEditWarehouseLabel] = React.useState("")

  const searchCacheRef = React.useRef<Map<string, ProductSearchResult[]>>(new Map())

  const canSearchProducts = Boolean(addForm.supplier_id && addForm.warehouse_id)
  const productSearchGateMessage = !addForm.supplier_id
    ? "Select supplier first to search products."
    : !addForm.warehouse_id
      ? "Select warehouse first to search products."
      : ""

  const loadPurchases = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getPurchases<ApiPurchase[]>()
      setPurchases(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch purchases")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSelectionData = React.useCallback(async () => {
    try {
      const [suppliersData, warehousesData] = await Promise.all([
        getSuppliers<ApiSupplier[]>(),
        getWarehouses<ApiWarehouse[]>(),
      ])

      const safeSuppliers = Array.isArray(suppliersData) ? suppliersData : []
      const safeWarehouses = Array.isArray(warehousesData) ? warehousesData : []

      setSuppliers(safeSuppliers)
      setWarehouses(safeWarehouses)

      if (safeWarehouses.length > 0) {
        setAddForm((prev) => ({ ...prev, warehouse_id: prev.warehouse_id || String(safeWarehouses[0].id) }))
      }
    } catch {
      // Selection lists will remain empty if API is unavailable.
    }
  }, [])

  React.useEffect(() => {
    loadPurchases()
    loadSelectionData()
  }, [loadPurchases, loadSelectionData])

  React.useEffect(() => {
    if (!isAddOpen) {
      return
    }

    if (!canSearchProducts) {
      setProductOptions([])
      return
    }

    const query = productSearch.trim()
    if (query.length < 2) {
      setProductOptions([])
      return
    }

    const cacheKey = query.toLowerCase()
    const cached = searchCacheRef.current.get(cacheKey)
    if (cached) {
      setProductOptions(cached)
      return
    }

    const timeoutId = window.setTimeout(async () => {
      setSearchLoading(true)
      try {
        const results = await searchProducts(query)
        searchCacheRef.current.set(cacheKey, results)
        setProductOptions(results)
      } catch {
        setProductOptions([])
      } finally {
        setSearchLoading(false)
      }
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [productSearch, isAddOpen, canSearchProducts])

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return purchases
    }

    return purchases.filter((item) => {
      return (
        item.transaction_number.toLowerCase().includes(query) ||
        item.supplier_name.toLowerCase().includes(query)
      )
    })
  }, [purchases, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const rows = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, currentPage])

  const itemTotals = React.useMemo(() => {
    return purchaseItems.map((item) => ({
      ...item,
      subtotal: getItemSubtotal(item),
    }))
  }, [purchaseItems])

  const orderTotal = React.useMemo(() => {
    return itemTotals.reduce((sum, item) => sum + item.subtotal, 0)
  }, [itemTotals])

  const orderTaxValue = toNumber(addForm.order_tax)
  const shippingValue = toNumber(addForm.shipping)
  const discountInput = toNumber(addForm.discount)

  const discountValue = React.useMemo(() => {
    if (addForm.discount_type === "percent") {
      return (orderTotal * discountInput) / 100
    }

    return discountInput
  }, [addForm.discount_type, discountInput, orderTotal])

  const grandTotal = React.useMemo(() => {
    const total = orderTotal + orderTaxValue + shippingValue - discountValue
    return total > 0 ? total : 0
  }, [orderTotal, orderTaxValue, shippingValue, discountValue])

  const openCreateModal = () => {
    setIsEditMode(false)
    setEditingPurchaseId(null)
    setEditSupplierLabel("")
    setEditWarehouseLabel("")
    resetAddModal()
    setIsAddOpen(true)
  }

  const openEditModal = async (purchase: ApiPurchase) => {
    setSubmitLoading(true)
    try {
      await loadSelectionData()
      const details = await getPurchaseById<ApiPurchaseDetail>(purchase.id)
      const detailsItems = Array.isArray(details.items) ? details.items : []
      let fallbackItems: ApiPurchaseItem[] = []

      if (detailsItems.length === 0) {
        try {
          const fallbackResponse = await getPurchaseItemsByPurchaseId<ApiPurchaseItem[]>(purchase.id)
          fallbackItems = Array.isArray(fallbackResponse) ? fallbackResponse : []
        } catch {
          // Keep non-blocking fallback: edit can still proceed with available details.
        }
      }

      const safeItems = detailsItems.length > 0 ? detailsItems : fallbackItems

      setEditSupplierLabel(details.supplier_name || "")
      setEditWarehouseLabel(details.warehouse_name || "")

      setAddForm({
        purchase_date: new Date(details.purchase_date).toISOString().slice(0, 16),
        supplier_id: String(details.supplier_id),
        warehouse_id: String(details.warehouse_id || ""),
        order_tax: String(toNumber(details.order_tax)),
        discount: String(toNumber(details.discount)),
        discount_type: details.discount_type === "percent" ? "percent" : "fixed",
        shipping: String(toNumber(details.shipping)),
        notes: details.notes || "",
      })

      setPurchaseItems(
        safeItems.map((item) => ({
          product_id: Number(item.product_id),
          product_name: item.product_name,
          barcode: item.barcode,
          unit_cost: toNumber(item.unit_cost),
          current_stock: toNumber(item.current_stock),
          quantity: Math.max(1, toNumber(item.quantity)),
          discount: toNumber(item.discount),
          tax: toNumber(item.tax),
        }))
      )

      if (safeItems.length === 0) {
        appNotify.failed("Edit purchase", "No purchase items found for this purchase. Add items before updating.")
      }

      setIsEditMode(true)
      setEditingPurchaseId(purchase.id)
      setProductSearch("")
      setProductOptions([])
      setIsAddOpen(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load purchase details"
      appNotify.failed("Edit purchase", message)
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleActionClick = async (action: PurchaseAction, purchase: ApiPurchase) => {
    if (action.key === "edit-purchase") {
      await openEditModal(purchase)
      return
    }

    setSelectedAction(action)
    setSelectedPurchase(purchase)
    setIsActionOpen(true)
  }

  const resetAddModal = () => {
    setAddForm((prev) => ({ ...defaultPurchaseForm, warehouse_id: prev.warehouse_id }))
    setPurchaseItems([])
    setProductSearch("")
    setProductOptions([])
    setEditSupplierLabel("")
    setEditWarehouseLabel("")
  }

  const selectedSupplierLabel = React.useMemo(() => {
    const selected = suppliers.find((supplier) => String(supplier.id) === addForm.supplier_id)
    if (selected) {
      return selected.supplier_name || selected.full_name || `Supplier ${selected.id}`
    }
    return editSupplierLabel
  }, [suppliers, addForm.supplier_id, editSupplierLabel])

  const selectedWarehouseLabel = React.useMemo(() => {
    const selected = warehouses.find((warehouse) => String(warehouse.id) === addForm.warehouse_id)
    if (selected) {
      return selected.warehouse_name
    }
    return editWarehouseLabel
  }, [warehouses, addForm.warehouse_id, editWarehouseLabel])

  const addProductToPurchase = (product: ProductSearchResult) => {
    setPurchaseItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.product_id === product.product_id)

      if (existingIndex >= 0) {
        return prev.map((item, index) => {
          if (index !== existingIndex) {
            return item
          }

          return {
            ...item,
            quantity: item.quantity + 1,
          }
        })
      }

      return [
        ...prev,
        {
          product_id: product.product_id,
          product_name: product.product_name,
          barcode: product.barcode,
          unit_cost: toNumber(product.cost_price),
          current_stock: toNumber(product.current_stock),
          quantity: 1,
          discount: 0,
          tax: 0,
        },
      ]
    })

    setProductSearch("")
    setProductOptions([])
  }

  const updateItemQuantity = (productId: number, delta: number) => {
    setPurchaseItems((prev) => {
      return prev.map((item) => {
        if (item.product_id !== productId) {
          return item
        }

        const nextQuantity = item.quantity + delta
        return {
          ...item,
          quantity: nextQuantity < 1 ? 1 : nextQuantity,
        }
      })
    })
  }

  const removeItem = (productId: number) => {
    setPurchaseItems((prev) => prev.filter((item) => item.product_id !== productId))
  }

  const validateBeforeSave = () => {
    if (!addForm.supplier_id) {
      return "Supplier must be selected."
    }

    if (!addForm.warehouse_id) {
      return "Warehouse must be selected."
    }

    if (purchaseItems.length === 0) {
      return "At least one product must exist in purchase list."
    }

    if (purchaseItems.some((item) => item.quantity <= 0)) {
      return "Each item quantity must be greater than 0."
    }

    return null
  }

  const submitPurchase = async () => {
    const validationError = validateBeforeSave()
    if (validationError) {
      appNotify.failed("Validation", validationError)
      return
    }

    setSubmitLoading(true)

    try {
      const payload: PurchaseCreatePayload = {
        supplier_id: Number(addForm.supplier_id),
        warehouse_id: Number(addForm.warehouse_id),
        purchase_date: new Date(addForm.purchase_date).toISOString(),
        order_tax: orderTaxValue,
        discount: discountInput,
        discount_type: addForm.discount_type,
        shipping: shippingValue,
        notes: addForm.notes.trim() || null,
        items: purchaseItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          tax: item.tax,
          discount: item.discount,
        })),
      }

      if (isEditMode && editingPurchaseId) {
        await updatePurchase(editingPurchaseId, payload)
        appNotify.updated("Purchase")
      } else {
        await createPurchase(payload)
        appNotify.created("Purchase")
      }

      setIsAddOpen(false)
      resetAddModal()
      setIsEditMode(false)
      setEditingPurchaseId(null)
      await loadPurchases()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save purchase"
      appNotify.failed(isEditMode ? "Update purchase" : "Create purchase", message)
    } finally {
      setSubmitLoading(false)
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
                <CardTitle className="text-lg">Purchases</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage and track your procurement transactions.
                </p>
                {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline">
                  <DownloadIcon className="mr-1 size-4" />
                  Export
                </Button>
                <Button className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]" onClick={openCreateModal}>
                  <PlusIcon className="mr-1 size-4" />
                  New Purchase
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    placeholder="Search transaction number or supplier..."
                    className="pl-9"
                  />
                </div>

                <Button variant="outline">
                  <FilterIcon className="mr-1 size-4" />
                  Filter
                </Button>

                <Button variant="outline">
                  <CalendarIcon className="mr-1 size-4" />
                  This Month
                </Button>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction No.</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Purchase Date</TableHead>
                      <TableHead>Purchase Mode</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                          Loading purchases...
                        </TableCell>
                      </TableRow>
                    ) : null}

                    {rows.map((row) => {
                      const paymentStatus = getPaymentStatus(row)

                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium text-[#3FA3D3]">{row.transaction_number}</TableCell>
                          <TableCell className="font-medium">{row.supplier_name}</TableCell>
                          <TableCell>{formatDate(row.purchase_date)}</TableCell>
                          <TableCell>
                            <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${getPaymentModeTone(row.payment_mode)}`}>
                              {row.payment_mode}
                            </span>
                          </TableCell>
                          <TableCell>{formatCurrency(row.paid)}</TableCell>
                          <TableCell className="font-semibold text-orange-600">{formatCurrency(row.rest)}</TableCell>
                          <TableCell>
                            <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${paymentStatus.className}`}>
                              {paymentStatus.label}
                            </span>
                          </TableCell>
                          <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
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
                                          void handleActionClick(action, row)
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
                      )
                    })}

                    {!loading && rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                          No purchases found.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-start justify-between gap-2 text-sm text-muted-foreground md:flex-row md:items-center">
                <p>
                  Showing {(currentPage - 1) * PAGE_SIZE + (rows.length ? 1 : 0)}-
                  {(currentPage - 1) * PAGE_SIZE + rows.length} of {filtered.length} purchases
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
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Update Purchase" : "Add Purchase"}</DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update purchase details/items and save with automatic stock adjustment."
                : "Search products, adjust quantities, and save purchase with automatic stock update."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Purchase Date</label>
                <Input
                  type="datetime-local"
                  value={addForm.purchase_date}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, purchase_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Supplier *</label>
                <Select
                  value={addForm.supplier_id}
                  onValueChange={(value) => setAddForm((prev) => ({ ...prev, supplier_id: value || "" }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select supplier">{selectedSupplierLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => {
                      const label = supplier.supplier_name || supplier.full_name || `Supplier ${supplier.id}`
                      return (
                        <SelectItem key={supplier.id} value={String(supplier.id)}>
                          {label}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Warehouse *</label>
                <Select
                  value={addForm.warehouse_id}
                  onValueChange={(value) => setAddForm((prev) => ({ ...prev, warehouse_id: value || "" }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select warehouse">{selectedWarehouseLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                        {warehouse.warehouse_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={productSearch}
                onChange={(e) => {
                  if (!canSearchProducts) {
                    appNotify.failed("Search blocked", productSearchGateMessage)
                    return
                  }
                  setProductSearch(e.target.value)
                }}
                onFocus={() => {
                  if (!canSearchProducts) {
                    appNotify.failed("Search blocked", productSearchGateMessage)
                  }
                }}
                placeholder={canSearchProducts ? "Scan/Search Product by code or name" : productSearchGateMessage}
                className="pl-9"
                readOnly={!canSearchProducts}
              />

              {!canSearchProducts ? (
                <p className="mt-1 text-xs text-amber-700">{productSearchGateMessage}</p>
              ) : null}

              {isAddOpen && canSearchProducts && productSearch.trim().length >= 2 ? (
                <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-white shadow">
                  {searchLoading ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
                  ) : productOptions.length > 0 ? (
                    productOptions.map((product) => (
                      <button
                        type="button"
                        key={`${product.product_id}-${product.barcode || "nobar"}`}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-50"
                        onClick={() => addProductToPurchase(product)}
                      >
                        <span>
                          <span className="font-medium">{product.product_name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{product.barcode || "No barcode"}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">Stock: {toNumber(product.current_stock)}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No products found.</div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Net Unit Cost</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemTotals.map((item, index) => (
                    <TableRow key={item.product_id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-xs text-muted-foreground">{item.barcode || "No barcode"}</div>
                      </TableCell>
                      <TableCell>{formatCurrency(item.unit_cost)}</TableCell>
                      <TableCell>{item.current_stock}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="outline" size="icon-xs" onClick={() => updateItemQuantity(item.product_id, -1)}>
                            <MinusIcon className="size-3" />
                          </Button>
                          <span className="min-w-6 text-center text-sm font-medium">{item.quantity}</span>
                          <Button type="button" variant="outline" size="icon-xs" onClick={() => updateItemQuantity(item.product_id, 1)}>
                            <PlusIcon className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(item.discount)}</TableCell>
                      <TableCell>{formatCurrency(item.tax)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(item.subtotal)}</TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon-xs" onClick={() => removeItem(item.product_id)}>
                          <XIcon className="size-3 text-rose-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {itemTotals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-6 text-center text-sm text-muted-foreground">
                        Add products from search to create purchase.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Order Tax</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addForm.order_tax}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, order_tax: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Discount</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addForm.discount}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, discount: e.target.value }))}
                />
                <Select
                  value={addForm.discount_type}
                  onValueChange={(value) => setAddForm((prev) => ({ ...prev, discount_type: value === "percent" ? "percent" : "fixed" }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="percent">Percent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Shipping</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addForm.shipping}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, shipping: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-2">
              <div className="space-y-1 text-muted-foreground">
                <p>Order Total</p>
                <p>Order Tax</p>
                <p>Discount ({addForm.discount_type === "percent" ? `${discountInput}%` : "Fixed"})</p>
                <p>Shipping</p>
                <p className="font-medium text-foreground">Grand Total</p>
              </div>
              <div className="space-y-1 text-right">
                <p>{formatCurrency(orderTotal)}</p>
                <p>{formatCurrency(orderTaxValue)}</p>
                <p>- {formatCurrency(discountValue)}</p>
                <p>{formatCurrency(shippingValue)}</p>
                <p className="font-semibold text-foreground">{formatCurrency(grandTotal)}</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea
                className="min-h-24 w-full rounded-lg border border-input bg-transparent p-2.5 text-sm outline-none focus-visible:border-ring"
                placeholder="Please provide any details"
                value={addForm.notes}
                onChange={(e) => setAddForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddOpen(false)
                resetAddModal()
                setIsEditMode(false)
                setEditingPurchaseId(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]"
              onClick={submitPurchase}
              disabled={submitLoading}
            >
              {submitLoading ? "Saving..." : isEditMode ? "Update Purchase" : "Submit / Save Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isActionOpen} onOpenChange={setIsActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAction?.label || "Purchase Action"}</DialogTitle>
            <DialogDescription>
              {selectedPurchase
                ? `Selected transaction: ${selectedPurchase.transaction_number}`
                : "Select a purchase first."}
            </DialogDescription>
          </DialogHeader>
          <div className="px-4 pb-2 text-sm text-muted-foreground">
            This action modal scaffold is ready. Next step is implementing the full
            form/workflow for this action.
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsActionOpen(false)}>
              Close
            </Button>
            <Button type="button" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]" onClick={() => setIsActionOpen(false)}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
