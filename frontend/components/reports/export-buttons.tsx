import { Button } from "@/components/ui/button"
import { Download, FileSpreadsheet, FileText, RefreshCcw } from "lucide-react"

type ExportButtonsProps = {
  onGenerate: () => void
  onExportPdf: () => void
  onExportExcel: () => void
  loading?: boolean
}

export function ExportButtons({ onGenerate, onExportPdf, onExportExcel, loading }: ExportButtonsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        onClick={onGenerate}
        disabled={loading}
        className="h-10 rounded-xl bg-[#3B82F6] text-white hover:bg-[#2563EB]"
      >
        <RefreshCcw className="mr-2 size-4" />
        {loading ? "Generating..." : "Generate Report"}
      </Button>
      <Button variant="outline" onClick={onExportPdf} className="h-10 rounded-xl border-[#E2E8F0] hover:bg-[#F8FAFC]">
        <FileText className="mr-2 size-4" />
        Export PDF
      </Button>
      <Button variant="outline" onClick={onExportExcel} className="h-10 rounded-xl border-[#E2E8F0] hover:bg-[#F8FAFC]">
        <FileSpreadsheet className="mr-2 size-4" />
        Export Excel
      </Button>
      <Button variant="ghost" onClick={onExportExcel} className="hidden">
        <Download className="size-4" />
      </Button>
    </div>
  )
}
