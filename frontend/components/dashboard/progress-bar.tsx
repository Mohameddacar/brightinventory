import type { ReactNode } from "react"

type ProgressBarProps = {
  value: number
  label: string
  icon: ReactNode
}

export function ProgressBar({ value, label, icon }: ProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-2 text-[#0F172A]">
          <span className="rounded-lg bg-[#F1F5F9] p-1.5 text-[#64748B]">{icon}</span>
          <span className="truncate font-medium">{label}</span>
        </span>
        <span className="text-xs font-semibold text-[#64748B]">{value}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-[#E2E8F0]">
        <div
          className="h-2 rounded-full bg-[#3B82F6] transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
        />
      </div>
    </div>
  )
}
