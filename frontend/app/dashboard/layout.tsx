"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { hasAuthSession } from "@/lib/auth"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    if (!hasAuthSession()) {
      router.replace("/")
      return
    }

    setReady(true)
  }, [router, pathname])

  if (!ready) {
    return <div className="min-h-screen bg-[#eef4ff]" />
  }

  return <>{children}</>
}
