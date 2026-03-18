"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
import {
  createUser,
  deleteUser,
  getRoles,
  getUsers,
  updateUser,
  type UserApiPayload,
} from "@/lib/api"
import { appNotify } from "@/lib/notify"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "lucide-react"
import type { CSSProperties } from "react"

type ApiUser = {
  id: number
  name: string
  email: string
  phone: string | null
  role_id: number
  role_name: string
  status: boolean
  created_at: string
}

type ApiRole = {
  id: number
  role_name: string
}

type UserForm = {
  name: string
  email: string
  phone: string
  password: string
  role_id: string
  status: "active" | "inactive"
}

const PAGE_SIZE = 10
const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'.-]{1,98}$/
const PHONE_PATTERN = /^\+?[0-9\s-]{7,20}$/

const emptyForm: UserForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role_id: "",
  status: "active",
}

const getInitials = (value: string) => {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("")
  return initials || "U"
}

export default function UsersPage() {
  const [users, setUsers] = React.useState<ApiUser[]>([])
  const [roles, setRoles] = React.useState<ApiRole[]>([])

  const [searchTerm, setSearchTerm] = React.useState("")
  const [page, setPage] = React.useState(1)

  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  const [selectedUser, setSelectedUser] = React.useState<ApiUser | null>(null)
  const [addForm, setAddForm] = React.useState<UserForm>(emptyForm)
  const [editForm, setEditForm] = React.useState<UserForm>(emptyForm)

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)

  const loadUsers = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getUsers<ApiUser[]>()
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRoles = React.useCallback(async () => {
    try {
      const data = await getRoles<ApiRole[]>()
      const safe = Array.isArray(data) ? data : []
      setRoles(safe)

      if (safe.length > 0) {
        setAddForm((prev) => ({ ...prev, role_id: prev.role_id || String(safe[0].id) }))
      }
    } catch {
      setRoles([])
    }
  }, [])

  React.useEffect(() => {
    loadUsers()
    loadRoles()
  }, [loadUsers, loadRoles])

  const filteredUsers = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) {
      return users
    }

    return users.filter((item) => {
      return (
        item.name.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query) ||
        String(item.phone || "").toLowerCase().includes(query)
      )
    })
  }, [users, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const rows = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredUsers.slice(start, start + PAGE_SIZE)
  }, [filteredUsers, currentPage])

  const selectedAddRoleLabel = React.useMemo(() => {
    const selected = roles.find((item) => String(item.id) === addForm.role_id)
    return selected?.role_name || "Select role"
  }, [roles, addForm.role_id])

  const selectedEditRoleLabel = React.useMemo(() => {
    const selected = roles.find((item) => String(item.id) === editForm.role_id)
    return selected?.role_name || selectedUser?.role_name || "Select role"
  }, [roles, editForm.role_id, selectedUser])

  const validateForm = React.useCallback((form: UserForm, mode: "create" | "update"): string | null => {
    const name = form.name.trim()
    if (!NAME_PATTERN.test(name)) {
      return "Name is invalid."
    }

    const email = form.email.trim()
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return "Email is invalid."
    }

    const phone = form.phone.trim()
    if (phone && !PHONE_PATTERN.test(phone)) {
      return "Phone is invalid."
    }

    if (!form.role_id) {
      return "Role is required."
    }

    if (mode === "create" && form.password.length < 6) {
      return "Password must be at least 6 characters."
    }

    if (mode === "update" && form.password && form.password.length < 6) {
      return "Password must be at least 6 characters."
    }

    return null
  }, [])

  const buildPayload = (form: UserForm): UserApiPayload => ({
    name: form.name.trim(),
    email: form.email.trim(),
    password: form.password,
    role_id: Number(form.role_id),
    phone: form.phone.trim() || null,
    status: form.status === "active",
  })

  const handleAddUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationError = validateForm(addForm, "create")
    if (validationError) {
      setFormError(validationError)
      appNotify.failed("Validation", validationError)
      return
    }

    setFormError(null)

    try {
      await createUser(buildPayload(addForm))
      setIsAddOpen(false)
      setAddForm((prev) => ({ ...emptyForm, role_id: prev.role_id, status: "active" }))
      await loadUsers()
      setPage(1)
      appNotify.created("User")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create user"
      setError(message)
      appNotify.failed("Create user", message)
    }
  }

  const handleEditUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedUser) {
      return
    }

    const validationError = validateForm(editForm, "update")
    if (validationError) {
      setFormError(validationError)
      appNotify.failed("Validation", validationError)
      return
    }

    setFormError(null)

    try {
      await updateUser(selectedUser.id, buildPayload(editForm))
      setIsEditOpen(false)
      setSelectedUser(null)
      await loadUsers()
      appNotify.updated("User")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update user"
      setError(message)
      appNotify.failed("Update user", message)
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteId) {
      return
    }

    try {
      await deleteUser(deleteId)
      setDeleteId(null)
      await loadUsers()
      appNotify.deleted("User")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete user"
      setError(message)
      appNotify.failed("Delete user", message)
    }
  }

  const openEditModal = (user: ApiUser) => {
    setSelectedUser(user)
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      password: "",
      role_id: String(user.role_id),
      status: user.status ? "active" : "inactive",
    })
    setIsEditOpen(true)
  }

  const handleExport = () => {
    const headers = ["ID", "Name", "Email", "Phone", "Role", "Status", "Created Date"]
    const lines = filteredUsers.map((item) => [
      String(item.id),
      item.name,
      item.email,
      item.phone || "",
      item.role_name,
      item.status ? "ACTIVE" : "INACTIVE",
      new Date(item.created_at).toISOString().slice(0, 10),
    ])

    const csv = [headers, ...lines]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `users-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

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
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Users</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Manage system users and access roles.</p>
                {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
                {formError ? <p className="mt-1 text-xs text-rose-600">{formError}</p> : null}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleExport}>
                  <DownloadIcon className="mr-1 size-4" />
                  Export
                </Button>
                <Button className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]" onClick={() => setIsAddOpen(true)}>
                  <PlusIcon className="mr-1 size-4" />
                  Add New User
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search user name or email..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setPage(1)
                  }}
                />
              </div>

              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                          Loading users...
                        </TableCell>
                      </TableRow>
                    ) : null}

                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex size-7 items-center justify-center rounded-full bg-cyan-100 text-xs font-semibold text-cyan-700">
                              {getInitials(row.name)}
                            </span>
                            <span className="font-medium">{row.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>{row.phone || "-"}</TableCell>
                        <TableCell>{row.role_name}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              row.status ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600"
                            }`}
                          >
                            {row.status ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </TableCell>
                        <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(row)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-amber-600"
                              aria-label="Edit user"
                            >
                              <PencilIcon className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(row.id)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-rose-600"
                              aria-label="Delete user"
                            >
                              <TrashIcon className="size-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!loading && rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                          No users found.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-start justify-between gap-2 text-sm text-muted-foreground md:flex-row md:items-center">
                <p>
                  Showing {(currentPage - 1) * PAGE_SIZE + (rows.length ? 1 : 0)}-
                  {(currentPage - 1) * PAGE_SIZE + rows.length} of {filteredUsers.length} users
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    <ChevronLeftIcon className="size-4" />
                    Previous
                  </Button>
                  <span className="rounded-md border px-3 py-1 text-sm text-foreground">{currentPage}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    Next
                    <ChevronRightIcon className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <LayoutFooter />
        </div>
      </SidebarInset>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new team member account.</DialogDescription>
          </DialogHeader>

          <form id="add-user-form" className="grid gap-3 py-2" onSubmit={handleAddUser}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Name *</label>
                <Input
                  value={addForm.name}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Michael Scott"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Email *</label>
                <Input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                <Input
                  value={addForm.phone}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Password *</label>
                <Input
                  type="password"
                  value={addForm.password}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Minimum 6 characters"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Role *</label>
                <Select
                  value={addForm.role_id}
                  onValueChange={(value) => setAddForm((prev) => ({ ...prev, role_id: value || "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role">{selectedAddRoleLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.role_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status *</label>
                <Select
                  value={addForm.status}
                  onValueChange={(value) => setAddForm((prev) => ({ ...prev, status: value as "active" | "inactive" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">ACTIVE</SelectItem>
                    <SelectItem value="inactive">INACTIVE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-user-form" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]">
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update User</DialogTitle>
            <DialogDescription>Edit user details and save changes.</DialogDescription>
          </DialogHeader>

          <form id="edit-user-form" className="grid gap-3 py-2" onSubmit={handleEditUser}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Name *</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Email *</label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Password</label>
                <Input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Leave empty to keep current password"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Role *</label>
                <Select
                  value={editForm.role_id}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, role_id: value || "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role">{selectedEditRoleLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.role_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status *</label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, status: value as "active" | "inactive" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">ACTIVE</SelectItem>
                    <SelectItem value="inactive">INACTIVE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-user-form" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected user account will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-rose-600 text-white hover:bg-rose-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}
