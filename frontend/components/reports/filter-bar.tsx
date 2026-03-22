import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { FilterDefinition, FilterState } from "@/components/reports/types"

type FilterBarProps = {
  fromDate: string
  toDate: string
  onFromDateChange: (value: string) => void
  onToDateChange: (value: string) => void
  filters: FilterDefinition[]
  values: FilterState
  onFilterChange: (key: keyof FilterState, value: string) => void
}

export function FilterBar({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  filters,
  values,
  onFilterChange,
}: FilterBarProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#0F172A]">From Date</p>
        <Input
          type="date"
          value={fromDate}
          onChange={(event) => onFromDateChange(event.target.value)}
          className="h-10 rounded-xl border-[#E2E8F0] bg-white"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#0F172A]">To Date</p>
        <Input
          type="date"
          value={toDate}
          onChange={(event) => onToDateChange(event.target.value)}
          className="h-10 rounded-xl border-[#E2E8F0] bg-white"
        />
      </div>

      {filters.map((filter) => {
        const selectedValue = values[filter.key] ?? "all"

        return (
        <div key={filter.key} className="space-y-2">
          <p className="text-sm font-semibold text-[#0F172A]">{filter.label}</p>
          <Select value={selectedValue} onValueChange={(value) => onFilterChange(filter.key, value ?? "all")}>
            <SelectTrigger className="h-10 rounded-xl border-[#E2E8F0] bg-white">
              <SelectValue placeholder={`All ${filter.label}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {filter.options.map((option) => (
                <SelectItem key={`${filter.key}-${option.value}`} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        )
      })}
    </div>
  )
}
