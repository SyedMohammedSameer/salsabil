import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { AtSign, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUpdateProfile, useCheckUsername } from '@/hooks/useProfile'
import { cn } from '@/lib/cn'

const schema = z.object({
  username: z
    .string()
    .min(3, 'At least 3 characters')
    .max(24, 'Max 24 characters')
    .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores'),
})

type FormData = z.infer<typeof schema>

interface UsernamePromptModalProps {
  onComplete: () => void
}

export function UsernamePromptModal({ onComplete }: UsernamePromptModalProps) {
  const [availability, setAvailability] = useState<'idle' | 'checking' | 'available' | 'taken'>(
    'idle',
  )
  const updateProfile = useUpdateProfile()
  const checkUsername = useCheckUsername()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), mode: 'onChange' })

  const username = watch('username') ?? ''

  const handleBlur = async () => {
    if (!username || username.length < 3 || errors.username) {
      setAvailability('idle')
      return
    }
    setAvailability('checking')
    const available = await checkUsername.mutateAsync(username)
    setAvailability(available ? 'available' : 'taken')
  }

  const onSubmit = async (data: FormData) => {
    if (availability === 'taken') return
    await updateProfile.mutateAsync({ username: data.username, onboarded: false })
    onComplete()
  }

  return (
    // Full-screen overlay — blocks the app until username is set
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-noor-500 to-noor-600 shadow-lg">
            <AtSign className="h-7 w-7 text-white" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Choose your username</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              This is your unique identity in Salsabil. You can&apos;t change it later.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username" error={!!errors.username || availability === 'taken'}>
              Username
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                @
              </span>
              <Input
                id="username"
                placeholder="yourname"
                className={cn(
                  'pl-7 pr-9 lowercase',
                  availability === 'available' && 'border-accent-500 focus-visible:ring-accent-500',
                  availability === 'taken' && 'border-destructive focus-visible:ring-destructive',
                )}
                autoComplete="off"
                autoCapitalize="none"
                {...register('username', { onBlur: handleBlur })}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {availability === 'checking' && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {availability === 'available' && (
                  <CheckCircle2 className="h-4 w-4 text-accent-500" />
                )}
                {availability === 'taken' && <XCircle className="h-4 w-4 text-destructive" />}
              </div>
            </div>

            {errors.username && (
              <p className="text-xs text-destructive">{errors.username.message}</p>
            )}
            {!errors.username && availability === 'available' && (
              <p className="text-xs text-accent-600 dark:text-accent-400">✓ Available</p>
            )}
            {!errors.username && availability === 'taken' && (
              <p className="text-xs text-destructive">That username is already taken</p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            3–24 characters. Lowercase letters, numbers, and underscores only.
          </p>

          <Button
            type="submit"
            className="w-full"
            disabled={
              isSubmitting ||
              !!errors.username ||
              availability === 'taken' ||
              availability === 'checking' ||
              !username
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up…
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
