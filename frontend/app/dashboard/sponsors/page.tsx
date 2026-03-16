"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
import {
  createSponsor,
  deleteSponsor,
  getSponsors,
  updateSponsor,
  type SponsorApiPayload,
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
  EyeIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "lucide-react"
import type { CSSProperties } from "react"

type ApiSponsor = {
  id: number
  full_name: string
  gender: string | null
  address: string | null
  mobile_no: string | null
  email: string | null
  registered_date: string
}

type SponsorForm = {
  full_name: string
  gender: "male" | "female"
  mobile_no: string
  email: string
  address: string
  registered_date: string
}

const PAGE_SIZE = 10
const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'.-]{1,119}$/
const MOBILE_PATTERN = /^[+0-9][0-9\-\s]{6,29}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const emptyForm: SponsorForm = {
  full_name: "",
  gender: "male",
  mobile_no: "",
  email: "",
  address: "",
  registered_date: "",
}

export default function SponsorsPage() {
  const [sponsors, setSponsors] = React.useState<ApiSponsor[]>([])
  const [searchTerm, setSearchTerm] = React.useState("")
  const [page, setPage] = React.useState(1)

  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isViewOpen, setIsViewOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)

  const [selectedSponsor, setSelectedSponsor] = React.useState<ApiSponsor | null>(null)
  const [addForm, setAddForm] = React.useState<SponsorForm>(emptyForm)
  const [editForm, setEditForm] = React.useState<SponsorForm>(emptyForm)

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)

  const loadSponsors = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getSponsors<ApiSponsor[]>()
      setSponsors(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sponsors")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadSponsors()
  }, [loadSponsors])

  const filteredSponsors = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) {
      return sponsors
    }

    return sponsors.filter((item) => {
      return (
        item.full_name.toLowerCase().includes(query) ||
        (item.mobile_no || "").toLowerCase().includes(query) ||
        (item.email || "").toLowerCase().includes(query)
      )
    })
  }, [sponsors, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredSponsors.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const rows = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredSponsors.slice(start, start + PAGE_SIZE)
  }, [filteredSponsors, currentPage])

  const validateSponsorForm = React.useCallback((form: SponsorForm): string | null => {
    const fullName = form.full_name.trim()
    if (!NAME_PATTERN.test(fullName)) {
      return "Full name is required and must be 2 to 120 valid characters."
    }

    const mobile = form.mobile_no.trim()
    if (!MOBILE_PATTERN.test(mobile)) {
      return "Mobile number format is invalid."
    }

    const email = form.email.trim()
    if (email && !EMAIL_PATTERN.test(email)) {
      return "Please enter a valid email address."
    }

    if (!form.registered_date) {
      return "Registered date is required."
    }

    return null
  }, [])

  const buildPayload = (form: SponsorForm): SponsorApiPayload => {
    return {
      full_name: form.full_name.trim(),
      gender: form.gender,
      mobile_no: form.mobile_no.trim(),
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      registered_date: form.registered_date,
    }
  }

  const handleAddSponsor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationError = validateSponsorForm(addForm)
    if (validationError) {
      setFormError(validationError)
      appNotify.failed("Validation", validationError)
      return
    }

    setFormError(null)

    try {
      await createSponsor(buildPayload(addForm))
      setIsAddOpen(false)
      setAddForm(emptyForm)
      await loadSponsors()
      setPage(1)
      appNotify.created("Sponsor")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create sponsor"
      setError(message)
      appNotify.failed("Create sponsor", message)
    }
  }

  const handleEditSponsor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedSponsor) {
      return
    }

    const validationError = validateSponsorForm(editForm)
    if (validationError) {
      setFormError(validationError)
      appNotify.failed("Validation", validationError)
      return
    }

    setFormError(null)

    try {
      await updateSponsor(selectedSponsor.id, buildPayload(editForm))
      setIsEditOpen(false)
      setSelectedSponsor(null)
      await loadSponsors()
      appNotify.updated("Sponsor")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update sponsor"
      setError(message)
      appNotify.failed("Update sponsor", message)
    }
  }

  const handleDeleteSponsor = async () => {
    if (!deleteId) {
      return
    }

    try {
      await deleteSponsor(deleteId)
      setDeleteId(null)
      await loadSponsors()
      appNotify.deleted("Sponsor")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete sponsor"
      setError(message)
      appNotify.failed("Delete sponsor", message)
    }
  }

  const openViewModal = (sponsor: ApiSponsor) => {
    setSelectedSponsor(sponsor)
    setIsViewOpen(true)
  }

  const openEditModal = (sponsor: ApiSponsor) => {
    setSelectedSponsor(sponsor)
    setEditForm({
      full_name: sponsor.full_name,
      gender: sponsor.gender === "female" ? "female" : "male",
      mobile_no: sponsor.mobile_no || "",
      email: sponsor.email || "",
      address: sponsor.address || "",
      registered_date: new Date(sponsor.registered_date).toISOString().slice(0, 10),
    })
    setIsEditOpen(true)
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
                <CardTitle className="text-lg">Sponsors</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage sponsors with complete view, add, and update workflow.
                </p>
                {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
                {formError ? <p className="mt-1 text-xs text-rose-600">{formError}</p> : null}
              </div>

              <Button className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]" onClick={() => setIsAddOpen(true)}>
                <PlusIcon className="mr-1 size-4" />
                Add Sponsor
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search sponsor name, mobile, or email..."
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
                      <TableHead>Full Name</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Mobile Number</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Registered Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                          Loading sponsors...
                        </TableCell>
                      </TableRow>
                    ) : null}

                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.id}</TableCell>
                        <TableCell className="font-medium">{row.full_name}</TableCell>
                        <TableCell className="capitalize">{row.gender || "-"}</TableCell>
                        <TableCell>{row.mobile_no || "-"}</TableCell>
                        <TableCell>{row.email || "-"}</TableCell>
                        <TableCell>{row.address || "-"}</TableCell>
                        <TableCell>{new Date(row.registered_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openViewModal(row)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-[#3FA3D3]"
                              aria-label="View sponsor"
                            >
                              <EyeIcon className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(row)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-amber-600"
                              aria-label="Edit sponsor"
                            >
                              <PencilIcon className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(row.id)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-rose-600"
                              aria-label="Delete sponsor"
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
                          No sponsors found.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-start justify-between gap-2 text-sm text-muted-foreground md:flex-row md:items-center">
                <p>
                  Showing {(currentPage - 1) * PAGE_SIZE + (rows.length ? 1 : 0)}-
                  {(currentPage - 1) * PAGE_SIZE + rows.length} of {filteredSponsors.length} sponsors
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
            <DialogTitle>Add Sponsor</DialogTitle>
            <DialogDescription>Insert sponsor details and save.</DialogDescription>
          </DialogHeader>

          <form id="add-sponsor-form" className="grid gap-3 py-2" onSubmit={handleAddSponsor}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
                <Input
                  value={addForm.full_name}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Gender *</label>
                <Select
                  value={addForm.gender}
                  onValueChange={(value) => setAddForm((prev) => ({ ...prev, gender: value === "female" ? "female" : "male" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Mobile Number *</label>
                <Input
                  value={addForm.mobile_no}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, mobile_no: e.target.value }))}
                  placeholder="+1 (000) 000-0000"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Registered Date *</label>
                <Input
                  type="date"
                  value={addForm.registered_date}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, registered_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="example@email.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Address</label>
              <textarea
                className="min-h-20 w-full rounded-lg border border-input bg-transparent p-2.5 text-sm outline-none focus-visible:border-ring"
                value={addForm.address}
                onChange={(e) => setAddForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Enter address"
              />
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-sponsor-form" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]">
              Save Sponsor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Sponsor</DialogTitle>
            <DialogDescription>Edit sponsor details and save changes.</DialogDescription>
          </DialogHeader>

          <form id="edit-sponsor-form" className="grid gap-3 py-2" onSubmit={handleEditSponsor}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
                <Input
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Gender *</label>
                <Select
                  value={editForm.gender}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, gender: value === "female" ? "female" : "male" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Mobile Number *</label>
                <Input
                  value={editForm.mobile_no}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, mobile_no: e.target.value }))}
                  placeholder="+1 (000) 000-0000"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Registered Date *</label>
                <Input
                  type="date"
                  value={editForm.registered_date}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, registered_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="example@email.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Address</label>
              <textarea
                className="min-h-20 w-full rounded-lg border border-input bg-transparent p-2.5 text-sm outline-none focus-visible:border-ring"
                value={editForm.address}
                onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Enter address"
              />
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-sponsor-form" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]">
              Update Sponsor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sponsor Details</DialogTitle>
            <DialogDescription>View all sponsor information.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 text-sm">
            <div><span className="font-medium">Full Name:</span> {selectedSponsor?.full_name || "-"}</div>
            <div><span className="font-medium">Gender:</span> {selectedSponsor?.gender || "-"}</div>
            <div><span className="font-medium">Mobile Number:</span> {selectedSponsor?.mobile_no || "-"}</div>
            <div><span className="font-medium">Email:</span> {selectedSponsor?.email || "-"}</div>
            <div><span className="font-medium">Address:</span> {selectedSponsor?.address || "-"}</div>
            <div>
              <span className="font-medium">Registered Date:</span>{" "}
              {selectedSponsor ? new Date(selectedSponsor.registered_date).toLocaleDateString() : "-"}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sponsor</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected sponsor will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={handleDeleteSponsor}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}
