"use client"

import * as React from "react"
import Link from "next/link"

import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  getUsers,
  getUserPermissionMatrix,
  saveUserPermissions,
  type UserPermissionMatrixResponse,
} from "@/lib/api"
import { appNotify } from "@/lib/notify"
import { SearchIcon } from "lucide-react"
import type { CSSProperties } from "react"

type ApiUser = {
  id: number
  name: string
  email: string
}

const ACTIVE_USER_STORAGE_KEY = "ims_active_user_id"

export default function PermissionsPage() {
  const [users, setUsers] = React.useState<ApiUser[]>([])
  const [selectedUserId, setSelectedUserId] = React.useState<string>("")
  const [loadingUsers, setLoadingUsers] = React.useState(true)

  const [matrix, setMatrix] = React.useState<UserPermissionMatrixResponse | null>(null)
  const [selectedPermissionIds, setSelectedPermissionIds] = React.useState<Set<number>>(new Set())

  const [loadingMatrix, setLoadingMatrix] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const loadUsers = React.useCallback(async () => {
    setLoadingUsers(true)
    try {
      const data = await getUsers<ApiUser[]>()
      const safe = Array.isArray(data) ? data : []
      setUsers(safe)

      const savedUserId = typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_USER_STORAGE_KEY) : null
      if (savedUserId && safe.some((user) => String(user.id) === savedUserId)) {
        setSelectedUserId(savedUserId)
      } else if (safe.length > 0) {
        setSelectedUserId(String(safe[0].id))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load users"
      setError(message)
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  React.useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const applyMatrix = (data: UserPermissionMatrixResponse) => {
    setMatrix(data)

    const ids = new Set<number>()
    for (const module of data.modules) {
      for (const permission of module.permissions) {
        if (permission.selected) {
          ids.add(permission.id)
        }
      }
    }

    setSelectedPermissionIds(ids)
  }

  const handleSearch = async () => {
    if (!selectedUserId) {
      appNotify.failed("Validation", "Select a user first")
      return
    }

    const userId = Number(selectedUserId)
    if (!Number.isFinite(userId) || userId <= 0) {
      appNotify.failed("Validation", "Selected user is invalid")
      return
    }

    setLoadingMatrix(true)
    setError(null)

    try {
      const data = await getUserPermissionMatrix(userId)
      applyMatrix(data)
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, String(userId))
        window.dispatchEvent(new Event("ims-access-updated"))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load user permissions"
      setError(message)
      appNotify.failed("Load permissions", message)
    } finally {
      setLoadingMatrix(false)
    }
  }

  const togglePermission = (permissionId: number, checked: boolean) => {
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(permissionId)
      } else {
        next.delete(permissionId)
      }
      return next
    })
  }

  const toggleModulePermissions = (permissionIds: number[], checked: boolean) => {
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev)
      for (const id of permissionIds) {
        if (checked) {
          next.add(id)
        } else {
          next.delete(id)
        }
      }
      return next
    })
  }

  const handleSave = async () => {
    if (!selectedUserId) {
      appNotify.failed("Validation", "Select a user first")
      return
    }

    const userId = Number(selectedUserId)
    setSaving(true)

    try {
      await saveUserPermissions(userId, Array.from(selectedPermissionIds), true)
      const refreshed = await getUserPermissionMatrix(userId)
      applyMatrix(refreshed)
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, String(userId))
        window.dispatchEvent(new Event("ims-access-updated"))
      }
      appNotify.updated("User permissions")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save permissions"
      setError(message)
      appNotify.failed("Save permissions", message)
    } finally {
      setSaving(false)
    }
  }

  const handleResetToRoleDefaults = async () => {
    if (!selectedUserId) {
      appNotify.failed("Validation", "Select a user first")
      return
    }

    const userId = Number(selectedUserId)
    setSaving(true)

    try {
      await saveUserPermissions(userId, [], false)
      const refreshed = await getUserPermissionMatrix(userId)
      applyMatrix(refreshed)
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, String(userId))
        window.dispatchEvent(new Event("ims-access-updated"))
      }
      appNotify.updated("Role default access")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reset permissions"
      setError(message)
      appNotify.failed("Reset permissions", message)
    } finally {
      setSaving(false)
    }
  }

  const selectedUserLabel = React.useMemo(() => {
    const user = users.find((item) => String(item.id) === selectedUserId)
    if (!user) {
      return "Select User"
    }

    return `${user.name}`
  }, [users, selectedUserId])

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />

        <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-2xl">User Permissions</CardTitle>
                <Link
                  href="/dashboard/roles"
                  className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Manage Roles & Create Module Permissions
                </Link>
              </div>
              {error ? <p className="text-xs text-rose-600">{error}</p> : null}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-[#3FA3D3] p-4">
                <h3 className="mb-3 text-lg font-semibold">Select User</h3>
                <div className="grid gap-3 md:grid-cols-[1fr_280px]">
                  <Select
                    value={selectedUserId}
                    onValueChange={(value) => setSelectedUserId(value || "")}
                    disabled={loadingUsers}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select User">{selectedUserLabel}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button className="bg-[#1677e6] text-white hover:bg-[#106ad0]" onClick={handleSearch} disabled={loadingUsers || loadingMatrix}>
                    <SearchIcon className="mr-1 size-5" />
                    {loadingMatrix ? "Searching..." : "Search"}
                  </Button>
                </div>
              </div>

              {matrix ? (
                <div className="rounded-2xl border-4 border-[#1677e6] p-3 md:p-6">
                  <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xl font-semibold">Permissions</p>
                      <p className="text-sm text-muted-foreground">
                        User: <span className="font-medium text-foreground">{matrix.user.name}</span> | Role: {matrix.user.role_name} | Source: {matrix.use_custom ? "Custom User Access" : "Role Default Access"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={handleResetToRoleDefaults} disabled={saving}>
                        Use Role Defaults
                      </Button>
                      <Button className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Submit"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {matrix.modules.map((module) => {
                      const modulePermissionIds = module.permissions.map((item) => item.id)
                      const selectedInModule = module.permissions.filter((item) => selectedPermissionIds.has(item.id)).length
                      const allSelected = module.permissions.length > 0 && selectedInModule === module.permissions.length

                      return (
                        <div key={module.module} className="rounded-lg border p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <Checkbox checked={allSelected} onCheckedChange={(value) => toggleModulePermissions(modulePermissionIds, Boolean(value))} />
                            <p className="font-semibold capitalize">{module.module.replace(/-/g, " ")}</p>
                          </div>

                          <div className="space-y-2">
                            {module.permissions.map((permission) => {
                              const checked = selectedPermissionIds.has(permission.id)
                              return (
                                <label key={permission.id} className="flex items-start gap-2 text-sm">
                                  <Checkbox checked={checked} onCheckedChange={(value) => togglePermission(permission.id, Boolean(value))} />
                                  <span>{permission.label}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                  Select a user and click Search to load permission access.
                </div>
              )}
            </CardContent>
          </Card>

          <LayoutFooter />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
