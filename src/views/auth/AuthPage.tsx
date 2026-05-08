import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/cn'

type AuthMode = 'signin' | 'signup' | 'forgot'

const signInSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const signUpSchema = signInSchema
  .extend({
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

const forgotSchema = z.object({
  email: z.string().email('Enter a valid email'),
})

type SignInData = z.infer<typeof signInSchema>
type SignUpData = z.infer<typeof signUpSchema>
type ForgotData = z.infer<typeof forgotSchema>

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function GoogleButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-3"
      onClick={onClick}
      disabled={loading}
    >
      <GoogleIcon />
      Continue with Google
    </Button>
  )
}

function OauthDivider() {
  return (
    <div className="relative">
      <Separator />
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
        or
      </span>
    </div>
  )
}

function SignInForm({ onSwitch }: { onSwitch: (mode: AuthMode) => void }) {
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInData>({ resolver: zodResolver(signInSchema) })

  const onSubmit = async (data: SignInData) => {
    setLoading(true)
    setServerError(null)
    const { error } = await supabase.auth.signInWithPassword(data)
    if (error) {
      setServerError(error.message)
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  const handleGoogle = async () => {
    setOauthLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <GoogleButton onClick={handleGoogle} loading={oauthLoading} />
      <OauthDivider />

      <div className="space-y-1.5">
        <Label htmlFor="email" error={!!errors.email}>
          Email
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="pl-9"
            error={!!errors.email}
            {...register('email')}
          />
        </div>
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" error={!!errors.password}>
            Password
          </Label>
          <button
            type="button"
            onClick={() => onSwitch('forgot')}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••"
            className="pl-9 pr-10"
            error={!!errors.password}
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
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      {serverError && (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        No account?{' '}
        <button
          type="button"
          onClick={() => onSwitch('signup')}
          className="font-medium text-primary hover:underline"
        >
          Create one
        </button>
      </p>
    </form>
  )
}

function SignUpForm({ onSwitch }: { onSwitch: (mode: AuthMode) => void }) {
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpData>({ resolver: zodResolver(signUpSchema) })

  const onSubmit = async (data: SignUpData) => {
    setLoading(true)
    setServerError(null)
    const { error } = await supabase.auth.signUp({ email: data.email, password: data.password })
    if (error) {
      setServerError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  const handleGoogle = async () => {
    setOauthLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-500/15">
          <Mail className="h-8 w-8 text-accent-500" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Check your email</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            We sent you a confirmation link. Click it to activate your account.
          </p>
        </div>
        <Button variant="outline" className="w-full" onClick={() => onSwitch('signin')}>
          Back to sign in
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <GoogleButton onClick={handleGoogle} loading={oauthLoading} />
      <OauthDivider />

      <div className="space-y-1.5">
        <Label htmlFor="su-email" error={!!errors.email}>
          Email
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="su-email"
            type="email"
            placeholder="you@example.com"
            className="pl-9"
            error={!!errors.email}
            {...register('email')}
          />
        </div>
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="su-password" error={!!errors.password}>
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="su-password"
            type={showPass ? 'text' : 'password'}
            placeholder="Min 8 characters"
            className="pl-9 pr-10"
            error={!!errors.password}
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
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="su-confirm" error={!!errors.confirmPassword}>
          Confirm password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="su-confirm"
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••"
            className="pl-9"
            error={!!errors.confirmPassword}
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

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => onSwitch('signin')}
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </button>
      </p>
    </form>
  )
}

function ForgotForm({ onSwitch }: { onSwitch: (mode: AuthMode) => void }) {
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotData>({ resolver: zodResolver(forgotSchema) })

  const onSubmit = async (data: ForgotData) => {
    setLoading(true)
    setServerError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    if (error) {
      setServerError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-500/15">
          <Mail className="h-8 w-8 text-accent-500" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Email sent</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Check your inbox for the password reset link.
          </p>
        </div>
        <Button variant="outline" className="w-full" onClick={() => onSwitch('signin')}>
          Back to sign in
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="forgot-email" error={!!errors.email}>
          Email
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="forgot-email"
            type="email"
            placeholder="you@example.com"
            className="pl-9"
            error={!!errors.email}
            {...register('email')}
          />
        </div>
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      {serverError && (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Sending…' : 'Send reset link'}
      </Button>

      <button
        type="button"
        onClick={() => onSwitch('signin')}
        className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back to sign in
      </button>
    </form>
  )
}

const titles: Record<AuthMode, string> = {
  signin: 'Welcome back',
  signup: 'Create an account',
  forgot: 'Reset password',
}

const subtitles: Record<AuthMode, string> = {
  signin: 'Sign in to continue your journey',
  signup: 'Start your spiritual growth journey',
  forgot: "We'll help you get back in",
}

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('signin')

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background p-4">
      {/* Ambient gradient orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-noor-500/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-1/4 bottom-1/4 h-64 w-64 translate-x-1/2 translate-y-1/2 rounded-full bg-accent-500/10 blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        {/* Logo + brand */}
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

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground">{titles[mode]}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{subtitles[mode]}</p>
              </div>

              {mode === 'signin' && <SignInForm onSwitch={setMode} />}
              {mode === 'signup' && <SignUpForm onSwitch={setMode} />}
              {mode === 'forgot' && <ForgotForm onSwitch={setMode} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <p className={cn('mt-6 text-center text-xs text-muted-foreground')}>
          By continuing you agree to our{' '}
          <span className="cursor-pointer underline underline-offset-2 hover:text-foreground transition-colors">
            Terms
          </span>{' '}
          and{' '}
          <span className="cursor-pointer underline underline-offset-2 hover:text-foreground transition-colors">
            Privacy Policy
          </span>
        </p>
      </div>
    </div>
  )
}
