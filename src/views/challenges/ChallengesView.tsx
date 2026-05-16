import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trophy, CheckCircle2, Trash2, Loader2, Flame } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/shared/SkeletonLoader'
import {
  useChallenges,
  useCreateChallenge,
  useIncrementChallenge,
  useDeleteChallenge,
} from '@/hooks/useChallenges'
import type { Challenge, ChallengeStatus } from '@/lib/database.types'
import { cn } from '@/lib/cn'

import { localDateString } from '@/lib/dates'
const STATUS_CONFIG: Record<
  ChallengeStatus,
  { label: string; variant: 'default' | 'secondary' | 'warning' | 'danger' }
> = {
  active: { label: 'Active', variant: 'default' },
  completed: { label: 'Completed', variant: 'secondary' },
  failed: { label: 'Failed', variant: 'danger' },
  paused: { label: 'Paused', variant: 'warning' },
}

const CATEGORIES = ['fitness', 'prayer', 'quran', 'mindset', 'habit', 'other']

const addSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(300).optional(),
  target_days: z.coerce.number().int().min(1).max(365),
  category: z.string().optional(),
  start_date: z.string(),
})

type AddForm = z.infer<typeof addSchema>

function today() {
  return localDateString()
}

function AddChallengeDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const create = useCreateChallenge()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddForm>({
    resolver: zodResolver(addSchema),
    defaultValues: { start_date: today(), target_days: 30 },
  })

  const category = watch('category')

  const onSubmit = async (data: AddForm) => {
    await create.mutateAsync({
      title: data.title,
      description: data.description || undefined,
      target_days: data.target_days,
      category: data.category || undefined,
      start_date: data.start_date,
    })
    reset({ start_date: today(), target_days: 30 })
    setOpen(false)
    onAdded()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New challenge
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Challenge</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="ch-title">Title</Label>
            <Input
              id="ch-title"
              placeholder="e.g. 30-day Fajr streak"
              autoFocus
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ch-desc" className="text-xs">
              Description (optional)
            </Label>
            <Input
              id="ch-desc"
              placeholder="What's this challenge about?"
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ch-days">Target days</Label>
              <Input
                id="ch-days"
                type="number"
                min={1}
                max={365}
                placeholder="30"
                {...register('target_days')}
              />
              {errors.target_days && (
                <p className="text-xs text-destructive">{errors.target_days.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category ?? ''} onValueChange={(v) => setValue('category', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick one" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ch-start">Start date</Label>
            <Input id="ch-start" type="date" max={today()} {...register('start_date')} />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              'Create Challenge'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-noor-500"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  )
}

function ChallengeCard({
  challenge,
  onIncrement,
  onDelete,
}: {
  challenge: Challenge
  onIncrement: () => void
  onDelete: () => void
}) {
  const status = STATUS_CONFIG[challenge.status]
  const isActive = challenge.status === 'active'
  const isCompleted = challenge.status === 'completed'
  const pct = Math.round((challenge.current_days / challenge.target_days) * 100)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
    >
      <Card className={cn(isCompleted && 'border-accent-500/30 bg-accent-500/5')}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-accent-500 shrink-0" />
                ) : (
                  <Flame
                    className={cn(
                      'h-4 w-4 shrink-0',
                      isActive ? 'text-noor-500' : 'text-muted-foreground/40',
                    )}
                  />
                )}
                <p className="text-sm font-semibold text-foreground truncate">{challenge.title}</p>
              </div>
              {challenge.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {challenge.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Badge variant={status.variant} className="text-[10px] h-4 px-1.5">
                {status.label}
              </Badge>
              <button
                onClick={onDelete}
                className="rounded-lg p-1 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {challenge.current_days} / {challenge.target_days} days
              </span>
              <span>{pct}%</span>
            </div>
            <ProgressBar value={challenge.current_days} max={challenge.target_days} />
          </div>

          {isActive && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs"
              onClick={onIncrement}
            >
              Mark today as done (+1 day)
            </Button>
          )}

          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              Started{' '}
              {new Date(challenge.start_date + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {challenge.category && <span className="capitalize">{challenge.category}</span>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function ChallengesView() {
  const { data: challenges, isLoading } = useChallenges()
  const increment = useIncrementChallenge()
  const deleteChallenge = useDeleteChallenge()

  const active = challenges?.filter((c) => c.status === 'active') ?? []
  const completed = challenges?.filter((c) => c.status === 'completed') ?? []
  const others = challenges?.filter((c) => c.status !== 'active' && c.status !== 'completed') ?? []

  return (
    <PageShell maxWidth="full">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Challenges</h1>
            <p className="text-sm text-muted-foreground">
              {active.length > 0
                ? `${active.length} active · ${completed.length} completed`
                : 'Start a challenge to build lasting habits'}
            </p>
          </div>
          <AddChallengeDialog onAdded={() => {}} />
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : !challenges || challenges.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Trophy className="h-14 w-14 text-muted-foreground/20 mb-3" strokeWidth={1.25} />
            <p className="text-sm font-medium text-foreground">No challenges yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create your first 30-day challenge and build momentum.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active */}
            {active.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                  Active ({active.length})
                </p>
                <AnimatePresence>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {active.map((c) => (
                      <ChallengeCard
                        key={c.id}
                        challenge={c}
                        onIncrement={() =>
                          increment.mutate({
                            id: c.id,
                            currentDays: c.current_days,
                            targetDays: c.target_days,
                          })
                        }
                        onDelete={() => deleteChallenge.mutate(c.id)}
                      />
                    ))}
                  </div>
                </AnimatePresence>
              </div>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                  Completed ({completed.length})
                </p>
                <AnimatePresence>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {completed.map((c) => (
                      <ChallengeCard
                        key={c.id}
                        challenge={c}
                        onIncrement={() => {}}
                        onDelete={() => deleteChallenge.mutate(c.id)}
                      />
                    ))}
                  </div>
                </AnimatePresence>
              </div>
            )}

            {/* Others (paused/failed) */}
            {others.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                  Other ({others.length})
                </p>
                <AnimatePresence>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {others.map((c) => (
                      <ChallengeCard
                        key={c.id}
                        challenge={c}
                        onIncrement={() => {}}
                        onDelete={() => deleteChallenge.mutate(c.id)}
                      />
                    ))}
                  </div>
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </PageShell>
  )
}
