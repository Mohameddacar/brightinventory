"use client"

import * as React from "react"

import { LayoutSidebar } from "@/components/layout/sidebar"
import { Sidebar } from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return <LayoutSidebar {...props} />
}
