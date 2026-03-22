import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ReportType } from "@/components/reports/types"

type ReportSelectorProps = {
  value: ReportType
  onChange: (value: ReportType) => void
}

const reportTypeOptions: Array<{ value: ReportType; label: string }> = [
  { value: "sales", label: "Sales" },
  { value: "purchases", label: "Purchases" },
  { value: "customers", label: "Customers" },
  { value: "suppliers", label: "Suppliers" },
  { value: "products", label: "Products" },
  { value: "expenses", label: "Expenses" },
  { value: "inventory", label: "Inventory" },
  { value: "company", label: "Company" },
  { value: "deposits", label: "Deposits" },
  { value: "transactions", label: "Transactions" },
  { value: "closing", label: "Closing" },
]

export function ReportSelector({ value, onChange }: ReportSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-[#0F172A]">Report Type</p>
      <Select value={value} onValueChange={(next) => onChange(next as ReportType)}>
        <SelectTrigger className="h-10 rounded-xl border-[#E2E8F0] bg-white">
          <SelectValue placeholder="Select report type" />
        </SelectTrigger>
        <SelectContent>
          {reportTypeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
