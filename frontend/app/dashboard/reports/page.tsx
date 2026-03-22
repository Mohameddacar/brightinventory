"use client"

import * as React from "react"
import type { CSSProperties } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
import { DynamicTable } from "@/components/reports/dynamic-table"
import { ExportButtons } from "@/components/reports/export-buttons"
import { FilterBar } from "@/components/reports/filter-bar"
import { ReportSelector } from "@/components/reports/report-selector"
import { SummaryCards } from "@/components/reports/summary-cards"
import { Card, CardContent } from "@/components/ui/card"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  exportUnifiedReport,
  getUnifiedReport,
  getUserEffectivePermissions,
  type UnifiedReportQuery,
  type UnifiedReportResponse,
} from "@/lib/api"
import type { FilterDefinition, FilterState, ReportType } from "@/components/reports/types"

const ACTIVE_USER_STORAGE_KEY = "ims_active_user_id"
const PAGE_LIMIT = 10

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function toReportQuery(params: {
  reportType: ReportType
  fromDate: string
  toDate: string
  search: string
  sortKey: string
  sortDir: "asc" | "desc"
  page: number
  filters: FilterState
}): UnifiedReportQuery {
  return {
    reportType: params.reportType,
    fromDate: params.fromDate || undefined,
    toDate: params.toDate || undefined,
    search: params.search || undefined,
    sortKey: params.sortKey || undefined,
    sortDir: params.sortDir,
    page: params.page,
    limit: PAGE_LIMIT,
    customer: params.filters.customer,
    paymentStatus: params.filters.paymentStatus,
    supplier: params.filters.supplier,
    status: params.filters.status,
    category: params.filters.category,
    expenseType: params.filters.expenseType,
    warehouse: params.filters.warehouse,
    account: params.filters.account,
    type: params.filters.type,
    period: params.filters.period,
  }
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const [allowedPermissions, setAllowedPermissions] = React.useState<Set<string> | null>(null)

  const [reportType, setReportType] = React.useState<ReportType>("sales")
  const [fromDate, setFromDate] = React.useState("")
  const [toDate, setToDate] = React.useState(todayIsoDate())
  const [filters, setFilters] = React.useState<FilterState>({})

  const [search, setSearch] = React.useState("")
  const [sortKey, setSortKey] = React.useState("")
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc")
  const [page, setPage] = React.useState(1)

  const [payload, setPayload] = React.useState<UnifiedReportResponse | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const searchDebounceRef = React.useRef<number | null>(null)

  const hasPermission = React.useCallback(
    (permissionName: string) => {
      if (!allowedPermissions) {
        return true
      }
      return allowedPermissions.has(permissionName.toLowerCase())
    },
    [allowedPermissions]
  )

  const canViewReports = hasPermission("reports.view")

  const loadPermissions = React.useCallback(async () => {
    try {
      const rawUserId = window.localStorage.getItem(ACTIVE_USER_STORAGE_KEY)
      if (!rawUserId) {
        setAllowedPermissions(null)
        return
      }

      const userId = Number(rawUserId)
      if (!Number.isFinite(userId) || userId <= 0) {
        setAllowedPermissions(null)
        return
      }

      const effective = await getUserEffectivePermissions(userId)
      setAllowedPermissions(new Set((effective.permission_names || []).map((item) => String(item).toLowerCase())))
    } catch {
      setAllowedPermissions(null)
    }
  }, [])

  React.useEffect(() => {
    loadPermissions()

    const handleAccessUpdate = () => {
      loadPermissions()
    }

    window.addEventListener("ims-access-updated", handleAccessUpdate)
    return () => window.removeEventListener("ims-access-updated", handleAccessUpdate)
  }, [loadPermissions])

  const fetchReport = React.useCallback(
    async (nextPage: number, nextSortKey?: string, nextSortDir?: "asc" | "desc") => {
      if (!canViewReports) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await getUnifiedReport(
          toReportQuery({
            reportType,
            fromDate,
            toDate,
            search,
            sortKey: nextSortKey ?? sortKey,
            sortDir: nextSortDir ?? sortDir,
            page: nextPage,
            filters,
          })
        )

        setPayload(response)
        setPage(response.pagination.page)
        setSortKey(response.applied.sortKey || "")
        setSortDir(response.applied.sortDir || "desc")
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Failed to load report")
      } finally {
        setLoading(false)
      }
    },
    [canViewReports, reportType, fromDate, toDate, search, sortKey, sortDir, filters]
  )

  React.useEffect(() => {
    setPage(1)
    setSortKey("")
    setSortDir("desc")
    setSearch("")
    setFilters({})
  }, [reportType])

  React.useEffect(() => {
    if (!canViewReports) {
      return
    }

    fetchReport(1)
  }, [canViewReports, reportType, fromDate, toDate, fetchReport])

  const dynamicFilters: FilterDefinition[] = React.useMemo(() => {
    return (payload?.availableFilters || []).map((item) => ({
      key: item.key as keyof FilterState,
      label: item.label,
      options: item.options,
    }))
  }, [payload])

  const onGenerate = () => {
    fetchReport(1)
  }

  const onSearchChange = (value: string) => {
    setSearch(value)
    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current)
    }

    searchDebounceRef.current = window.setTimeout(() => {
      fetchReport(1)
    }, 250)
  }

  React.useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current)
      }
    }
  }, [])

  const onSortChange = (key: string) => {
    if (sortKey === key) {
      const nextDirection = sortDir === "asc" ? "desc" : "asc"
      setSortDir(nextDirection)
      fetchReport(1, key, nextDirection)
      return
    }

    setSortKey(key)
    setSortDir("asc")
    fetchReport(1, key, "asc")
  }

  const onPageChange = (nextPage: number) => {
    fetchReport(nextPage)
  }

  const onFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  React.useEffect(() => {
    if (!canViewReports) {
      return
    }

    fetchReport(1)
  }, [filters, canViewReports, fetchReport])

  const handleExport = async (format: "pdf" | "xlsx") => {
    try {
      setLoading(true)
      const blob = await exportUnifiedReport(
        format,
        toReportQuery({
          reportType,
          fromDate,
          toDate,
          search,
          sortKey,
          sortDir,
          page: 1,
          filters,
        })
      )

      downloadBlob(blob, `${reportType}-report.${format}`)
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : `Failed to export ${format.toUpperCase()} report`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
          "--primary": "#3B82F6",
          "--primary-foreground": "#ffffff",
          "--ring": "#3B82F6",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col bg-[#F8FAFC] px-4 py-4 md:px-6 md:py-6">
          {!canViewReports ? (
            <Card className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
              <CardContent className="py-12 text-center text-sm text-[#64748B]">
                You do not have permission to view reports.
              </CardContent>
            </Card>
          ) : (
            <>
              <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm md:p-6">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-[#0F172A]">Dynamic Reports</h1>
                    <p className="text-sm text-[#64748B]">{payload?.title || "Report Controls"}</p>
                  </div>
                  <ExportButtons
                    onGenerate={onGenerate}
                    onExportPdf={() => handleExport("pdf")}
                    onExportExcel={() => handleExport("xlsx")}
                    loading={loading}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <ReportSelector value={reportType} onChange={setReportType} />
                </div>

                <div className="mt-4">
                  <FilterBar
                    fromDate={fromDate}
                    toDate={toDate}
                    onFromDateChange={setFromDate}
                    onToDateChange={setToDate}
                    filters={dynamicFilters}
                    values={filters}
                    onFilterChange={onFilterChange}
                  />
                </div>
              </section>

              {error ? (
                <Card className="mt-6 rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
                  <CardContent className="py-4 text-sm text-[#EF4444]">{error}</CardContent>
                </Card>
              ) : null}

              <div className="mt-6">
                <DynamicTable
                  columns={payload?.columns || []}
                  rows={payload?.rows || []}
                  searchTerm={search}
                  onSearchChange={onSearchChange}
                  sortKey={sortKey}
                  sortDirection={sortDir}
                  onSortChange={onSortChange}
                  page={payload?.pagination.page || 1}
                  totalPages={payload?.pagination.totalPages || 1}
                  totalRows={payload?.pagination.total || 0}
                  onPageChange={onPageChange}
                />
              </div>

              <div className="mt-6">
                <SummaryCards items={payload?.summary || []} />
              </div>
            </>
          )}

          <LayoutFooter />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
