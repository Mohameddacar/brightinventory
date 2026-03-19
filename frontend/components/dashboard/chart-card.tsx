import type { ReactNode } from "react"

type ChartCardProps = {
  title: string
  label?: string
  rightSlot?: ReactNode
  children: ReactNode
  className?: string
}

export function ChartCard({ title, label, rightSlot, children, className = "" }: ChartCardProps) {
  return (
    <section
      className={`rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-md transition-all duration-200 hover:shadow-lg ${className}`}
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">{title}</h2>
          {label ? <p className="text-xs text-[#64748B]">{label}</p> : null}
        </div>
        {rightSlot}
      </div>
      {children}
    </section>
  )
}
