import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Dumbbell, Trash2, Loader2 } from 'lucide-react'
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
import { useWorkouts, useCreateWorkout, useDeleteWorkout } from '@/hooks/useWorkouts'
import type { Workout, WorkoutType } from '@/lib/database.types'
import { cn } from '@/lib/cn'

import { localDateString } from '@/lib/dates'
const WORKOUT_TYPES: Record<WorkoutType, { label: string; emoji: string }> = {
  strength: { label: 'Strength', emoji: '💪' },
  cardio: { label: 'Cardio', emoji: '🏃' },
  flexibility: { label: 'Flexibility', emoji: '🧘' },
  sports: { label: 'Sports', emoji: '⚽' },
  walk: { label: 'Walk', emoji: '🚶' },
  other: { label: 'Other', emoji: '🏋️' },
}

const addSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  type: z
    .enum(['strength', 'cardio', 'flexibility', 'sports', 'walk', 'other'])
    .default('strength'),
  duration_mins: z.coerce.number().int().min(1).max(480),
  notes: z.string().max(300).optional(),
  date: z.string(),
})

type AddForm = z.infer<typeof addSchema>

function today() {
  return localDateString()
}

function AddWorkoutDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const createWorkout = useCreateWorkout()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddForm>({
    resolver: zodResolver(addSchema),
    defaultValues: { type: 'strength', date: today() },
  })

  const type = watch('type')

  const onSubmit = async (data: AddForm) => {
    await createWorkout.mutateAsync({
      title: data.title,
      type: data.type,
      duration_mins: data.duration_mins,
      notes: data.notes || undefined,
      date: data.date,
    })
    reset({ type: 'strength', date: today() })
    setOpen(false)
    onAdded()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Log workout
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Log Workout</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="wt-title">Title</Label>
            <Input id="wt-title" placeholder="e.g. Morning run" autoFocus {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setValue('type', v as WorkoutType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(WORKOUT_TYPES) as WorkoutType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {WORKOUT_TYPES[t].emoji} {WORKOUT_TYPES[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wt-dur">Duration (min)</Label>
              <Input
                id="wt-dur"
                type="number"
                min={1}
                max={480}
                placeholder="30"
                {...register('duration_mins')}
              />
              {errors.duration_mins && (
                <p className="text-xs text-destructive">{errors.duration_mins.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wt-date">Date</Label>
            <Input id="wt-date" type="date" max={today()} {...register('date')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wt-notes" className="text-xs">
              Notes (optional)
            </Label>
            <Input id="wt-notes" placeholder="Any details…" {...register('notes')} />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save Workout'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function WorkoutCard({ workout, onDelete }: { workout: Workout; onDelete: (id: string) => void }) {
  const cfg = WORKOUT_TYPES[workout.type]
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
    >
      <Card className="h-full">
        <CardContent className="p-4 flex flex-col gap-3 h-full">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-2xl shrink-0">{cfg.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{workout.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {cfg.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{workout.duration_mins} min</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onDelete(workout.id)}
              className={cn(
                'shrink-0 rounded-lg p-1.5 transition-colors',
                'text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10',
              )}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {workout.notes && (
            <p className="text-xs text-muted-foreground line-clamp-2">{workout.notes}</p>
          )}

          <p className="text-xs text-muted-foreground mt-auto">
            {new Date(workout.date + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function WorkoutsView() {
  const { data: workouts, isLoading } = useWorkouts()
  const deleteWorkout = useDeleteWorkout()

  const thisWeek = (() => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
    return (workouts ?? []).filter((w) => w.date >= localDateString(start))
  })()

  const totalWeekMins = thisWeek.reduce((s, w) => s + w.duration_mins, 0)

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
            <h1 className="text-xl font-bold tracking-tight text-foreground">Workouts</h1>
            <p className="text-sm text-muted-foreground">
              {thisWeek.length > 0
                ? `${thisWeek.length} session${thisWeek.length !== 1 ? 's' : ''} this week · ${totalWeekMins} min`
                : 'Track your fitness journey'}
            </p>
          </div>
          <AddWorkoutDialog onAdded={() => {}} />
        </div>

        {/* Stats row */}
        {!isLoading && workouts && workouts.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
            {[
              { label: 'This week', value: thisWeek.length, unit: 'sessions' },
              { label: 'Week mins', value: totalWeekMins, unit: 'min' },
              { label: 'Total', value: workouts.length, unit: 'logged' },
            ].map(({ label, value, unit }) => (
              <Card key={label}>
                <CardContent className="py-3 px-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                    {unit}
                  </p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Workout grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : !workouts || workouts.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Dumbbell
              className="mx-auto mb-2 h-12 w-12 text-muted-foreground/20"
              strokeWidth={1.5}
            />
            <p className="text-sm font-medium text-foreground">No workouts yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Log your first session to start tracking.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {workouts.map((w) => (
                <WorkoutCard key={w.id} workout={w} onDelete={(id) => deleteWorkout.mutate(id)} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </motion.div>
    </PageShell>
  )
}
