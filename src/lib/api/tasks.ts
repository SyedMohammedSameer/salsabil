import { supabase } from '@/lib/supabase'
import type { Task, TaskPriority, TaskRecurrence } from '@/lib/database.types'

export async function getTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getTasksForDate(userId: string, date: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('due_date', date)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getTasksForDateRange(
  userId: string,
  from: string,
  to: string,
): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .gte('due_date', from)
    .lte('due_date', to)
    .order('due_date', { ascending: true })
    .order('order_index', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createTask(
  userId: string,
  input: {
    title: string
    description?: string
    priority?: TaskPriority
    due_date?: string
    due_time?: string
    tags?: string[]
    recurrence?: TaskRecurrence
  },
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? 'medium',
      due_date: input.due_date ?? null,
      due_time: input.due_time ?? null,
      tags: input.tags ?? [],
      completed: false,
      recurrence: input.recurrence ?? 'none',
      order_index: 0,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTask(
  taskId: string,
  updates: Partial<
    Pick<
      Task,
      | 'title'
      | 'description'
      | 'priority'
      | 'due_date'
      | 'due_time'
      | 'tags'
      | 'order_index'
      | 'recurrence'
    >
  >,
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function completeTask(taskId: string, completed: boolean): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({ completed, completed_at: completed ? new Date().toISOString() : null })
    .eq('id', taskId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) throw error
}

export async function getTodayTaskStats(
  userId: string,
  date: string,
): Promise<{ total: number; completed: number }> {
  const { data, error } = await supabase
    .from('tasks')
    .select('completed')
    .eq('user_id', userId)
    .eq('due_date', date)
  if (error) throw error
  const total = data?.length ?? 0
  const completed = data?.filter((t) => t.completed).length ?? 0
  return { total, completed }
}

// ─── Repeating tasks ──────────────────────────────────────────────────────────

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** The day after `from` that a task repeating on `recurrence` is next due. */
export function nextOccurrence(from: string, recurrence: TaskRecurrence): string | null {
  if (recurrence === 'none') return null
  const [y, m, d] = from.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (recurrence === 'daily') date.setDate(date.getDate() + 1)
  else if (recurrence === 'weekly') date.setDate(date.getDate() + 7)
  else {
    // Same day next month, clamped: 31 Jan repeats on 28 or 29 Feb.
    const target = new Date(y, m, 1)
    const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
    target.setDate(Math.min(d, last))
    return isoDay(target)
  }
  return isoDay(date)
}

/**
 * When a repeating task is completed, create its next occurrence. Idempotent:
 * if the next one already exists (the task was un-ticked and ticked again),
 * nothing is created. Returns the new task, or null.
 */
export async function spawnNextOccurrence(task: Task, today: string): Promise<Task | null> {
  if (task.recurrence === 'none') return null
  const next = nextOccurrence(task.due_date ?? today, task.recurrence)
  if (!next) return null

  const { data: existing, error: findErr } = await supabase
    .from('tasks')
    .select('id')
    .eq('user_id', task.user_id)
    .eq('title', task.title)
    .eq('recurrence', task.recurrence)
    .eq('due_date', next)
    .limit(1)
  if (findErr) throw findErr
  if (existing && existing.length > 0) return null

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: task.user_id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      due_date: next,
      due_time: task.due_time,
      tags: task.tags,
      recurrence: task.recurrence,
      completed: false,
      order_index: task.order_index,
    })
    .select()
    .single()
  if (error) throw error
  return data
}
