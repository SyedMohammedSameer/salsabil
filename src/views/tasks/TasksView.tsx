import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Flag,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageShell } from '@/components/shared/PageShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  useCreateTask,
  useUpdateTask,
  useCompleteTask,
  useDeleteTask,
} from '@/hooks/useTasks'
import type { Task, TaskPriority } from '@/lib/database.types'
import { cn } from '@/lib/cn'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function toKey(d: Date) {
  return d.toISOString().split('T')[0]
}

function getWeekStart(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const start = new Date(d)
  start.setDate(d.getDate() + diff)
  start.setHours(0, 0, 0, 0)
  return start
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
}

function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7 // Monday = 0
  const cells: (Date | null)[] = [
    ...Array<null>(startDow).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => new Date(year, month, i + 1)),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; dot: string; badgeVariant: 'default' | 'secondary' | 'warning' | 'danger' }
> = {
  low: { label: 'Low', dot: 'bg-slate-400', badgeVariant: 'secondary' },
  medium: { label: 'Med', dot: 'bg-warn-500', badgeVariant: 'warning' },
  high: { label: 'High', dot: 'bg-destructive', badgeVariant: 'danger' },
  urgent: { label: 'Urgent', dot: 'bg-destructive', badgeVariant: 'danger' },
}

// ─── Task dialog (create + edit) ──────────────────────────────────────────────

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  due_date: z.string().optional(),
})
type TaskForm = z.infer<typeof taskSchema>

interface TaskDialogProps {
  open: boolean
  onClose: () => void
  defaultDate?: string
  task?: Task
}

function TaskDialog({ open, onClose, defaultDate, task }: TaskDialogProps) {
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    values: task
      ? { title: task.title, priority: task.priority, due_date: task.due_date ?? '' }
      : { title: '', priority: 'medium', due_date: defaultDate ?? '' },
  })

  const priority = watch('priority')

  const onSubmit = async (data: TaskForm) => {
    if (task) {
      await updateTask.mutateAsync({
        id: task.id,
        updates: {
          title: data.title,
          priority: data.priority,
          due_date: data.due_date || undefined,
        },
      })
    } else {
      await createTask.mutateAsync({
        title: data.title,
        priority: data.priority,
        due_date: data.due_date || undefined,
      })
    }
    reset()
    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset()
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="td-title">Title</Label>
            <Input
              id="td-title"
              placeholder="What needs to be done?"
              autoFocus
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setValue('priority', v as TaskPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_CONFIG[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="td-due">Due date</Label>
              <Input id="td-due" type="date" {...register('due_date')} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (task ? 'Saving…' : 'Adding…') : task ? 'Save Changes' : 'Add Task'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Week view ────────────────────────────────────────────────────────────────

function WeekView({ tasks }: { tasks: Task[] }) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [selectedDay, setSelectedDay] = useState(() => todayStr())
  const [dialog, setDialog] = useState<{ open: boolean; date?: string; task?: Task }>({
    open: false,
  })
  const days = getWeekDays(weekStart)
  const today = todayStr()

  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {}
    tasks.forEach((t) => {
      const key = t.due_date ?? '__nodate__'
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
    return map
  }, [tasks])

  const weekLabel = (() => {
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${fmt(days[0])} – ${fmt(days[6])}`
  })()

  const selectedTasks = tasksByDay[selectedDay] ?? []
  const noDateTasks = tasksByDay['__nodate__'] ?? []

  const selectedDayLabel = (() => {
    const d = new Date(selectedDay + 'T00:00:00')
    if (selectedDay === today) return 'Today'
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  })()

  const shiftWeek = (n: number) => {
    setWeekStart((w) => {
      const d = new Date(w)
      d.setDate(d.getDate() + n * 7)
      return d
    })
  }

  return (
    <div className="space-y-5">
      {/* Week nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => shiftWeek(-1)}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{weekLabel}</span>
          {selectedDay !== today && (
            <button
              onClick={() => {
                setWeekStart(getWeekStart(new Date()))
                setSelectedDay(todayStr())
              }}
              className="text-xs text-noor-600 dark:text-noor-400 hover:underline"
            >
              Today
            </button>
          )}
        </div>
        <button
          onClick={() => shiftWeek(1)}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day strip */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => {
          const key = toKey(day)
          const isToday = key === today
          const isSelected = key === selectedDay
          const count = (tasksByDay[key] ?? []).filter((t) => !t.completed).length

          return (
            <button
              key={key}
              onClick={() => setSelectedDay(key)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-2xl py-3 px-1 transition-all',
                isSelected
                  ? 'bg-noor-500 text-white shadow-md shadow-noor-500/20'
                  : isToday
                    ? 'bg-noor-500/10 text-noor-600 dark:text-noor-400'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted',
              )}
            >
              <span className={cn('text-[11px] font-medium', isSelected ? 'text-white/75' : '')}>
                {DAY_NAMES[i]}
              </span>
              <span className={cn('text-base font-bold leading-none')}>{day.getDate()}</span>
              {count > 0 ? (
                <span
                  className={cn(
                    'flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold',
                    isSelected
                      ? 'bg-white/25 text-white'
                      : 'bg-noor-500/15 text-noor-600 dark:text-noor-400',
                  )}
                >
                  {count}
                </span>
              ) : (
                <span className="h-4" />
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day tasks */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">{selectedDayLabel}</h2>
          <button
            onClick={() => setDialog({ open: true, date: selectedDay })}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-noor-600 dark:text-noor-400 hover:bg-noor-500/10 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>

        {selectedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No tasks for {selectedDayLabel.toLowerCase()}
            </p>
            <button
              onClick={() => setDialog({ open: true, date: selectedDay })}
              className="mt-2 text-xs text-noor-600 dark:text-noor-400 hover:underline"
            >
              + Add one
            </button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {selectedTasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
              >
                <ListTaskRow task={task} onEdit={() => setDialog({ open: true, task })} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* No-date tasks */}
      {noDateTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            No due date
          </p>
          <AnimatePresence>
            {noDateTasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ListTaskRow task={task} onEdit={() => setDialog({ open: true, task })} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <TaskDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false })}
        defaultDate={dialog.date}
        task={dialog.task}
      />
    </div>
  )
}

// ─── Month view ───────────────────────────────────────────────────────────────

function MonthView({ tasks }: { tasks: Task[] }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [dialog, setDialog] = useState<{ open: boolean; date?: string; task?: Task }>({
    open: false,
  })

  const today = todayStr()
  const grid = useMemo(() => getMonthGrid(year, month), [year, month])

  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {}
    tasks.forEach((t) => {
      if (!t.due_date) return
      if (!map[t.due_date]) map[t.due_date] = []
      map[t.due_date].push(t)
    })
    return map
  }, [tasks])

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else setMonth((m) => m + 1)
  }

  return (
    <div className="space-y-3">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            onClick={() => {
              setYear(now.getFullYear())
              setMonth(now.getMonth())
            }}
            className="text-xs text-noor-600 dark:text-noor-400 hover:underline"
          >
            Today
          </button>
        </div>
        <button
          onClick={nextMonth}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-1 text-center text-[10px] font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden border border-border bg-border">
        {grid.flat().map((day, idx) => {
          if (!day) {
            return (
              <div key={`empty-${idx}`} className="bg-background min-h-[72px] sm:min-h-[88px]" />
            )
          }
          const key = toKey(day)
          const isToday = key === today
          const dayTasks = tasksByDay[key] ?? []
          const visible = dayTasks.slice(0, 2)
          const overflow = dayTasks.length - visible.length

          return (
            <div
              key={key}
              onClick={() => setDialog({ open: true, date: key })}
              className={cn(
                'group bg-background min-h-[72px] sm:min-h-[88px] p-1.5 cursor-pointer',
                'hover:bg-muted/30 transition-colors',
              )}
            >
              {/* Day number */}
              <div
                className={cn(
                  'w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1',
                  isToday ? 'bg-noor-500 text-white' : 'text-foreground',
                )}
              >
                {day.getDate()}
              </div>

              {/* Task chips */}
              <div className="space-y-0.5">
                {visible.map((task) => (
                  <div
                    key={task.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      setDialog({ open: true, task })
                    }}
                    className={cn(
                      'flex items-center gap-1 rounded px-1 py-0.5 text-[9px] leading-tight truncate',
                      'hover:opacity-80 transition-opacity',
                      task.completed
                        ? 'bg-muted/50 text-muted-foreground line-through'
                        : 'bg-noor-500/10 text-noor-700 dark:text-noor-300',
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full shrink-0',
                        PRIORITY_CONFIG[task.priority].dot,
                      )}
                    />
                    <span className="truncate">{task.title}</span>
                  </div>
                ))}
                {overflow > 0 && (
                  <p className="text-[9px] text-muted-foreground px-1">+{overflow} more</p>
                )}
              </div>

              {/* Hover add hint */}
              <div className="hidden group-hover:flex items-center gap-0.5 mt-0.5 text-[9px] text-noor-500">
                <Plus className="h-2.5 w-2.5" /> Add
              </div>
            </div>
          )
        })}
      </div>

      <TaskDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false })}
        defaultDate={dialog.date}
        task={dialog.task}
      />
    </div>
  )
}

// ─── List row (All tab) ───────────────────────────────────────────────────────

function ListTaskRow({ task, onEdit }: { task: Task; onEdit: () => void }) {
  const completeTask = useCompleteTask()
  const deleteTask = useDeleteTask()
  const pCfg = PRIORITY_CONFIG[task.priority]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors',
        task.completed && 'opacity-50',
      )}
    >
      <button
        onClick={() => completeTask.mutate({ id: task.id, completed: !task.completed })}
        className="shrink-0 transition-transform active:scale-90"
      >
        {task.completed ? (
          <CheckCircle2 className="h-5 w-5 text-accent-500" strokeWidth={1.75} />
        ) : (
          <Circle
            className="h-5 w-5 text-muted-foreground/40 hover:text-muted-foreground"
            strokeWidth={1.75}
          />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium leading-snug',
            task.completed && 'line-through text-muted-foreground',
          )}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant={pCfg.badgeVariant} className="h-4 px-1.5 text-[10px]">
            <Flag className="h-2.5 w-2.5 mr-0.5" />
            {pCfg.label}
          </Badge>
          {task.due_date && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onEdit}
        className="shrink-0 rounded-lg p-1.5 text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => deleteTask.mutate(task.id)}
        className="shrink-0 rounded-lg p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function TasksView() {
  const [tab, setTab] = useState<'week' | 'month' | 'all'>('week')
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const { data: tasks, isLoading } = useAllTasks()

  const incomplete = useMemo(() => tasks?.filter((t) => !t.completed) ?? [], [tasks])
  const complete = useMemo(() => tasks?.filter((t) => t.completed) ?? [], [tasks])

  return (
    <PageShell maxWidth="6xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Tasks</h1>
            <p className="text-sm text-muted-foreground">{incomplete.length} remaining</p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add task
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="w-full">
            <TabsTrigger value="week" className="flex-1">
              Week
            </TabsTrigger>
            <TabsTrigger value="month" className="flex-1">
              Month
            </TabsTrigger>
            <TabsTrigger value="all" className="flex-1">
              All
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : tab === 'week' ? (
          <WeekView tasks={tasks ?? []} />
        ) : tab === 'month' ? (
          <MonthView tasks={tasks ?? []} />
        ) : (
          <div className="space-y-4">
            {incomplete.length === 0 && complete.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <CheckCircle2
                  className="h-12 w-12 text-muted-foreground/20 mb-3"
                  strokeWidth={1.25}
                />
                <p className="text-sm font-medium text-foreground">No tasks yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tap &quot;Add task&quot; to get started.
                </p>
              </div>
            ) : (
              <>
                {incomplete.length > 0 && (
                  <div className="space-y-1.5">
                    <AnimatePresence mode="popLayout">
                      {incomplete.map((task) => (
                        <ListTaskRow key={task.id} task={task} onEdit={() => setEditTask(task)} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
                {complete.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground px-1">
                      Completed ({complete.length})
                    </p>
                    <AnimatePresence>
                      {complete.map((task) => (
                        <ListTaskRow key={task.id} task={task} onEdit={() => setEditTask(task)} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </motion.div>

      <TaskDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <TaskDialog
        open={!!editTask}
        onClose={() => setEditTask(null)}
        task={editTask ?? undefined}
      />
    </PageShell>
  )
}
