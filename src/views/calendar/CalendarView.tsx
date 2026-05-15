import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, Circle, Flag } from 'lucide-react'
import { Drawer } from 'vaul'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageShell } from '@/components/shared/PageShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/shared/SkeletonLoader'
import {
  useAllTasks,
  useTasksForDate,
  useCreateTask,
  useCompleteTask,
  useDeleteTask,
} from '@/hooks/useTasks'
import type { Task, TaskPriority } from '@/lib/database.types'
import { cn } from '@/lib/cn'

import { localDateString } from '@/lib/dates'
// ─── Types ───────────────────────────────────────────────────────────────────

type ViewMode = 'month' | 'week' | 'day'

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: 'bg-muted-foreground/30',
  medium: 'bg-warn-400',
  high: 'bg-destructive',
  urgent: 'bg-destructive',
}

const PRIORITY_BADGE: Record<TaskPriority, 'secondary' | 'warning' | 'danger'> = {
  low: 'secondary',
  medium: 'warning',
  high: 'danger',
  urgent: 'danger',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(d: Date) {
  return localDateString(d)
}

function todayStr() {
  return fmt(new Date())
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function startOfWeek(d: Date) {
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day // start Mon
  const r = new Date(d)
  r.setDate(r.getDate() + diff)
  return r
}

function getMonthGrid(month: Date): Date[] {
  const first = startOfMonth(month)
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  // Pad to start on Monday
  const padStart = first.getDay() === 0 ? 6 : first.getDay() - 1
  const padEnd = last.getDay() === 0 ? 0 : 7 - last.getDay()
  const cells: Date[] = []
  for (let i = padStart; i > 0; i--) cells.push(addDays(first, -i))
  for (let d = new Date(first); d <= last; d = addDays(d, 1)) cells.push(new Date(d))
  for (let i = 1; i <= padEnd; i++) cells.push(addDays(last, i))
  return cells
}

function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

// ─── Add Task Form ────────────────────────────────────────────────────────────

const addSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  due_time: z.string().optional(),
})
type AddForm = z.infer<typeof addSchema>

function AddTaskInline({ date, onDone }: { date: string; onDone: () => void }) {
  const createTask = useCreateTask()
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AddForm>({ resolver: zodResolver(addSchema), defaultValues: { priority: 'medium' } })

  const priority = watch('priority')

  const onSubmit = async (data: AddForm) => {
    await createTask.mutateAsync({
      title: data.title,
      priority: data.priority,
      due_date: date,
      due_time: data.due_time || undefined,
    })
    reset()
    onDone()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-4 border-t border-border">
      <div className="space-y-1.5">
        <Input placeholder="Task title" autoFocus {...register('title')} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>
      <div className="flex gap-2">
        <Select value={priority} onValueChange={(v) => setValue('priority', v as TaskPriority)}>
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <Input type="time" className="flex-1" {...register('due_time')} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="flex-1" disabled={createTask.isPending}>
          Add
        </Button>
        <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

// ─── Day Sheet (Vaul) ─────────────────────────────────────────────────────────

function DaySheet({
  date,
  open,
  onClose,
}: {
  date: string | null
  open: boolean
  onClose: () => void
}) {
  const [addingTask, setAddingTask] = useState(false)
  const { data: tasks, isLoading } = useTasksForDate(date ?? '')
  const completeTask = useCompleteTask()
  const deleteTask = useDeleteTask()

  const displayDate = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : ''

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()} shouldScaleBackground>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl bg-background border-t border-border max-h-[85vh]">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/20" />

          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div>
              <Drawer.Title className="text-base font-semibold text-foreground">
                {displayDate}
              </Drawer.Title>
              <p className="text-xs text-muted-foreground">
                {tasks?.length ?? 0} task{tasks?.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setAddingTask(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Add task
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {isLoading ? (
              <div className="space-y-2 mt-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            ) : tasks && tasks.length > 0 ? (
              <div className="space-y-2 mt-2">
                {tasks.map((task) => (
                  <TaskSheetRow
                    key={task.id}
                    task={task}
                    onComplete={(id, c) => completeTask.mutate({ id, completed: c })}
                    onDelete={(id) => deleteTask.mutate(id)}
                  />
                ))}
              </div>
            ) : !addingTask ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No tasks for this day</p>
              </div>
            ) : null}

            {addingTask && date && (
              <AddTaskInline date={date} onDone={() => setAddingTask(false)} />
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

function TaskSheetRow({
  task,
  onComplete,
  onDelete,
}: {
  task: Task
  onComplete: (id: string, c: boolean) => void
  onDelete: (id: string) => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border px-3 py-2.5',
        task.completed && 'opacity-50',
      )}
    >
      <button onClick={() => onComplete(task.id, !task.completed)}>
        {task.completed ? (
          <CheckCircle2 className="h-5 w-5 text-accent-500" strokeWidth={1.75} />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground/40" strokeWidth={1.75} />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium truncate',
            task.completed && 'line-through text-muted-foreground',
          )}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_COLOR[task.priority])} />
          {task.due_time && (
            <span className="text-[10px] text-muted-foreground">{task.due_time.slice(0, 5)}</span>
          )}
        </div>
      </div>
      <button
        onClick={() => onDelete(task.id)}
        className="text-muted-foreground/40 hover:text-destructive transition-colors p-1"
      >
        ×
      </button>
    </div>
  )
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({
  anchor,
  tasks,
  onDaySelect,
}: {
  anchor: Date
  tasks: Task[]
  onDaySelect: (d: string) => void
}) {
  const cells = useMemo(() => getMonthGrid(anchor), [anchor])
  const today = todayStr()
  const month = anchor.getMonth()

  const taskMap = useMemo(() => {
    const m = new Map<string, Task[]>()
    for (const t of tasks) {
      if (!t.due_date) continue
      const arr = m.get(t.due_date) ?? []
      arr.push(t)
      m.set(t.due_date, arr)
    }
    return m
  }, [tasks])

  const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
        {cells.map((cell) => {
          const dateStr = fmt(cell)
          const isCurrentMonth = cell.getMonth() === month
          const isToday = dateStr === today
          const dayTasks = taskMap.get(dateStr) ?? []
          const dots = dayTasks.slice(0, 3)
          const overflow = dayTasks.length - 3

          return (
            <button
              key={dateStr}
              onClick={() => onDaySelect(dateStr)}
              className={cn(
                'bg-background flex flex-col items-center py-2 px-1 min-h-[64px] hover:bg-muted/50 transition-colors',
                !isCurrentMonth && 'opacity-35',
              )}
            >
              <span
                className={cn(
                  'text-xs font-medium h-6 w-6 flex items-center justify-center rounded-full',
                  isToday && 'bg-primary text-primary-foreground font-semibold',
                  !isToday && 'text-foreground',
                )}
              >
                {cell.getDate()}
              </span>
              {dots.length > 0 && (
                <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                  {dots.map((t) => (
                    <span
                      key={t.id}
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        t.completed ? 'bg-muted-foreground/30' : PRIORITY_COLOR[t.priority],
                      )}
                    />
                  ))}
                </div>
              )}
              {overflow > 0 && (
                <span className="text-[9px] text-muted-foreground mt-0.5">+{overflow}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({
  anchor,
  tasks,
  onDaySelect,
}: {
  anchor: Date
  tasks: Task[]
  onDaySelect: (d: string) => void
}) {
  const days = useMemo(() => getWeekDays(anchor), [anchor])
  const today = todayStr()

  const taskMap = useMemo(() => {
    const m = new Map<string, Task[]>()
    for (const t of tasks) {
      if (!t.due_date) continue
      const arr = m.get(t.due_date) ?? []
      arr.push(t)
      m.set(t.due_date, arr)
    }
    return m
  }, [tasks])

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((day) => {
        const dateStr = fmt(day)
        const isToday = dateStr === today
        const dayTasks = taskMap.get(dateStr) ?? []

        return (
          <button
            key={dateStr}
            onClick={() => onDaySelect(dateStr)}
            className="flex flex-col gap-1 rounded-xl border border-border p-2 min-h-[120px] hover:bg-muted/30 transition-colors text-left"
          >
            <div className="flex flex-col items-center mb-1">
              <span className="text-[10px] text-muted-foreground">
                {day.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}
              </span>
              <span
                className={cn(
                  'text-sm font-semibold h-6 w-6 flex items-center justify-center rounded-full',
                  isToday && 'bg-primary text-primary-foreground',
                )}
              >
                {day.getDate()}
              </span>
            </div>
            {dayTasks.slice(0, 4).map((t) => (
              <div
                key={t.id}
                className={cn(
                  'w-full rounded px-1 py-0.5 text-[10px] leading-tight truncate',
                  t.completed
                    ? 'bg-muted text-muted-foreground line-through'
                    : t.priority === 'high' || t.priority === 'urgent'
                      ? 'bg-destructive/10 text-destructive'
                      : t.priority === 'medium'
                        ? 'bg-warn-500/10 text-warn-600 dark:text-warn-400'
                        : 'bg-muted/60 text-muted-foreground',
                )}
              >
                {t.title}
              </div>
            ))}
            {dayTasks.length > 4 && (
              <span className="text-[9px] text-muted-foreground">+{dayTasks.length - 4} more</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({
  anchor,
  tasks,
  onAddTask,
}: {
  anchor: Date
  tasks: Task[]
  onAddTask: (date: string) => void
}) {
  const dateStr = fmt(anchor)
  const completeTask = useCompleteTask()
  const deleteTask = useDeleteTask()

  const dayTasks = tasks.filter((t) => t.due_date === dateStr)
  const timed = dayTasks
    .filter((t) => t.due_time)
    .sort((a, b) => ((a.due_time ?? '') < (b.due_time ?? '') ? -1 : 1))
  const allDay = dayTasks.filter((t) => !t.due_time)

  return (
    <div className="space-y-4">
      {/* All-day tasks */}
      {allDay.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 px-1">All day</p>
          <div className="space-y-2">
            {allDay.map((task) => (
              <div
                key={task.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border border-border px-3 py-2.5',
                  task.completed && 'opacity-50',
                )}
              >
                <button
                  onClick={() => completeTask.mutate({ id: task.id, completed: !task.completed })}
                >
                  {task.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-accent-500" strokeWidth={1.75} />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40" strokeWidth={1.75} />
                  )}
                </button>
                <span
                  className={cn(
                    'flex-1 text-sm font-medium',
                    task.completed && 'line-through text-muted-foreground',
                  )}
                >
                  {task.title}
                </span>
                <Badge variant={PRIORITY_BADGE[task.priority]} className="text-[10px] h-4 px-1.5">
                  <Flag className="h-2.5 w-2.5 mr-0.5" />
                  {task.priority}
                </Badge>
                <button
                  onClick={() => deleteTask.mutate(task.id)}
                  className="text-muted-foreground/40 hover:text-destructive transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timed tasks */}
      {timed.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Scheduled</p>
          <div className="space-y-2">
            {timed.map((task) => (
              <div
                key={task.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border border-border px-3 py-2.5',
                  task.completed && 'opacity-50',
                )}
              >
                <span className="text-xs font-mono text-muted-foreground w-10 shrink-0">
                  {task.due_time?.slice(0, 5)}
                </span>
                <button
                  onClick={() => completeTask.mutate({ id: task.id, completed: !task.completed })}
                >
                  {task.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-accent-500" strokeWidth={1.75} />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/40" strokeWidth={1.75} />
                  )}
                </button>
                <span
                  className={cn(
                    'flex-1 text-sm font-medium',
                    task.completed && 'line-through text-muted-foreground',
                  )}
                >
                  {task.title}
                </span>
                <button
                  onClick={() => deleteTask.mutate(task.id)}
                  className="text-muted-foreground/40 hover:text-destructive transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {dayTasks.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">No tasks for this day</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-1.5"
            onClick={() => onAddTask(dateStr)}
          >
            <Plus className="h-3.5 w-3.5" /> Add task
          </Button>
        </div>
      )}

      {dayTasks.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={() => onAddTask(dateStr)}
        >
          <Plus className="h-3.5 w-3.5" /> Add task for this day
        </Button>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CalendarView() {
  const [mode, setMode] = useState<ViewMode>('month')
  const [anchor, setAnchor] = useState(new Date())
  const [sheetDate, setSheetDate] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const { data: tasks = [], isLoading } = useAllTasks()

  const navigate = useCallback(
    (dir: number) => {
      setAnchor((prev) => {
        const d = new Date(prev)
        if (mode === 'month') d.setMonth(d.getMonth() + dir)
        else if (mode === 'week') d.setDate(d.getDate() + dir * 7)
        else d.setDate(d.getDate() + dir)
        return d
      })
    },
    [mode],
  )

  const openSheet = (date: string) => {
    setSheetDate(date)
    setSheetOpen(true)
  }

  const headerLabel = useMemo(() => {
    if (mode === 'month') {
      return anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
    if (mode === 'week') {
      const days = getWeekDays(anchor)
      const first = days[0]
      const last = days[6]
      const sameMonth = first.getMonth() === last.getMonth()
      return sameMonth
        ? `${first.toLocaleDateString('en-US', { month: 'short' })} ${first.getDate()}–${last.getDate()}, ${first.getFullYear()}`
        : `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    return anchor.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }, [anchor, mode])

  return (
    <PageShell maxWidth="4xl" noPadding>
      <div className="flex flex-col h-full px-4 py-6 sm:px-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-sm font-semibold text-foreground min-w-0 text-center w-40">
              {headerLabel}
            </h2>
            <Button variant="ghost" size="icon-sm" onClick={() => navigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setAnchor(new Date())}
            >
              Today
            </Button>
            <div className="flex rounded-xl border border-border overflow-hidden">
              {(['month', 'week', 'day'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setMode(v)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium transition-colors capitalize',
                    mode === v
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <Skeleton className="flex-1 rounded-2xl" />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${mode}-${anchor.toISOString().slice(0, 7)}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {mode === 'month' && (
                <MonthView anchor={anchor} tasks={tasks} onDaySelect={(d) => openSheet(d)} />
              )}
              {mode === 'week' && (
                <WeekView anchor={anchor} tasks={tasks} onDaySelect={(d) => openSheet(d)} />
              )}
              {mode === 'day' && (
                <DayView anchor={anchor} tasks={tasks} onAddTask={(d) => openSheet(d)} />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <DaySheet date={sheetDate} open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </PageShell>
  )
}
