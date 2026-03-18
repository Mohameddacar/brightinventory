"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { login } from "@/lib/api"
import { appNotify } from "@/lib/notify"
import { hasAuthSession, setAuthSession } from "@/lib/auth"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = React.useState({ login: "", password: "", rememberMe: true })
  const [showPassword, setShowPassword] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [errors, setErrors] = React.useState<{ login?: string; password?: string }>({})

  React.useEffect(() => {
    if (hasAuthSession()) {
      router.replace("/dashboard")
    }
  }, [router])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors: { login?: string; password?: string } = {}
    const loginValue = form.login.trim()
    const passwordValue = form.password.trim()

    if (!loginValue) {
      nextErrors.login = "Email or username is required"
    } else if (loginValue.includes("@") && !/^\S+@\S+\.\S+$/.test(loginValue)) {
      nextErrors.login = "Enter a valid email format"
    }

    if (!passwordValue) {
      nextErrors.password = "Password is required"
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      appNotify.failed("Login", "Please fix validation errors and try again")
      return
    }

    setLoading(true)
    try {
      const result = await login({
        login: loginValue,
        password: form.password,
      })

      setAuthSession(result.token, result.user, form.rememberMe)
      appNotify.completed("Login", `Welcome back, ${result.user.name}`)
      router.replace("/dashboard")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to login"
      appNotify.failed("Login", message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f0f1f8] p-4 md:p-6">
      <div className="mx-auto min-h-[92vh] w-full max-w-350 overflow-hidden rounded-3xl border border-[#d8ddf2] bg-white shadow-[0_24px_80px_rgba(43,72,150,0.18)] md:grid md:grid-cols-[1fr_460px]">
        <section className="relative flex min-h-90 items-center justify-center bg-[#f3f4fa] p-6 md:min-h-full md:p-10">
          <Image
            src="/loginimage.png"
            alt="Login illustration"
            width={760}
            height={760}
            className="h-auto max-h-[75vh] w-full max-w-190 object-contain"
            priority
          />
        </section>

        <section className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-95 animate-in fade-in duration-500">
            <h1 className="text-4xl font-semibold tracking-tight text-[#27314f]">Welcome Back</h1>
            <p className="mt-2 text-[15px] text-[#6f7896]">
              Sign in to your Bright MTS account and continue your daily operations.
            </p>

            <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
              <div>
                <label htmlFor="login" className="mb-1.5 block text-sm font-medium text-[#5f6887]">
                  Email or Username
                </label>
                <Input
                  id="login"
                  value={form.login}
                  onChange={(event) => setForm((prev) => ({ ...prev, login: event.target.value }))}
                  placeholder="Enter your email or username"
                  autoComplete="username"
                  className="h-12 rounded-xl border-[#ccd5f7] text-base focus-visible:ring-[#5b66ea]"
                  aria-invalid={Boolean(errors.login)}
                />
                {errors.login ? <p className="mt-1 text-xs text-rose-600">{errors.login}</p> : null}
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#5f6887]">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="h-12 rounded-xl border-[#ccd5f7] pr-11 text-base focus-visible:ring-[#5b66ea]"
                    aria-invalid={Boolean(errors.password)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-[#64749c] hover:text-[#344574]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                  </button>
                </div>
                {errors.password ? <p className="mt-1 text-xs text-rose-600">{errors.password}</p> : null}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#5f6887]">
                  <Checkbox
                    checked={form.rememberMe}
                    onCheckedChange={(checked) => setForm((prev) => ({ ...prev, rememberMe: Boolean(checked) }))}
                    aria-label="Remember me"
                  />
                  Remember me
                </label>
                <Link href="/forgot-password" className="text-sm font-medium text-[#5a64e7] hover:text-[#414de0]">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-xl bg-linear-to-r from-[#5f65ea] to-[#6c55e8] text-base font-semibold text-white shadow-lg shadow-[#5f65ea]/30 hover:from-[#4f56dc] hover:to-[#5d45da]"
                disabled={loading}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2Icon className="size-4 animate-spin" />
                    Logging in...
                  </span>
                ) : (
                  "Login"
                )}
              </Button>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}
