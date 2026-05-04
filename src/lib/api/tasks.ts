import { supabase } from '@/lib/supabase'
import type { Task, TaskPriority } from '@/lib/database.types'

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
      recurrence: 'none',
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
      'title' | 'description' | 'priority' | 'due_date' | 'due_time' | 'tags' | 'order_index'
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
