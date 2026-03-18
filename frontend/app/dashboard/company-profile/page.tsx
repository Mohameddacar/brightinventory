"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { LayoutFooter } from "@/components/layout/footer"
import { SiteHeader } from "@/components/site-header"
import {
  createCompany,
  getCompanies,
  updateCompany,
  uploadCompanyLogo,
  type CompanyApiPayload,
} from "@/lib/api"
import { appNotify } from "@/lib/notify"
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
import { Label } from "@/components/ui/label"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Building2Icon, CalendarIcon, Clock3Icon, PencilIcon, UploadIcon } from "lucide-react"
import type { CSSProperties } from "react"

type ApiCompany = {
  id: number
  company_name: string
  address: string | null
  contact: string | null
  email: string | null
  logo: string | null
  created_at: string
  updated_at: string
}

type CompanyForm = {
  company_name: string
  address: string
  contact: string
  email: string
  logo: string
}

const COMPANY_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s&'().,-]{1,149}$/
const CONTACT_PATTERN = /^\+?[0-9\s-]{7,20}$/

const emptyForm: CompanyForm = {
  company_name: "",
  address: "",
  contact: "",
  email: "",
  logo: "",
}

const API_ORIGIN = "http://localhost:5000"

const getMediaUrl = (pathValue?: string | null) => {
  const raw = String(pathValue || "").trim()
  if (!raw) return ""
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw
  }
  return `${API_ORIGIN}${raw.startsWith("/") ? raw : `/${raw}`}`
}

export default function CompanyProfilePage() {
  const [company, setCompany] = React.useState<ApiCompany | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = React.useState(false)

  const [form, setForm] = React.useState<CompanyForm>(emptyForm)
  const [formError, setFormError] = React.useState<string | null>(null)

  const logoInputRef = React.useRef<HTMLInputElement | null>(null)

  const loadCompany = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getCompanies<ApiCompany[]>()
      const safe = Array.isArray(data) ? data : []
      const selected = safe.length > 0 ? safe[0] : null
      setCompany(selected)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load company profile")
      setCompany(null)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadCompany()
  }, [loadCompany])

  const openEditModal = () => {
    setFormError(null)
    if (company) {
      setForm({
        company_name: company.company_name || "",
        address: company.address || "",
        contact: company.contact || "",
        email: company.email || "",
        logo: company.logo || "",
      })
    } else {
      setForm(emptyForm)
    }
    setIsEditOpen(true)
  }

  const validateForm = React.useCallback((payload: CompanyForm): string | null => {
    const name = payload.company_name.trim()
    if (!COMPANY_NAME_PATTERN.test(name)) {
      return "Company name is required and must be valid."
    }

    const contact = payload.contact.trim()
    if (contact && !CONTACT_PATTERN.test(contact)) {
      return "Contact number is invalid."
    }

    const email = payload.email.trim()
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return "Email address is invalid."
    }

    return null
  }, [])

  const buildPayload = (payload: CompanyForm): CompanyApiPayload => ({
    company_name: payload.company_name.trim(),
    address: payload.address.trim() || null,
    contact: payload.contact.trim() || null,
    email: payload.email.trim() || null,
    logo: payload.logo.trim() || null,
  })

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationError = validateForm(form)
    if (validationError) {
      setFormError(validationError)
      appNotify.failed("Validation", validationError)
      return
    }

    setFormError(null)
    setIsSaving(true)

    try {
      const payload = buildPayload(form)
      if (company) {
        await updateCompany(company.id, payload)
        appNotify.updated("Company profile")
      } else {
        await createCompany(payload)
        appNotify.created("Company profile")
      }

      setIsEditOpen(false)
      await loadCompany()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save company profile"
      setFormError(message)
      appNotify.failed("Save company profile", message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setIsUploadingLogo(true)
    try {
      const uploaded = await uploadCompanyLogo(file)
      setForm((prev) => ({ ...prev, logo: uploaded.image }))
      appNotify.updated("Company logo")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload logo"
      appNotify.failed("Upload logo", message)
    } finally {
      setIsUploadingLogo(false)
      if (logoInputRef.current) {
        logoInputRef.current.value = ""
      }
    }
  }

  const displayLogo = getMediaUrl(company?.logo)
  const editLogoPreview = getMediaUrl(form.logo)

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
                <p className="text-xs text-muted-foreground">Dashboard / Company Profile</p>
                <CardTitle className="mt-1 text-2xl font-bold">Company Profile</CardTitle>
                {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
              </div>
              <Button className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]" onClick={openEditModal}>
                <PencilIcon className="mr-1 size-4" />
                Edit Profile
              </Button>
            </CardHeader>

            <CardContent>
              <div className="rounded-xl border bg-white p-5 md:p-6">
                <h3 className="text-lg font-semibold text-[#1f2937]">Basic Information</h3>
                <div className="mt-5 grid gap-6 md:grid-cols-[1fr_220px]">
                  <div className="grid gap-4">
                    <div className="grid gap-1 border-b pb-3">
                      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Company Name</p>
                      <p className="text-base font-semibold text-[#111827]">{company?.company_name || "Not set"}</p>
                    </div>

                    <div className="grid gap-1 border-b pb-3">
                      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Address</p>
                      <p className="text-base font-semibold text-[#111827]">{company?.address || "Not set"}</p>
                    </div>

                    <div className="grid gap-4 border-b pb-3 md:grid-cols-2">
                      <div className="grid gap-1">
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Contact Number</p>
                        <p className="text-base font-semibold text-[#111827]">{company?.contact || "Not set"}</p>
                      </div>
                      <div className="grid gap-1">
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Email Address</p>
                        <p className="text-base font-semibold text-[#111827]">{company?.email || "Not set"}</p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CalendarIcon className="mt-0.5 size-4" />
                        <div>
                          <p className="text-xs font-semibold tracking-wide uppercase">Created Date</p>
                          <p className="text-sm text-[#111827]">
                            {company?.created_at ? new Date(company.created_at).toLocaleDateString() : "-"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Clock3Icon className="mt-0.5 size-4" />
                        <div>
                          <p className="text-xs font-semibold tracking-wide uppercase">Last Updated</p>
                          <p className="text-sm text-[#111827]">
                            {company?.updated_at ? new Date(company.updated_at).toLocaleDateString() : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-44 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed bg-[#f8fafc]">
                      {displayLogo ? (
                        <img
                          src={displayLogo}
                          alt="Company logo"
                          className="h-full w-full object-contain p-3"
                        />
                      ) : (
                        <div className="flex flex-col items-center text-center text-muted-foreground">
                          <Building2Icon className="size-8" />
                          <p className="mt-2 text-sm">No logo uploaded</p>
                        </div>
                      )}
                    </div>
                    <p className="text-center text-xs text-muted-foreground">Official Company Branding</p>
                  </div>
                </div>
              </div>

              {loading ? <p className="mt-4 text-sm text-muted-foreground">Loading company profile...</p> : null}
            </CardContent>
          </Card>

          <LayoutFooter />
        </div>
      </SidebarInset>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{company ? "Update Company Profile" : "Create Company Profile"}</DialogTitle>
            <DialogDescription>Update company details and upload logo if needed.</DialogDescription>
          </DialogHeader>

          <form id="company-profile-form" className="grid gap-4 py-2" onSubmit={handleSave}>
            {formError ? <p className="text-xs text-rose-600">{formError}</p> : null}

            <div className="grid gap-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={form.company_name}
                onChange={(e) => setForm((prev) => ({ ...prev, company_name: e.target.value }))}
                placeholder="Enter company name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Enter address"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="contact">Contact Number</Label>
                <Input
                  id="contact"
                  value={form.contact}
                  onChange={(e) => setForm((prev) => ({ ...prev, contact: e.target.value }))}
                  placeholder="+252 61 0000000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="info@company.com"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Company Logo</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleLogoUpload}
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-white file:px-3 file:py-1.5 file:text-sm"
                />
                <Button type="button" variant="outline" disabled={isUploadingLogo} onClick={() => logoInputRef.current?.click()}>
                  <UploadIcon className="mr-1 size-4" />
                  {isUploadingLogo ? "Uploading..." : "Upload"}
                </Button>
              </div>
              {editLogoPreview ? (
                <div className="mt-2 flex h-36 w-full max-w-xs items-center justify-center overflow-hidden rounded-lg border bg-[#f8fafc]">
                  <img src={editLogoPreview} alt="Company logo preview" className="h-full w-full object-contain p-2" />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No logo selected.</p>
              )}
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" form="company-profile-form" className="bg-[#3FA3D3] text-white hover:bg-[#53b2df]" disabled={isSaving || isUploadingLogo}>
              {isSaving ? "Saving..." : company ? "Save Changes" : "Create Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
