"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { BellIcon, PlusIcon, SearchIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { clearAuthSession, getStoredUserProfile } from "@/lib/auth"

export function LayoutHeader() {
  const router = useRouter()
  const [profileName, setProfileName] = React.useState("User")
  const [profileRole, setProfileRole] = React.useState("Staff")

  React.useEffect(() => {
    const loadProfile = () => {
      const user = getStoredUserProfile()
      if (user) {
        setProfileName(user.name || "User")
        setProfileRole(user.role_name || "Staff")
      }
    }

    loadProfile()
    window.addEventListener("ims-access-updated", loadProfile)
    return () => {
      window.removeEventListener("ims-access-updated", loadProfile)
    }
  }, [])

  const logout = () => {
    clearAuthSession()
    router.replace("/")
  }

  return (
    <header className="sticky top-0 z-20 flex h-(--header-height) shrink-0 items-center border-b bg-background/95 shadow-sm backdrop-blur">
      <div className="flex w-full items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <SidebarTrigger className="-ml-1" />
          <div className="relative w-full max-w-md">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search inventory, orders, products..."
              className="h-10 rounded-xl bg-muted/40 pl-9 shadow-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-xl">
            <BellIcon className="size-5" />
            <span className="sr-only">Notifications</span>
          </Button>

          <Button className="rounded-xl bg-[#3FA3D3] text-[#053042] shadow-sm hover:bg-[#3FA3D3]/90">
            <PlusIcon className="mr-1 size-4" />
            Quick Add
          </Button>

          <Button variant="outline" className="rounded-xl" onClick={logout}>
            Logout
          </Button>

          <div className="flex items-center gap-2 rounded-xl border px-2 py-1.5 shadow-sm">
            <Avatar className="size-8">
              <AvatarImage src="/magic.jpg" alt={profileName} />
              <AvatarFallback>{profileName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium">{profileName}</p>
              <p className="text-xs text-muted-foreground">{profileRole}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
