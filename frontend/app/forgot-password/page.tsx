"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { requestPasswordReset } from "@/lib/api"
import { appNotify } from "@/lib/notify"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2Icon } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    const value = email.trim()
    if (!value || !/^\S+@\S+\.\S+$/.test(value)) {
      setError("Please enter a valid email address")
      return
    }

    setLoading(true)
    try {
      await requestPasswordReset({ email: value })
      setMessage("Password reset link sent")
      appNotify.info("Forgot Password", "Password reset link sent")
      setEmail("")
    } catch (err) {
      const details = err instanceof Error ? err.message : "Failed to send reset link"
      setError(details)
      appNotify.failed("Forgot Password", details)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f0f1f8] p-4 md:p-6">
      <div className="mx-auto min-h-[92vh] w-full max-w-350 overflow-hidden rounded-3xl border border-[#d8ddf2] bg-white shadow-[0_24px_80px_rgba(43,72,150,0.18)] md:grid md:grid-cols-[1fr_460px]">
        <section className="relative flex min-h-90 items-center justify-center bg-[#f3f4fa] p-6 md:min-h-full md:p-10">
          <Image
            src="/forgetpass.png"
            alt="Forgot password illustration"
            width={760}
            height={760}
            className="h-auto max-h-[75vh] w-full max-w-190 object-contain"
            priority
          />
        </section>

        <section className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-95 animate-in fade-in duration-500">
            <h1 className="text-4xl font-semibold tracking-tight text-[#27314f]">Forgot Password</h1>
            <p className="mt-2 text-[15px] text-[#6f7896]">
              Enter your email and we will send instructions to reset your password.
            </p>

            <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#5f6887]">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  className="h-12 rounded-xl border-[#ccd5f7] text-base focus-visible:ring-[#5b66ea]"
                  aria-invalid={Boolean(error)}
                />
                {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-xl bg-linear-to-r from-[#5f65ea] to-[#6c55e8] text-base font-semibold text-white shadow-lg shadow-[#5f65ea]/30 hover:from-[#4f56dc] hover:to-[#5d45da]"
                disabled={loading}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2Icon className="size-4 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  "Send reset link"
                )}
              </Button>

              {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

              <Link href="/" className="block text-center text-sm font-medium text-[#5a64e7] hover:text-[#414de0]">
                Back to Login
              </Link>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}
