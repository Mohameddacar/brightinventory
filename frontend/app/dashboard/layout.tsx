"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { hasAuthSession } from "@/lib/auth"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = React.useState(false)
  const [isChecked, setIsChecked] = React.useState(false)

  React.useEffect(() => {
    if (!hasAuthSession()) {
      router.replace("/")
      setIsChecked(true)
      return
    }

    setIsAuthorized(true)
    setIsChecked(true)
  }, [router])

  if (!isChecked || !isAuthorized) {
    return null
  }

  return <>{children}</>
}
