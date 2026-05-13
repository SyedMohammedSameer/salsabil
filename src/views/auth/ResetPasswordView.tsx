import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

export default function ResetPasswordView() {
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [recoveryReady, setRecoveryReady] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    let cancelled = false

    // Supabase parses the recovery tokens from the URL hash on load and fires
    // PASSWORD_RECOVERY. If the user reloads the page, the session is already
    // present, so also check getSession() as a fallback.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setRecoveryReady(true)
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session) {
        setRecoveryReady(true)
      } else {
        // Give Supabase a brief moment to process the hash before declaring failure
        setTimeout(() => {
          if (cancelled) return
          supabase.auth.getSession().then(({ data: d2 }) => {
            if (cancelled) return
            if (!d2.session) {
              setLinkError(
                'This password reset link is invalid or has expired. Please request a new one.',
              )
            }
          })
        }, 1500)
      }
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setServerError(null)
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) {
      setServerError(error.message)
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
    // Sign the user out so they re-authenticate with the new password
    await supabase.auth.signOut()
    setTimeout(() => navigate('/auth', { replace: true }), 2000)
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-noor-500/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-1/4 bottom-1/4 h-64 w-64 translate-x-1/2 translate-y-1/2 rounded-full bg-accent-500/10 blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-noor-500 to-noor-600 shadow-lg">
            <img
              src="/salsabil-icon-32.png"
              alt="Salsabil"
              className="h-8 w-8"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Salsabil</h1>
            <p className="text-xs text-muted-foreground">Productivity & spiritual growth</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">Set a new password</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Choose a strong password to secure your account
            </p>
          </div>

          {success ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-500/15">
                <CheckCircle2 className="h-8 w-8 text-accent-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Password updated</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Redirecting you to sign in…
                </p>
              </div>
            </div>
          ) : linkError ? (
            <div className="space-y-4">
              <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {linkError}
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/auth', { replace: true })}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password" error={!!errors.password}>
                  New password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Min 8 characters"
                    className="pl-9 pr-10"
                    error={!!errors.password}
                    disabled={!recoveryReady}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" error={!!errors.confirmPassword}>
                  Confirm password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-9"
                    error={!!errors.confirmPassword}
                    disabled={!recoveryReady}
                    {...register('confirmPassword')}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              {serverError && (
                <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {serverError}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading || !recoveryReady}>
                {loading
                  ? 'Updating…'
                  : recoveryReady
                    ? 'Update password'
                    : 'Verifying link…'}
              </Button>

              <button
                type="button"
                onClick={() => navigate('/auth', { replace: true })}
                className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
