"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboardIcon,
  BoxesIcon,
  Package2Icon,
  ArrowRightLeftIcon,
  WrenchIcon,
  TruckIcon,
  HandCoinsIcon,
  ShoppingCartIcon,
  ShoppingBasketIcon,
  Undo2Icon,
  RotateCcwIcon,
  UsersIcon,
  UserRoundCheckIcon,
  ReceiptTextIcon,
  BadgeDollarSignIcon,
  ReceiptIcon,
  RefreshCwIcon,
  RotateCcwSquareIcon,
  WalletIcon,
  FileStackIcon,
  CreditCardIcon,
  Building2Icon,
  LandmarkIcon,
  PiggyBankIcon,
  FileBarChart2Icon,
  ShieldCheckIcon,
  UserCogIcon,
  KeyRoundIcon,
  SettingsIcon,
  ChevronRightIcon,
  SparklesIcon,
  BoltIcon,
} from "lucide-react"
import { getUserEffectivePermissions } from "@/lib/api"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

type ModuleItem = {
  title: string
  url: string
  icon: React.ReactNode
  requiredPermission?: string
}

type ModuleSection = {
  title: string
  icon: React.ReactNode
  items: ModuleItem[]
}

const singleLinks: ModuleItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboardIcon /> },
]

const bottomLinks: ModuleItem[] = [
  { title: "Reports", url: "/dashboard/reports", icon: <FileBarChart2Icon /> },
  { title: "Settings", url: "/dashboard/settings", icon: <SettingsIcon /> },
]

const ACTIVE_USER_STORAGE_KEY = "ims_active_user_id"

const derivePermissionFromUrl = (url: string) => {
  if (url === "/dashboard") {
    return "dashboard.view"
  }

  if (!url.startsWith("/dashboard/")) {
    return null
  }

  const slug = url.replace("/dashboard/", "").split("/")[0]?.trim()
  if (!slug) {
    return null
  }

  return `${slug}.view`
}

const normalizeModuleToken = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "")

const buildPermissionCandidates = (permissionName: string) => {
  const raw = String(permissionName || "").trim().toLowerCase()
  if (!raw.includes(".")) {
    return [raw]
  }

  const [moduleName, action] = raw.split(".")
  const moduleRaw = String(moduleName || "").trim().toLowerCase()
  const tokens = new Set<string>([moduleRaw])

  tokens.add(moduleRaw.replace(/-/g, "_"))
  tokens.add(moduleRaw.replace(/_/g, "-"))
  tokens.add(moduleRaw.replace(/[\s_-]+/g, ""))

  if (moduleRaw.endsWith("s") && moduleRaw.length > 1) {
    const singular = moduleRaw.slice(0, -1)
    tokens.add(singular)
    tokens.add(singular.replace(/-/g, "_"))
    tokens.add(singular.replace(/_/g, "-"))
    tokens.add(singular.replace(/[\s_-]+/g, ""))
  }

  return Array.from(tokens).map((token) => `${token}.${action}`)
}

const moduleSections: ModuleSection[] = [
  {
    title: "Products",
    icon: <Package2Icon />,
    items: [
      { title: "Categories", url: "/dashboard/categories", icon: <BoxesIcon /> },
      { title: "Products", url: "/dashboard/products", icon: <Package2Icon /> },
    ],
  },
  {
    title: "Inventory",
    icon: <ArrowRightLeftIcon />,
    items: [
      {
        title: "Stock Movements",
        url: "/dashboard/stock-movements",
        icon: <ArrowRightLeftIcon />,
      },
      {
        title: "Stock Adjustments",
        url: "/dashboard/stock-adjustments",
        icon: <WrenchIcon />,
      },
    ],
  },
  {
    title: "Suppliers",
    icon: <TruckIcon />,
    items: [
      { title: "Suppliers", url: "/dashboard/suppliers", icon: <TruckIcon /> },
      {
        title: "Supplier Payments",
        url: "/dashboard/supplier-payments",
        icon: <HandCoinsIcon />,
      },
    ],
  },
  {
    title: "Purchases",
    icon: <ShoppingCartIcon />,
    items: [
      { title: "Purchases", url: "/dashboard/purchases", icon: <ShoppingCartIcon /> },
      {
        title: "Purchase Items",
        url: "/dashboard/purchase-items",
        icon: <ShoppingBasketIcon />,
      },
      {
        title: "Purchase Returns",
        url: "/dashboard/purchase-returns",
        icon: <Undo2Icon />,
      },
      {
        title: "Purchase Return Items",
        url: "/dashboard/purchase-return-items",
        icon: <RotateCcwIcon />,
      },
    ],
  },
  {
    title: "Customers",
    icon: <UsersIcon />,
    items: [
      { title: "Sponsors", url: "/dashboard/sponsors", icon: <UserRoundCheckIcon /> },
      { title: "Customers", url: "/dashboard/customers", icon: <UsersIcon /> },
      {
        title: "Customer Receipts",
        url: "/dashboard/customer-receipts",
        icon: <ReceiptTextIcon />,
      },
    ],
  },
  {
    title: "Sales",
    icon: <BadgeDollarSignIcon />,
    items: [
      { title: "Sales", url: "/dashboard/sales", icon: <BadgeDollarSignIcon /> },
      { title: "Sale Items", url: "/dashboard/sale-items", icon: <ReceiptIcon /> },
      {
        title: "Sales Returns",
        url: "/dashboard/sales-returns",
        icon: <RefreshCwIcon />,
      },
      {
        title: "Sales Return Items",
        url: "/dashboard/sales-return-items",
        icon: <RotateCcwSquareIcon />,
      },
    ],
  },
  {
    title: "Expenses",
    icon: <WalletIcon />,
    items: [
      {
        title: "Expense Types",
        url: "/dashboard/expense-types",
        icon: <FileStackIcon />,
      },
      {
        title: "Expense Bills",
        url: "/dashboard/expense-bills",
        icon: <ReceiptTextIcon />,
      },
      {
        title: "Expense Payments",
        url: "/dashboard/expense-payments",
        icon: <CreditCardIcon />,
      },
    ],
  },
  {
    title: "Transfer",
    icon: <ArrowRightLeftIcon />,
    items: [
      {
        title: "All Transfers",
        url: "/dashboard/transfers",
        icon: <ArrowRightLeftIcon />,
        requiredPermission: "transfers.view",
      },
    ],
  },
  {
    title: "Accounting",
    icon: <LandmarkIcon />,
    items: [
      {
        title: "Accounts",
        url: "/dashboard/accounts",
        icon: <LandmarkIcon />,
        requiredPermission: "accounts.view",
      },
      {
        title: "Payment Methods",
        url: "/dashboard/payment-methods",
        icon: <CreditCardIcon />,
        requiredPermission: "payment-methods.view",
      },
    ],
  },
  {
    title: "Company Profile",
    icon: <Building2Icon />,
    items: [
      {
        title: "Company Profile",
        url: "/dashboard/company-profile",
        icon: <Building2Icon />,
      },
      {
        title: "Transaction Closing",
        url: "/dashboard/transaction-closing",
        icon: <LandmarkIcon />,
      },
      {
        title: "Cash Deposits",
        url: "/dashboard/cash-deposits",
        icon: <PiggyBankIcon />,
      },
    ],
  },
  {
    title: "Users & Permissions",
    icon: <ShieldCheckIcon />,
    items: [
      { title: "Users", url: "/dashboard/users", icon: <UserCogIcon /> },
      { title: "Roles", url: "/dashboard/roles", icon: <ShieldCheckIcon /> },
      { title: "Permissions", url: "/dashboard/permissions", icon: <KeyRoundIcon /> },
    ],
  },
]

export function LayoutSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const [allowedPermissions, setAllowedPermissions] = React.useState<Set<string> | null>(null)
  const [activeRoleName, setActiveRoleName] = React.useState<string>("")

  const loadActiveUserPermissions = React.useCallback(async () => {
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
      const permissionSet = new Set((effective.permission_names || []).map((item) => String(item).toLowerCase()))
      setAllowedPermissions(permissionSet)
      setActiveRoleName(String(effective.user?.role_name || ""))
    } catch {
      setAllowedPermissions(null)
      setActiveRoleName("")
    }
  }, [])

  React.useEffect(() => {
    loadActiveUserPermissions()

    const handleStorage = (event: StorageEvent) => {
      if (event.key === ACTIVE_USER_STORAGE_KEY) {
        loadActiveUserPermissions()
      }
    }

    const handleAccessUpdate = () => {
      loadActiveUserPermissions()
    }

    window.addEventListener("storage", handleStorage)
    window.addEventListener("ims-access-updated", handleAccessUpdate)

    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("ims-access-updated", handleAccessUpdate)
    }
  }, [loadActiveUserPermissions])

  const hasAccess = React.useCallback(
    (item: ModuleItem) => {
      const permissionName = item.requiredPermission || derivePermissionFromUrl(item.url)
      if (!permissionName) {
        return true
      }

      if (activeRoleName.toLowerCase() === "admin") {
        return true
      }

      // No active user selected means unrestricted super-admin style browsing.
      if (!allowedPermissions) {
        return true
      }

      const candidates = buildPermissionCandidates(permissionName)
      if (candidates.some((candidate) => allowedPermissions.has(candidate))) {
        return true
      }

      const permissionModule = permissionName.split(".")[0] || ""
      const normalizedModule = normalizeModuleToken(permissionModule)

      return Array.from(allowedPermissions).some((granted) => {
        const [grantedModule, grantedAction] = String(granted).toLowerCase().split(".")
        return grantedAction === "view" && normalizeModuleToken(grantedModule) === normalizedModule
      })
    },
    [activeRoleName, allowedPermissions],
  )

  const visibleSingleLinks = React.useMemo(() => singleLinks.filter((item) => hasAccess(item)), [hasAccess])
  const visibleBottomLinks = React.useMemo(() => bottomLinks.filter((item) => hasAccess(item)), [hasAccess])
  const visibleSections = React.useMemo(
    () =>
      moduleSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => hasAccess(item)),
        }))
        .filter((section) => section.items.length > 0),
    [hasAccess],
  )

  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const section of moduleSections) {
      initial[section.title] = section.items.some((item) => pathname?.startsWith(item.url))
    }
    return initial
  })

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  return (
    <Sidebar
      collapsible="offcanvas"
      {...props}
      style={
        {
          "--sidebar": "#0f3f4f",
          "--sidebar-foreground": "#e8f7ff",
          "--sidebar-accent": "#155f75",
          "--sidebar-accent-foreground": "#ffffff",
          "--sidebar-primary": "#3FA3D3",
          "--sidebar-primary-foreground": "#053042",
          "--sidebar-border": "#1f5a6b",
          "--sidebar-ring": "#3FA3D3",
        } as React.CSSProperties
      }
    >
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-auto items-start gap-3 p-2 hover:bg-sidebar-accent/70" render={<Link href="/dashboard" />}>
              <span className="mt-0.5 rounded-md bg-sidebar-primary/20 p-1.5 text-sidebar-primary">
                <BoltIcon className="size-4" />
              </span>
              <span className="flex flex-col text-left leading-tight">
                <span className="text-sm font-semibold text-sidebar-foreground">Bright Multiservices</span>
                <span className="text-xs text-sidebar-foreground/75">&amp; Tech Solutions</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarMenu>
          {visibleSingleLinks.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={pathname === item.url}
                className="rounded-lg bg-transparent text-white/90 transition-colors duration-200 hover:bg-[#53b2df] hover:text-white data-active:bg-[#3FA3D3] data-active:text-white [&_svg]:text-white/90 data-active:[&_svg]:text-white"
                render={<Link href={item.url} />}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <SidebarMenu className="mt-2">
          {visibleSections.map((section) => {
            const hasActiveChild = section.items.some((item) => pathname?.startsWith(item.url))
            const isOpen = openSections[section.title]

            return (
              <SidebarMenuItem key={section.title}>
                <SidebarMenuButton
                  isActive={hasActiveChild}
                  onClick={() => toggleSection(section.title)}
                  tooltip={section.title}
                  className="rounded-lg bg-transparent text-white/90 transition-colors duration-200 hover:bg-[#53b2df] hover:text-white data-active:bg-[#3FA3D3] data-active:text-white [&_svg]:text-white/90 data-active:[&_svg]:text-white"
                >
                  {section.icon}
                  <span>{section.title}</span>
                  <ChevronRightIcon
                    className={`ml-auto size-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
                  />
                </SidebarMenuButton>

                {isOpen ? (
                  <SidebarMenuSub>
                    {section.items.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuSubButton
                          isActive={pathname === item.url}
                          className="rounded-lg bg-transparent text-white/90 transition-colors duration-200 hover:bg-[#53b2df] hover:text-white data-active:bg-[#3FA3D3] data-active:text-white [&_svg]:text-white/90 data-active:[&_svg]:text-white"
                          render={<Link href={item.url} />}
                        >
                          {item.icon}
                          <span>{item.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>

        <SidebarMenu className="mt-2">
          {visibleBottomLinks.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={pathname === item.url}
                className="rounded-lg bg-transparent text-white/90 transition-colors duration-200 hover:bg-[#53b2df] hover:text-white data-active:bg-[#3FA3D3] data-active:text-white [&_svg]:text-white/90 data-active:[&_svg]:text-white"
                render={<Link href={item.url} />}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <Button className="w-full bg-[#3FA3D3] text-[#053042] shadow-sm hover:bg-[#3FA3D3]/90">
          <SparklesIcon className="mr-1 size-4" />
          Quick Add
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
