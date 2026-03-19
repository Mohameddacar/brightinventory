import type { ReactNode } from "react"

type ActivityItemProps = {
  icon: ReactNode
  text: string
  time: string
}

export function ActivityItem({ icon, text, time }: ActivityItemProps) {
  return (
    <article className="flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 transition-all duration-200 hover:bg-white">
      <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-5 text-[#0F172A]">{text}</p>
        <p className="mt-1 text-xs text-[#64748B]">{time}</p>
      </div>
    </article>
  )
}
