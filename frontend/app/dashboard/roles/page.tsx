"use client"

import * as React from "react"

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
  createModulePermissions,
  getRolePermissionMatrix,
  getRoles,
  saveRolePermissions,
  type RolePermissionMatrixResponse,
} from "@/lib/api"
import { appNotify } from "@/lib/notify"
import type { CSSProperties } from "react"

type ApiRole = {
  id: number
  role_name: string
  description?: string | null
}

const ACTION_OPTIONS = ["view", "create", "update", "delete"] as const

export default function RolesPage() {
  const [roles, setRoles] = React.useState<ApiRole[]>([])
  const [selectedRoleId, setSelectedRoleId] = React.useState("")
  const [loadingRoles, setLoadingRoles] = React.useState(true)

  const [matrix, setMatrix] = React.useState<RolePermissionMatrixResponse | null>(null)
  const [selectedPermissionIds, setSelectedPermissionIds] = React.useState<Set<number>>(new Set())
  const [loadingMatrix, setLoadingMatrix] = React.useState(false)

  const [moduleName, setModuleName] = React.useState("")
  const [moduleActions, setModuleActions] = React.useState<Set<string>>(new Set(ACTION_OPTIONS))
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const loadRoles = React.useCallback(async () => {
    setLoadingRoles(true)
    try {
      const data = await getRoles<ApiRole[]>()
      const safe = Array.isArray(data) ? data : []
      setRoles(safe)
      if (safe.length > 0) {
        setSelectedRoleId((prev) => prev || String(safe[0].id))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load roles"
      setError(message)
    } finally {
      setLoadingRoles(false)
    }
  }, [])

  React.useEffect(() => {
    loadRoles()
  }, [loadRoles])

  const applyRoleMatrix = (data: RolePermissionMatrixResponse) => {
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

  const loadRoleMatrix = React.useCallback(async () => {
    if (!selectedRoleId) {
      return
    }

    setLoadingMatrix(true)
    try {
      const data = await getRolePermissionMatrix(Number(selectedRoleId))
      applyRoleMatrix(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load role permissions"
      setError(message)
      appNotify.failed("Load role permissions", message)
      setMatrix(null)
      setSelectedPermissionIds(new Set())
    } finally {
      setLoadingMatrix(false)
    }
  }, [selectedRoleId])

  React.useEffect(() => {
    loadRoleMatrix()
  }, [loadRoleMatrix])

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

  const handleSaveRolePermissions = async () => {
    if (!selectedRoleId || !matrix) {
      return
    }

    if (String(matrix.role.role_name).toLowerCase() === "admin") {
      appNotify.failed("Role locked", "Admin role always has all permissions")
      return
    }

    setSaving(true)
    try {
      await saveRolePermissions(Number(selectedRoleId), Array.from(selectedPermissionIds))
      await loadRoleMatrix()
      appNotify.updated("Role permissions")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save role permissions"
      setError(message)
      appNotify.failed("Save role permissions", message)
    } finally {
      setSaving(false)
    }
  }

  const toggleAction = (action: string, checked: boolean) => {
    setModuleActions((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(action)
      } else {
        next.delete(action)
      }
      return next
    })
  }

  const handleCreateModulePermissions = async () => {
    const moduleKey = moduleName.trim()
    const actions = Array.from(moduleActions)

    if (!moduleKey) {
      appNotify.failed("Validation", "Module name is required")
      return
    }

    if (actions.length === 0) {
      appNotify.failed("Validation", "Select at least one action")
      return
    }

    setSaving(true)
    try {
      await createModulePermissions(moduleKey, actions)
      setModuleName("")
      await loadRoleMatrix()
      appNotify.created("Module permissions")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create module permissions"
      setError(message)
      appNotify.failed("Create module permissions", message)
    } finally {
      setSaving(false)
    }
  }

  const selectedRoleLabel = React.useMemo(() => {
    const role = roles.find((item) => String(item.id) === selectedRoleId)
    return role?.role_name || "Select role"
  }, [roles, selectedRoleId])

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
              <CardTitle className="text-2xl">Roles & Permission Catalog</CardTitle>
              {error ? <p className="text-xs text-rose-600">{error}</p> : null}
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <h3 className="mb-3 text-lg font-semibold">Create Permissions For New Sidebar Module</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Module key</label>
                      <Input
                        value={moduleName}
                        onChange={(event) => setModuleName(event.target.value)}
                        placeholder="e.g. stock-transfers"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">Use a stable key matching your module slug.</p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">Actions</label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {ACTION_OPTIONS.map((action) => {
                          const checked = moduleActions.has(action)
                          return (
                            <label key={action} className="flex items-center gap-2 text-sm">
                              <Checkbox checked={checked} onCheckedChange={(value) => toggleAction(action, Boolean(value))} />
                              <span className="capitalize">{action}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>

                    <Button onClick={handleCreateModulePermissions} disabled={saving} className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]">
                      Add Module Permissions
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="mb-3 text-lg font-semibold">Assign Permissions To Role</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Role</label>
                      <Select
                        value={selectedRoleId}
                        onValueChange={(value) => setSelectedRoleId(value || "")}
                        disabled={loadingRoles}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role">{selectedRoleLabel}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={String(role.id)}>
                              {role.role_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                      Admin role is protected and always has full access. For other roles, choose exactly what should be visible in sidebar and modules.
                    </div>
                  </div>
                </div>
              </div>

              {matrix ? (
                <div className="rounded-2xl border-4 border-[#1677e6] p-3 md:p-6">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <p className="text-lg font-semibold">
                      Role: {matrix.role.role_name}
                    </p>
                    <Button
                      onClick={handleSaveRolePermissions}
                      disabled={saving || loadingMatrix || String(matrix.role.role_name).toLowerCase() === "admin"}
                      className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]"
                    >
                      {saving ? "Saving..." : "Save Role Access"}
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {matrix.modules.map((module) => {
                      const modulePermissionIds = module.permissions.map((item) => item.id)
                      const selectedInModule = module.permissions.filter((item) => selectedPermissionIds.has(item.id)).length
                      const allSelected = module.permissions.length > 0 && selectedInModule === module.permissions.length

                      return (
                        <div key={module.module} className="rounded-lg border p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={(value) => toggleModulePermissions(modulePermissionIds, Boolean(value))}
                              disabled={String(matrix.role.role_name).toLowerCase() === "admin"}
                            />
                            <p className="font-semibold capitalize">{module.module.replace(/-/g, " ")}</p>
                          </div>

                          <div className="space-y-2">
                            {module.permissions.map((permission) => {
                              const checked = selectedPermissionIds.has(permission.id)
                              return (
                                <label key={permission.id} className="flex items-start gap-2 text-sm">
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(value) => togglePermission(permission.id, Boolean(value))}
                                    disabled={String(matrix.role.role_name).toLowerCase() === "admin"}
                                  />
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
                  Select role to load permissions.
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
