export type ReportType =
  | "sales"
  | "purchases"
  | "customers"
  | "suppliers"
  | "products"
  | "expenses"
  | "inventory"
  | "company"
  | "deposits"
  | "transactions"
  | "closing"

export type FilterKey =
  | "customer"
  | "paymentStatus"
  | "supplier"
  | "status"
  | "category"
  | "expenseType"
  | "warehouse"
  | "account"
  | "type"
  | "period"

export type FilterOption = {
  label: string
  value: string
}

export type FilterState = Partial<Record<FilterKey, string>>

export type ReportColumn = {
  key: string
  label: string
  type?: "text" | "currency" | "date" | "number" | "status"
}

export type SummaryMetric = {
  label: string
  value: string
  tone?: "primary" | "success" | "warning" | "danger"
}

export type DynamicReportPayload = {
  columns: ReportColumn[]
  rows: Array<Record<string, string | number>>
  summary: SummaryMetric[]
}

export type FilterDefinition = {
  key: FilterKey
  label: string
  options: FilterOption[]
}
