"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
import { getUserEffectivePermissions } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertTriangleIcon,
  ArrowUpRightIcon,
  BoxesIcon,
  CircleDollarSignIcon,
  PackageSearchIcon,
  ShoppingBagIcon,
  TrendingUpIcon,
  UserPlusIcon,
  BoxIcon,
  ActivityIcon,
  ShoppingCartIcon,
} from "lucide-react"
import type { CSSProperties } from "react"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis } from "recharts"

const ACTIVE_USER_STORAGE_KEY = "ims_active_user_id"

const analyticsCards = [
  {
    title: "Sales Today",
    value: "$1,245",
    trend: "+12%",
    trendTone: "text-emerald-600",
    icon: <CircleDollarSignIcon className="size-4 text-[#3FA3D3]" />,
  },
  {
    title: "Total Purchases",
    value: "840",
    trend: "+5%",
    trendTone: "text-emerald-600",
    icon: <ShoppingBagIcon className="size-4 text-[#3FA3D3]" />,
  },
  {
    title: "Inventory Value",
    value: "$45.2k",
    trend: "+8%",
    trendTone: "text-emerald-600",
    icon: <BoxesIcon className="size-4 text-[#3FA3D3]" />,
  },
  {
    title: "Low Stock Items",
    value: "12",
    trend: "+2",
    trendTone: "text-rose-600",
    icon: <AlertTriangleIcon className="size-4 text-rose-500" />,
  },
  {
    title: "Total Customers",
    value: "1,240",
    trend: "+0.8%",
    trendTone: "text-emerald-600",
    icon: <UserPlusIcon className="size-4 text-[#3FA3D3]" />,
  },
  {
    title: "Total Profit",
    value: "$3,820",
    trend: "+15%",
    trendTone: "text-emerald-600",
    icon: <TrendingUpIcon className="size-4 text-[#3FA3D3]" />,
  },
]

const weeklySales = [
  { day: "Mon", sales: 210 },
  { day: "Tue", sales: 320 },
  { day: "Wed", sales: 260 },
  { day: "Thu", sales: 380 },
  { day: "Fri", sales: 310 },
  { day: "Sat", sales: 450 },
  { day: "Sun", sales: 500 },
]

const salesChartConfig = {
  sales: {
    label: "Sales",
    color: "#3FA3D3",
  },
} satisfies ChartConfig

const topSellingProducts = [
  { name: "MacBook Pro", percent: 85 },
  { name: "Logitech MX Master", percent: 65 },
  { name: "Samsung Monitor", percent: 42 },
  { name: "Keychron Keyboard", percent: 28 },
]

const stockDistribution = [
  { name: "Tech", value: 4680, fill: "#3FA3D3" },
  { name: "Gadgets", value: 3120, fill: "#1f7ea8" },
  { name: "Accessories", value: 2780, fill: "#55b8e5" },
  { name: "Others", value: 2000, fill: "#9bdcf6" },
]

const totalStockItems = 12580

const inventoryAlerts = [
  {
    productName: "Wireless Earbuds Pro",
    sku: "AUD-0012-W",
    warehouse: "Main Hub",
    currentStock: "5 / 20",
    status: "LOW STOCK",
  },
  {
    productName: "USB-C Fast Charger",
    sku: "ACC-0045-C",
    warehouse: "Warehouse B",
    currentStock: "8 / 30",
    status: "LOW STOCK",
  },
  {
    productName: "Smart Watch Band",
    sku: "SWT-0213-B",
    warehouse: "Main Hub",
    currentStock: "4 / 25",
    status: "LOW STOCK",
  },
]

const recentActivity = [
  {
    icon: <BoxIcon className="size-4 text-emerald-600" />,
    text: "John Doe added 50 units of Smart Watches",
    time: "2 mins ago",
  },
  {
    icon: <ShoppingCartIcon className="size-4 text-[#3FA3D3]" />,
    text: "New purchase order #PO-2849 received from Dell Tech",
    time: "1 hour ago",
  },
  {
    icon: <ActivityIcon className="size-4 text-amber-600" />,
    text: "Updated product stock for Logitech Mouse",
    time: "3 hours ago",
  },
]

export default function Page() {
  const [allowedPermissions, setAllowedPermissions] = React.useState<Set<string> | null>(null)

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

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
          "--primary": "#3FA3D3",
          "--primary-foreground": "#053042",
          "--ring": "#3FA3D3",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col px-4 py-4 md:gap-6 md:px-6 md:py-6">
          {!canViewDashboard ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                You do not have permission to view dashboard analytics.
              </CardContent>
            </Card>
          ) : null}

          {canViewDashboard && canViewAnalytics ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {analyticsCards.map((card) => (
              <Card key={card.title} className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center justify-between text-xs">
                    <span>{card.title}</span>
                    {card.icon}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tracking-tight">{card.value}</p>
                  <p className={`mt-1 flex items-center text-xs font-medium ${card.trendTone}`}>
                    <ArrowUpRightIcon className="mr-1 size-3.5" />
                    {card.trend}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          ) : null}

          {canViewDashboard ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-7">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Sales Overview</CardTitle>
                <Select defaultValue="7-days">
                  <SelectTrigger className="h-8 min-w-32 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7-days">Last 7 Days</SelectItem>
                    <SelectItem value="30-days">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <ChartContainer config={salesChartConfig} className="h-65 w-full">
                  <BarChart data={weeklySales}>
                    <CartesianGrid vertical={false} strokeDasharray="4 4" />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
                    <Bar dataKey="sales" fill="var(--color-sales)" radius={6} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-base">Top Selling Products</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {topSellingProducts.map((item) => (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2">
                        <PackageSearchIcon className="size-4 text-muted-foreground" />
                        <span className="truncate">{item.name}</span>
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">{item.percent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-[#3FA3D3]"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Stock Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative mx-auto h-52.5 w-52.5">
                  <PieChart width={210} height={210}>
                    <Pie
                      data={stockDistribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={86}
                      strokeWidth={2}
                    >
                      {stockDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <p className="text-2xl font-semibold">{totalStockItems.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total Items</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          ) : null}

          {canViewDashboard ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-8">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Inventory Alerts</CardTitle>
                <a href="#" className="text-xs font-medium text-[#3FA3D3] hover:underline">
                  View All
                </a>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryAlerts.map((row) => (
                      <TableRow key={row.sku}>
                        <TableCell className="font-medium">{row.productName}</TableCell>
                        <TableCell>{row.sku}</TableCell>
                        <TableCell>{row.warehouse}</TableCell>
                        <TableCell>{row.currentStock}</TableCell>
                        <TableCell>
                          <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.text} className="flex items-start gap-3 rounded-lg border p-3">
                    <span className="mt-0.5 rounded-full bg-muted p-1.5">{activity.icon}</span>
                    <div>
                      <p className="text-sm leading-snug">{activity.text}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          ) : null}

          <LayoutFooter />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
