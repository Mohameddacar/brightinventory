const API_BASE_URL = "http://localhost:5000/api"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(options?.headers ?? {}),
      },
      ...options,
    })
  } catch {
    throw new Error("Unable to reach server. Please ensure backend is running.")
  }

  if (!response.ok) {
    let errorMessage = "Request failed"
    try {
      const raw = await response.text()
      if (raw?.trim()) {
        try {
          const parsed = JSON.parse(raw)
          errorMessage = parsed.message || raw
        } catch {
          errorMessage = raw
        }
      }
    } catch {
      // Keep fallback error message if body cannot be read.
    }
    throw new Error(errorMessage)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export type ProductApiPayload = {
  category_id: number
  product_code?: string | null
  product_name: string
  description?: string | null
  image?: string | null
  has_expire_date?: boolean
  expire_date?: string | null
  opening_quantity: number
  minimum_sale_quantity?: number
  stock_alert?: number
  purchase_cost: number
  sale_cost: number
  reorder_level: number
}

export type CategoryApiPayload = {
  name: string
  description?: string | null
}

export type SupplierApiPayload = {
  full_name: string
  address?: string | null
  mobile_no: string
  email?: string | null
  opening_balance?: number
  balance_type: "credit" | "debit" | "none"
  registered_date: string
}

export type SponsorApiPayload = {
  full_name: string
  gender?: string | null
  address?: string | null
  mobile_no: string
  email?: string | null
  registered_date: string
}

export type CustomerApiPayload = {
  full_name: string
  gender?: string | null
  address?: string | null
  mobile_no: string
  email?: string | null
  customer_type?: string | null
  sponsor_id?: number | null
  opening_balance?: number
  balance_type: "credit" | "debit"
  registered_date: string
}

export type PurchaseItemPayload = {
  product_id: number
  quantity: number
  unit_cost: number
  tax?: number
  discount?: number
}

export type PurchaseCreatePayload = {
  supplier_id: number
  warehouse_id: number
  purchase_date: string
  order_tax?: number
  discount?: number
  discount_type?: "fixed" | "percent"
  shipping?: number
  notes?: string | null
  created_by?: number | null
  purchase_code?: string | null
  items: PurchaseItemPayload[]
}

export type ProductSearchResult = {
  product_id: number
  product_name: string
  barcode: string | null
  cost_price: string | number
  current_stock: number
}

export async function getProducts<T = unknown>() {
  return request<T>("/products")
}

export async function getPurchases<T = unknown>() {
  return request<T>("/purchases")
}

export async function getPurchaseById<T = unknown>(id: number) {
  return request<T>(`/purchases/${id}`)
}

export async function getPurchaseItemsByPurchaseId<T = unknown>(id: number) {
  return request<T>(`/purchases/${id}/items`)
}

export async function createPurchase<T = unknown>(payload: PurchaseCreatePayload) {
  return request<T>("/purchases", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updatePurchase<T = unknown>(id: number, payload: PurchaseCreatePayload) {
  return request<T>(`/purchases/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function searchProducts(query: string) {
  const encoded = encodeURIComponent(query)
  return request<ProductSearchResult[]>(`/products/search?query=${encoded}`)
}

export async function getWarehouses<T = unknown>() {
  return request<T>("/warehouses")
}

export async function createProduct<T = unknown>(payload: ProductApiPayload) {
  return request<T>("/products", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function uploadProductImage(file: File) {
  const formData = new FormData()
  formData.append("image", file)

  return request<{ message: string; image: string }>("/products/upload-image", {
    method: "POST",
    body: formData,
  })
}

export async function getNextProductCode() {
  return request<{ code: string }>("/products/barcode/new")
}

export async function updateProduct<T = unknown>(id: number, payload: ProductApiPayload) {
  return request<T>(`/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteProduct<T = unknown>(id: number) {
  return request<T>(`/products/${id}`, {
    method: "DELETE",
  })
}

export async function getCategories<T = unknown>() {
  return request<T>("/categories")
}

export async function createCategory<T = unknown>(payload: CategoryApiPayload) {
  return request<T>("/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateCategory<T = unknown>(id: number, payload: CategoryApiPayload) {
  return request<T>(`/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteCategory<T = unknown>(id: number) {
  return request<T>(`/categories/${id}`, {
    method: "DELETE",
  })
}

export async function getSuppliers<T = unknown>() {
  return request<T>("/suppliers")
}

export async function createSupplier<T = unknown>(payload: SupplierApiPayload) {
  return request<T>("/suppliers", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateSupplier<T = unknown>(id: number, payload: SupplierApiPayload) {
  return request<T>(`/suppliers/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteSupplier<T = unknown>(id: number) {
  return request<T>(`/suppliers/${id}`, {
    method: "DELETE",
  })
}

export async function getSponsors<T = unknown>() {
  return request<T>("/sponsors")
}

export async function createSponsor<T = unknown>(payload: SponsorApiPayload) {
  return request<T>("/sponsors", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateSponsor<T = unknown>(id: number, payload: SponsorApiPayload) {
  return request<T>(`/sponsors/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteSponsor<T = unknown>(id: number) {
  return request<T>(`/sponsors/${id}`, {
    method: "DELETE",
  })
}

export async function getCustomers<T = unknown>() {
  return request<T>("/customers")
}

export async function createCustomer<T = unknown>(payload: CustomerApiPayload) {
  return request<T>("/customers", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateCustomer<T = unknown>(id: number, payload: CustomerApiPayload) {
  return request<T>(`/customers/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteCustomer<T = unknown>(id: number) {
  return request<T>(`/customers/${id}`, {
    method: "DELETE",
  })
}
