"use client"

import * as React from "react"
import {
  AlertTriangle,
  DollarSign,
  Warehouse,
  ShoppingBag,
  TrendingUp,
  Users,
  Laptop,
  Mouse,
  Smartphone,
  Keyboard,
  CheckCircle2,
  ShoppingCart,
  Bell,
} from "lucide-react"
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts"

import { ActivityItem } from "@/components/dashboard/activity-item"
import { ChartCard } from "@/components/dashboard/chart-card"
import { DashboardCard } from "@/components/dashboard/dashboard-card"
import { ProgressBar } from "@/components/dashboard/progress-bar"
import { Table as InventoryAlertTable } from "@/components/dashboard/table"
import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
import { Card, CardContent } from "@/components/ui/card"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  getDashboardOverview,
  getUserEffectivePermissions,
  type DashboardOverviewResponse,
} from "@/lib/api"
import type { CSSProperties } from "react"

const ACTIVE_USER_STORAGE_KEY = "ims_active_user_id"

const iconMap = {
  sales_today: (
    <span className="inline-flex size-10 items-center justify-center rounded-full bg-emerald-50 text-[#10B981]">
      <DollarSign className="size-5" />
    </span>
  ),
  total_purchases: (
    <span className="inline-flex size-10 items-center justify-center rounded-full bg-amber-50 text-[#F59E0B]">
      <ShoppingBag className="size-5" />
    </span>
  ),
  inventory_value: (
    <span className="inline-flex size-10 items-center justify-center rounded-full bg-blue-50 text-[#3B82F6]">
      <Warehouse className="size-5" />
    </span>
  ),
  low_stock_items: (
    <span className="inline-flex size-10 items-center justify-center rounded-full bg-red-50 text-[#EF4444]">
      <AlertTriangle className="size-5" />
    </span>
  ),
  total_customers: (
    <span className="inline-flex size-10 items-center justify-center rounded-full bg-emerald-50 text-[#10B981]">
      <Users className="size-5" />
    </span>
  ),
  total_profit: (
    <span className="inline-flex size-10 items-center justify-center rounded-full bg-emerald-50 text-[#10B981]">
      <TrendingUp className="size-5" />
    </span>
  ),
} as const

export default function Page() {
  const [allowedPermissions, setAllowedPermissions] = React.useState<Set<string> | null>(null)
  const [dashboardData, setDashboardData] = React.useState<DashboardOverviewResponse | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const loadPermissions = async () => {
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
    }

    loadPermissions()

    const handleAccessUpdate = () => {
      loadPermissions()
    }

    window.addEventListener("ims-access-updated", handleAccessUpdate)
    return () => {
      window.removeEventListener("ims-access-updated", handleAccessUpdate)
    }
  }, [])

  const hasPermission = (permissionName: string) => {
    if (!allowedPermissions) {
      return true
    }
    return allowedPermissions.has(permissionName.toLowerCase())
  }

  const canViewDashboard = hasPermission("dashboard.view")
  const canViewAnalytics = hasPermission("analytics.view")

  React.useEffect(() => {
    if (!canViewDashboard || !canViewAnalytics) {
      return
    }

    let isMounted = true
    const loadDashboard = async () => {
      try {
        setIsLoading(true)
        setLoadError(null)
        const data = await getDashboardOverview()
        if (isMounted) {
          setDashboardData(data)
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : "Failed to load dashboard data")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadDashboard()
    return () => {
      isMounted = false
    }
  }, [canViewAnalytics, canViewDashboard])

  const weeklySales = dashboardData?.weeklySales ?? []
  const topSellingProducts = dashboardData?.topSellingProducts ?? []
  const stockDistribution = dashboardData?.stockDistribution ?? []
  const inventoryAlerts = dashboardData?.inventoryAlerts ?? []
  const recentActivity = dashboardData?.recentActivity ?? []
  const totalStockItems = dashboardData?.totalStockItems ?? 0

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
          {!canViewDashboard ? (
            <Card className="rounded-2xl border border-[#E2E8F0] bg-white shadow-md">
              <CardContent className="py-12 text-center text-sm text-[#64748B]">
                You do not have permission to view dashboard analytics.
              </CardContent>
            </Card>
          ) : null}

          {canViewDashboard && canViewAnalytics ? (
            <>
              {loadError ? (
                <Card className="mb-6 rounded-2xl border border-[#E2E8F0] bg-white shadow-md">
                  <CardContent className="py-6 text-sm text-[#EF4444]">{loadError}</CardContent>
                </Card>
              ) : null}

              <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {(dashboardData?.summaryCards ?? []).map((card) => (
                  <DashboardCard
                    key={card.title}
                    title={card.title}
                    value={card.value}
                    trend={card.trend}
                    tone={card.tone}
                    icon={iconMap[card.key as keyof typeof iconMap] ?? iconMap.sales_today}
                  />
                ))}
                {isLoading && !dashboardData
                  ? Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={`summary-skeleton-${index}`}
                        className="h-36 rounded-2xl border border-[#E2E8F0] bg-white shadow-md"
                      />
                    ))
                  : null}
              </section>

              <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
                <ChartCard title="Sales Overview" label="Last 7 Days" className="xl:col-span-6">
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklySales} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                        <XAxis
                          dataKey="day"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#64748B", fontSize: 12, fontWeight: 600 }}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(59, 130, 246, 0.08)" }}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #E2E8F0",
                            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                          }}
                        />
                        <Bar dataKey="sales" fill="#3B82F6" radius={[8, 8, 0, 0]} maxBarSize={38} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                <ChartCard title="Top Selling Products" className="xl:col-span-3">
                  <div className="space-y-5">
                    {topSellingProducts.map((product) => (
                      <ProgressBar
                        key={product.name}
                        value={product.percent}
                        label={product.name}
                        icon={
                          product.name.toLowerCase().includes("book") ? (
                            <Laptop className="size-4" />
                          ) : product.name.toLowerCase().includes("mouse") ? (
                            <Mouse className="size-4" />
                          ) : product.name.toLowerCase().includes("phone") ||
                            product.name.toLowerCase().includes("samsung") ? (
                            <Smartphone className="size-4" />
                          ) : (
                            <Keyboard className="size-4" />
                          )
                        }
                      />
                    ))}
                  </div>
                </ChartCard>

                <ChartCard title="Stock Distribution" className="xl:col-span-3">
                  <div className="relative mx-auto h-56 w-full max-w-65">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stockDistribution}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={62}
                          outerRadius={86}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {stockDistribution.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #E2E8F0",
                            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <p className="text-3xl font-bold text-[#0F172A]">{totalStockItems.toLocaleString()}</p>
                      <p className="text-xs font-medium text-[#64748B]">Total Items</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    {stockDistribution.map((item) => (
                      <div key={item.name} className="flex items-center gap-2 text-[#64748B]">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                        <span>{item.name}</span>
                      </div>
                    ))}
                  </div>
                </ChartCard>
              </section>

              <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
                <ChartCard
                  title="Inventory Alerts"
                  rightSlot={
                    <button type="button" className="text-xs font-semibold text-[#3B82F6] hover:underline">
                      View All
                    </button>
                  }
                  className="xl:col-span-8"
                >
                  <InventoryAlertTable rows={inventoryAlerts} />
                </ChartCard>

                <ChartCard title="Recent Activity" className="xl:col-span-4">
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <ActivityItem
                        key={activity.text}
                        icon={
                          activity.type === "success" ? (
                            <CheckCircle2 className="size-4 text-[#10B981]" />
                          ) : activity.text.toLowerCase().includes("purchase") ? (
                            <ShoppingCart className="size-4 text-[#3B82F6]" />
                          ) : (
                            <Bell className="size-4 text-[#3B82F6]" />
                          )
                        }
                        text={activity.text}
                        time={new Date(activity.time).toLocaleString()}
                      />
                    ))}
                  </div>
                </ChartCard>
              </section>
            </>
          ) : null}

          <LayoutFooter />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
