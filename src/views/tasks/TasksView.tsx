import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, CheckCircle2, Circle, Trash2, Flag, Calendar } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageShell } from '@/components/shared/PageShell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { useAllTasks, useCreateTask, useCompleteTask, useDeleteTask } from '@/hooks/useTasks'
import type { Task, TaskPriority } from '@/lib/database.types'
import { cn } from '@/lib/cn'

type TabId = 'today' | 'upcoming' | 'all'

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; color: string; badgeVariant: 'default' | 'secondary' | 'warning' | 'danger' }
> = {
  low: { label: 'Low', color: 'text-muted-foreground', badgeVariant: 'secondary' },
  medium: { label: 'Medium', color: 'text-warn-600 dark:text-warn-400', badgeVariant: 'warning' },
  high: { label: 'High', color: 'text-destructive', badgeVariant: 'danger' },
  urgent: { label: 'Urgent', color: 'text-destructive', badgeVariant: 'danger' },
}

const addSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  due_date: z.string().optional(),
})

type AddForm = z.infer<typeof addSchema>

function today() {
  return new Date().toISOString().split('T')[0]
}

function AddTaskDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const createTask = useCreateTask()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddForm>({ resolver: zodResolver(addSchema), defaultValues: { priority: 'medium' } })

  const priority = watch('priority')

  const onSubmit = async (data: AddForm) => {
    await createTask.mutateAsync({
      title: data.title,
      priority: data.priority,
      due_date: data.due_date || undefined,
    })
    reset()
    setOpen(false)
    onAdded()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
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
                  {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_CONFIG[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-due">Due date</Label>
              <Input id="task-due" type="date" min={today()} {...register('due_date')} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Adding…' : 'Add Task'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface TaskRowProps {
  task: Task
  onComplete: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
}

function TaskRow({ task, onComplete, onDelete }: TaskRowProps) {
  const pCfg = PRIORITY_CONFIG[task.priority]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
      className={cn(
        'flex items-start gap-3 rounded-xl border border-border px-3 py-3 transition-colors',
        task.completed && 'opacity-50',
      )}
    >
      <button
        onClick={() => onComplete(task.id, !task.completed)}
        className="mt-0.5 shrink-0 transition-transform active:scale-90"
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
            'text-sm font-medium text-foreground leading-snug',
            task.completed && 'line-through text-muted-foreground',
          )}
        >
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={pCfg.badgeVariant} className="text-[10px] h-4 px-1.5">
            <Flag className="h-2.5 w-2.5 mr-0.5" />
            {pCfg.label}
          </Badge>
          {task.due_date && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Calendar className="h-2.5 w-2.5" />
              {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={() => onDelete(task.id)}
        className="shrink-0 rounded-lg p-1.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  )
}

export default function TasksView() {
  const [tab, setTab] = useState<TabId>('today')
  const { data: tasks, isLoading } = useAllTasks()
  const completeTask = useCompleteTask()
  const deleteTask = useDeleteTask()

  const todayStr = today()

  const filtered = useMemo(() => {
    if (!tasks) return []
    if (tab === 'today') return tasks.filter((t) => t.due_date === todayStr || !t.due_date)
    if (tab === 'upcoming') {
      return tasks.filter((t) => t.due_date && t.due_date > todayStr && !t.completed)
    }
    return tasks
  }, [tasks, tab, todayStr])

  const incomplete = filtered.filter((t) => !t.completed)
  const complete = filtered.filter((t) => t.completed)

  return (
    <PageShell maxWidth="lg">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Tasks</h1>
            <p className="text-sm text-muted-foreground">{incomplete.length} remaining</p>
          </div>
          <AddTaskDialog onAdded={() => {}} />
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
          <TabsList className="w-full">
            <TabsTrigger value="today" className="flex-1">
              Today
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex-1">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="all" className="flex-1">
              All
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : incomplete.length === 0 && complete.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground/20 mb-3" strokeWidth={1.25} />
            <p className="text-sm font-medium text-foreground">No tasks here</p>
            <p className="text-xs text-muted-foreground mt-1">
              {tab === 'today' ? 'Add tasks to track what needs doing today.' : 'Nothing to show.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Incomplete */}
            {incomplete.length > 0 && (
              <Card>
                <CardContent className="p-3 space-y-2">
                  <AnimatePresence mode="popLayout">
                    {incomplete.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onComplete={(id, c) => completeTask.mutate({ id, completed: c })}
                        onDelete={(id) => deleteTask.mutate(id)}
                      />
                    ))}
                  </AnimatePresence>
                </CardContent>
              </Card>
            )}

            {/* Completed */}
            {complete.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground px-1 mb-2">
                  Completed ({complete.length})
                </p>
                <Card>
                  <CardContent className="p-3 space-y-2">
                    <AnimatePresence>
                      {complete.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          onComplete={(id, c) => completeTask.mutate({ id, completed: c })}
                          onDelete={(id) => deleteTask.mutate(id)}
                        />
                      ))}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </PageShell>
  )
}
