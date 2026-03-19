import type { ReactNode } from "react"

type DashboardCardTone = "success" | "warning" | "danger" | "info"

type DashboardCardProps = {
  title: string
  value: string
  trend: string
  icon: ReactNode
  tone?: DashboardCardTone
}

const toneMap: Record<DashboardCardTone, { badge: string }> = {
  success: { badge: "bg-emerald-50 text-[#10B981]" },
  warning: { badge: "bg-amber-50 text-[#F59E0B]" },
  danger: { badge: "bg-red-50 text-[#EF4444]" },
  info: { badge: "bg-blue-50 text-[#3B82F6]" },
}

export function DashboardCard({ title, value, trend, icon, tone = "info" }: DashboardCardProps) {
  return (
    <button
      type="button"
      className="w-full rounded-2xl border border-[#E2E8F0] bg-white p-4 text-left shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      aria-label={title}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        {icon}
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${toneMap[tone].badge}`}>
          {trend}
        </span>
      </div>
      <p className="text-sm font-medium text-[#64748B]">{title}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-[#0F172A]">{value}</p>
    </button>
  )
}
