const API_BASE_URL = "http://localhost:5000/api"
const AUTH_TOKEN_STORAGE_KEY = "ims_auth_token"

const getAuthToken = () => {
  if (typeof window === "undefined") {
    return null
  }

  const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  if (token && token.trim()) {
    return token.trim()
  }

  const sessionToken = window.sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  return sessionToken && sessionToken.trim() ? sessionToken.trim() : null
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData
  const token = getAuthToken()

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
        const trimmed = raw.trim()
        if (trimmed.startsWith("<!DOCTYPE html") || trimmed.startsWith("<html")) {
          errorMessage = `Server returned an HTML error (${response.status}). Restart backend and try again.`
          throw new Error(errorMessage)
        }
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

async function requestBlob(path: string, options?: RequestInit): Promise<Blob> {
  const token = getAuthToken()

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      // Keep fallback error message.
    }
    throw new Error(errorMessage)
  }

  return response.blob()
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

export type ExpenseTypeApiPayload = {
  type_name: string
  created_at: string
}

export type ExpenseBillApiPayload = {
  expense_type_id: number
  invoice_date: string
  receiver_name: string
  amount: number
  remarks?: string | null
}

export type ExpensePaymentApiPayload = {
  expense_bill_id: number
  payment_mode: "Cash" | "Bank Transfer" | "Card" | "Mobile Banking" | "Cheque"
  cash: number
  amount: number
  payment_date: string
  remarks?: string | null
}

export type CashDepositApiPayload = {
  amount: number
  deposit_date: string
  remarks?: string | null
}

export type TransactionClosingApiPayload = {
  closing_date: string
  total_sales: number
  total_expense: number
  cash_balance: number
  created_by: number
}

export type AccountApiPayload = {
  account_name: string
  account_number: string
  opening_balance: number
  currency: "USD" | "SOS"
  remarks?: string | null
}

export type AccountUpdateApiPayload = {
  account_name: string
  remarks?: string | null
}

export type PaymentMethodApiPayload = {
  type: string
}

export type TransferApiPayload = {
  transfer_date: string
  reference_no: string
  from_warehouse_id: number
  to_warehouse_id: number
  total_products: number
  grand_total: number
  remarks?: string | null
}

export type WarehouseOption = {
  id: number
  warehouse_name: string
  location?: string | null
}

export type PaginatedApiResponse<T> = {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type CompanyApiPayload = {
  company_name: string
  address?: string | null
  contact?: string | null
  email?: string | null
  logo?: string | null
}

export type PermissionCatalogItem = {
  id: number
  permission_name: string
  label: string
  selected?: boolean
  source?: "role" | "user" | "none"
}

export type PermissionCatalogModule = {
  module: string
  permissions: PermissionCatalogItem[]
}

export type UserPermissionMatrixResponse = {
  user: {
    id: number
    name: string
    role_id: number
    role_name: string
  }
  use_custom: boolean
  modules: PermissionCatalogModule[]
}

export type RolePermissionMatrixResponse = {
  role: {
    id: number
    role_name: string
    description?: string | null
  }
  modules: PermissionCatalogModule[]
}

export type UserEffectivePermissionResponse = {
  user: {
    id: number
    name: string
    role_id: number
    role_name: string
  }
  use_custom: boolean
  permission_ids: number[]
  permission_names: string[]
}

export type DashboardSummaryCard = {
  key: string
  title: string
  value: string
  trend: string
  tone: "success" | "warning" | "danger" | "info"
}

export type DashboardWeeklySale = {
  day: string
  sales: number
}

export type DashboardTopSellingProduct = {
  name: string
  quantity: number
  percent: number
}

export type DashboardStockDistribution = {
  name: string
  value: number
  fill: string
}

export type DashboardInventoryAlert = {
  productName: string
  sku: string
  warehouse: string
  currentStock: string
  status: string
}

export type DashboardRecentActivity = {
  text: string
  time: string
  type: "success" | "info"
}

export type DashboardOverviewResponse = {
  summaryCards: DashboardSummaryCard[]
  weeklySales: DashboardWeeklySale[]
  topSellingProducts: DashboardTopSellingProduct[]
  stockDistribution: DashboardStockDistribution[]
  totalStockItems: number
  inventoryAlerts: DashboardInventoryAlert[]
  recentActivity: DashboardRecentActivity[]
}

export type UnifiedReportColumn = {
  key: string
  label: string
  type?: "text" | "currency" | "date" | "number" | "status"
}

export type UnifiedReportSummary = {
  label: string
  value: string
  tone?: "primary" | "success" | "warning" | "danger"
}

export type UnifiedReportFilterOption = {
  value: string
  label: string
}

export type UnifiedReportFilterDefinition = {
  key: string
  label: string
  options: UnifiedReportFilterOption[]
}

export type UnifiedReportResponse = {
  reportType: string
  title: string
  columns: UnifiedReportColumn[]
  rows: Array<Record<string, string | number>>
  summary: UnifiedReportSummary[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  availableFilters: UnifiedReportFilterDefinition[]
  applied: {
    fromDate: string
    toDate: string
    search: string
    sortKey: string
    sortDir: "asc" | "desc"
    filters: Record<string, string>
  }
}

export type UnifiedReportQuery = {
  reportType: string
  fromDate?: string
  toDate?: string
  search?: string
  sortKey?: string
  sortDir?: "asc" | "desc"
  page?: number
  limit?: number
  customer?: string
  paymentStatus?: string
  supplier?: string
  status?: string
  category?: string
  expenseType?: string
  warehouse?: string
  account?: string
  type?: string
  period?: string
}

export type UserApiPayload = {
  name: string
  email: string
  password?: string
  role_id: number
  phone?: string | null
  status: boolean
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

export type SaleItemPayload = {
  product_id: number
  quantity: number
  unit_price: number
  tax?: number
  discount?: number
}

export type SaleCreatePayload = {
  customer_id: number
  warehouse_id: number
  invoice_date: string
  order_tax?: number
  discount?: number
  discount_type?: "fixed" | "percent"
  shipping?: number
  notes?: string | null
  paid?: number
  payment_mode?: string
  invoice_no?: string | null
  items: SaleItemPayload[]
}

export type SalePaymentPayload = {
  payment_date: string
  amount: number
  payment_mode: string
  account_name?: string | null
  remarks?: string | null
}

export type PurchasePaymentPayload = {
  payment_date: string
  amount: number
  payment_mode: string
  account_name?: string | null
  remarks?: string | null
}

export type SendEmailPayload = {
  to: string
  subject: string
  html?: string
  text?: string
}

export type SendSmsPayload = {
  to: string
  message: string
}

export type AuthLoginPayload = {
  login: string
  password: string
}

export type ForgotPasswordPayload = {
  email: string
}

export type AuthUser = {
  id: number
  name: string
  email: string
  role_id: number
  role_name: string
  permissions: string[]
}

export type AuthLoginResponse = {
  token: string
  user: AuthUser
}

export type ProductSearchResult = {
  product_id: number
  product_name: string
  barcode: string | null
  cost_price: string | number
  selling_price?: string | number
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

export async function createPurchasePayment<T = unknown>(id: number, payload: PurchasePaymentPayload) {
  return request<T>(`/purchases/${id}/payments`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function getPurchasePayments<T = unknown>(id: number) {
  return request<T>(`/purchases/${id}/payments`)
}

export async function sendEmail<T = unknown>(payload: SendEmailPayload) {
  return request<T>("/communications/email", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function sendSms<T = unknown>(payload: SendSmsPayload) {
  return request<T>("/communications/sms", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function login(payload: AuthLoginPayload) {
  return request<AuthLoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function getMySession() {
  return request<{ user: AuthUser }>("/auth/me")
}

export async function requestPasswordReset(payload: ForgotPasswordPayload) {
  return request<{ message: string }>("/auth/forgot-password", {
    method: "POST",
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

export async function getSales<T = unknown>() {
  return request<T>("/sales")
}

export async function getSaleById<T = unknown>(id: number) {
  return request<T>(`/sales/${id}`)
}

export async function getSaleItemsBySaleId<T = unknown>(id: number) {
  return request<T>(`/sales/${id}/items`)
}

export async function createSale<T = unknown>(payload: SaleCreatePayload) {
  return request<T>("/sales", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateSale<T = unknown>(id: number, payload: SaleCreatePayload) {
  return request<T>(`/sales/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteSale<T = unknown>(id: number) {
  return request<T>(`/sales/${id}`, {
    method: "DELETE",
  })
}

export async function createSalePayment<T = unknown>(id: number, payload: SalePaymentPayload) {
  return request<T>(`/sales/${id}/payments`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function getSalePayments<T = unknown>(id: number) {
  return request<T>(`/sales/${id}/payments`)
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

export async function getExpenseTypes<T = unknown>() {
  return request<T>("/expense-types")
}

export async function createExpenseType<T = unknown>(payload: ExpenseTypeApiPayload) {
  return request<T>("/expense-types", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateExpenseType<T = unknown>(id: number, payload: ExpenseTypeApiPayload) {
  return request<T>(`/expense-types/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteExpenseType<T = unknown>(id: number) {
  return request<T>(`/expense-types/${id}`, {
    method: "DELETE",
  })
}

export async function getExpenses<T = unknown>() {
  return request<T>("/expenses")
}

export async function createExpense<T = unknown>(payload: ExpenseBillApiPayload) {
  return request<T>("/expenses", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateExpense<T = unknown>(id: number, payload: ExpenseBillApiPayload) {
  return request<T>(`/expenses/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteExpense<T = unknown>(id: number) {
  return request<T>(`/expenses/${id}`, {
    method: "DELETE",
  })
}

export async function getExpensePayments<T = unknown>() {
  return request<T>("/expense-payments")
}

export async function createExpensePayment<T = unknown>(payload: ExpensePaymentApiPayload) {
  return request<T>("/expense-payments", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateExpensePayment<T = unknown>(id: number, payload: ExpensePaymentApiPayload) {
  return request<T>(`/expense-payments/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteExpensePayment<T = unknown>(id: number) {
  return request<T>(`/expense-payments/${id}`, {
    method: "DELETE",
  })
}

export async function getCashDeposits<T = unknown>() {
  return request<T>("/cash-deposits")
}

export async function createCashDeposit<T = unknown>(payload: CashDepositApiPayload) {
  return request<T>("/cash-deposits", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateCashDeposit<T = unknown>(id: number, payload: CashDepositApiPayload) {
  return request<T>(`/cash-deposits/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteCashDeposit<T = unknown>(id: number) {
  return request<T>(`/cash-deposits/${id}`, {
    method: "DELETE",
  })
}

export async function getTransactionClosings<T = unknown>() {
  return request<T>("/transaction-closings")
}

export async function createTransactionClosing<T = unknown>(payload: TransactionClosingApiPayload) {
  return request<T>("/transaction-closings", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateTransactionClosing<T = unknown>(id: number, payload: TransactionClosingApiPayload) {
  return request<T>(`/transaction-closings/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteTransactionClosing<T = unknown>(id: number) {
  return request<T>(`/transaction-closings/${id}`, {
    method: "DELETE",
  })
}

export async function getAccounts<T = unknown>(params?: { search?: string; page?: number; limit?: number }) {
  const searchParams = new URLSearchParams()

  if (params?.search?.trim()) {
    searchParams.set("search", params.search.trim())
  }

  if (Number.isFinite(params?.page)) {
    searchParams.set("page", String(params?.page))
  }

  if (Number.isFinite(params?.limit)) {
    searchParams.set("limit", String(params?.limit))
  }

  const query = searchParams.toString()
  return request<T>(`/accounts${query ? `?${query}` : ""}`)
}

export async function createAccount<T = unknown>(payload: AccountApiPayload) {
  return request<T>("/accounts", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateAccount<T = unknown>(id: number, payload: AccountUpdateApiPayload) {
  return request<T>(`/accounts/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteAccount<T = unknown>(id: number) {
  return request<T>(`/accounts/${id}`, {
    method: "DELETE",
  })
}

export async function getPaymentMethods<T = unknown>(params?: { search?: string; page?: number; limit?: number }) {
  const searchParams = new URLSearchParams()

  if (params?.search?.trim()) {
    searchParams.set("search", params.search.trim())
  }

  if (Number.isFinite(params?.page)) {
    searchParams.set("page", String(params?.page))
  }

  if (Number.isFinite(params?.limit)) {
    searchParams.set("limit", String(params?.limit))
  }

  const query = searchParams.toString()
  return request<T>(`/payment-methods${query ? `?${query}` : ""}`)
}

export async function createPaymentMethod<T = unknown>(payload: PaymentMethodApiPayload) {
  return request<T>("/payment-methods", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updatePaymentMethod<T = unknown>(id: number, payload: PaymentMethodApiPayload) {
  return request<T>(`/payment-methods/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deletePaymentMethod<T = unknown>(id: number) {
  return request<T>(`/payment-methods/${id}`, {
    method: "DELETE",
  })
}

export async function getTransfers<T = unknown>(params?: { search?: string; page?: number; limit?: number }) {
  const searchParams = new URLSearchParams()

  if (params?.search?.trim()) {
    searchParams.set("search", params.search.trim())
  }

  if (Number.isFinite(params?.page)) {
    searchParams.set("page", String(params?.page))
  }

  if (Number.isFinite(params?.limit)) {
    searchParams.set("limit", String(params?.limit))
  }

  const query = searchParams.toString()
  return request<T>(`/transfers${query ? `?${query}` : ""}`)
}

export async function getTransferWarehouses<T = WarehouseOption[]>() {
  return request<T>("/transfers/warehouses")
}

export async function createTransfer<T = unknown>(payload: TransferApiPayload) {
  return request<T>("/transfers", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function deleteTransfer<T = unknown>(id: number) {
  return request<T>(`/transfers/${id}`, {
    method: "DELETE",
  })
}

export async function getCompanies<T = unknown>() {
  return request<T>("/companies")
}

export async function getCompanyById<T = unknown>(id: number) {
  return request<T>(`/companies/${id}`)
}

export async function createCompany<T = unknown>(payload: CompanyApiPayload) {
  return request<T>("/companies", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateCompany<T = unknown>(id: number, payload: CompanyApiPayload) {
  return request<T>(`/companies/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function uploadCompanyLogo(file: File) {
  const formData = new FormData()
  formData.append("image", file)

  return request<{ message: string; image: string; image_url: string }>("/companies/upload-logo", {
    method: "POST",
    body: formData,
  })
}

export async function getUsers<T = unknown>() {
  return request<T>("/users")
}

export async function createUser<T = unknown>(payload: UserApiPayload) {
  return request<T>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateUser<T = unknown>(id: number, payload: UserApiPayload) {
  return request<T>(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteUser<T = unknown>(id: number) {
  return request<T>(`/users/${id}`, {
    method: "DELETE",
  })
}

export async function getRoles<T = unknown>() {
  return request<T>("/roles")
}

export async function getPermissionCatalog() {
  return request<{ modules: PermissionCatalogModule[] }>("/access-control/catalog")
}

export async function getUserPermissionMatrix(userId: number) {
  return request<UserPermissionMatrixResponse>(`/access-control/users/${userId}/permissions`)
}

export async function saveUserPermissions(userId: number, permissionIds: number[], useCustom = true) {
  return request<{ message: string }>(`/access-control/users/${userId}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permission_ids: permissionIds, use_custom: useCustom }),
  })
}

export async function getUserEffectivePermissions(userId: number) {
  return request<UserEffectivePermissionResponse>(`/access-control/users/${userId}/effective-permissions`)
}

export async function getRolePermissionMatrix(roleId: number) {
  return request<RolePermissionMatrixResponse>(`/access-control/roles/${roleId}/permissions`)
}

export async function saveRolePermissions(roleId: number, permissionIds: number[]) {
  return request<{ message: string }>(`/access-control/roles/${roleId}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permission_ids: permissionIds }),
  })
}

export async function createModulePermissions(module: string, actions: string[]) {
  return request<{ message: string }>("/access-control/catalog/modules", {
    method: "POST",
    body: JSON.stringify({ module, actions }),
  })
}

export async function getDashboardOverview() {
  return request<DashboardOverviewResponse>("/dashboard/overview")
}

const buildReportQueryString = (params: UnifiedReportQuery) => {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return
    }

    const stringValue = String(value).trim()
    if (!stringValue) {
      return
    }

    searchParams.set(key, stringValue)
  })

  return searchParams.toString()
}

export async function getUnifiedReport(params: UnifiedReportQuery) {
  const query = buildReportQueryString(params)
  return request<UnifiedReportResponse>(`/reports${query ? `?${query}` : ""}`)
}

export async function exportUnifiedReport(format: "pdf" | "xlsx", params: UnifiedReportQuery) {
  const query = buildReportQueryString(params)
  return requestBlob(`/reports/export/${format}${query ? `?${query}` : ""}`)
}
