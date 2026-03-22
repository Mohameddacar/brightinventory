import type { SummaryMetric } from "@/components/reports/types"

type SummaryCardsProps = {
  items: SummaryMetric[]
}

const toneClassMap = {
  primary: "text-[#3B82F6]",
  success: "text-[#10B981]",
  warning: "text-[#F59E0B]",
  danger: "text-[#EF4444]",
}

export function SummaryCards({ items }: SummaryCardsProps) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article key={item.label} className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-[#64748B]">{item.label}</p>
          <p className={`mt-1 text-2xl font-bold ${toneClassMap[item.tone || "primary"]}`}>{item.value}</p>
        </article>
      ))}
    </section>
  )
}
