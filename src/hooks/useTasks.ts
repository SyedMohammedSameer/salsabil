import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getTasks,
  getTasksForDate,
  getTasksForDateRange,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  getTodayTaskStats,
} from '@/lib/api/tasks'
import { awardCoins } from '@/lib/api/coins'
import { waterNewestActiveTree } from '@/lib/api/garden'
import { createNotification } from '@/lib/api/notifications'
import { profileKeys } from './useProfile'
import { gardenKeys } from './useGarden'
import { REWARDS } from '@/lib/rewards'
import { notificationKeys } from './useNotifications'
import type { Task, TaskPriority } from '@/lib/database.types'
import { useAuth } from './useAuth'

export const taskKeys = {
  all: (userId: string) => ['tasks', userId] as const,
  byDate: (userId: string, date: string) => ['tasks', userId, 'date', date] as const,
  byRange: (userId: string, from: string, to: string) =>
    ['tasks', userId, 'range', from, to] as const,
  stats: (userId: string, date: string) => ['tasks-stats', userId, date] as const,
}

function invalidateDashboard(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
}

export function useAllTasks() {
  const { user } = useAuth()
  return useQuery({
    queryKey: taskKeys.all(user?.id ?? ''),
    queryFn: () => getTasks(user!.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  })
}

export function useTasksForDate(date: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: taskKeys.byDate(user?.id ?? '', date),
    queryFn: () => getTasksForDate(user!.id, date),
    enabled: !!user?.id,
    staleTime: 30_000,
  })
}

export function useTasksForRange(from: string, to: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: taskKeys.byRange(user?.id ?? '', from, to),
    queryFn: () => getTasksForDateRange(user!.id, from, to),
    enabled: !!user?.id,
    staleTime: 30_000,
  })
}

export function useTaskStats(date: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: taskKeys.stats(user?.id ?? '', date),
    queryFn: () => getTodayTaskStats(user!.id, date),
    enabled: !!user?.id,
    staleTime: 30_000,
  })
}

export function useCreateTask() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      title: string
      description?: string
      priority?: TaskPriority
      due_date?: string
      due_time?: string
      tags?: string[]
    }) => createTask(user!.id, input),
    onSuccess: (newTask) => {
      qc.setQueryData<Task[]>(taskKeys.all(user!.id), (old) =>
        old ? [newTask, ...old] : [newTask],
      )
      if (newTask.due_date) {
        qc.invalidateQueries({ queryKey: taskKeys.byDate(user!.id, newTask.due_date) })
        qc.invalidateQueries({ queryKey: taskKeys.stats(user!.id, newTask.due_date) })
      }
      invalidateDashboard(qc)
    },
  })
}

export function useUpdateTask() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateTask>[1] }) =>
      updateTask(id, updates),
    onSuccess: (updated) => {
      qc.setQueryData<Task[]>(taskKeys.all(user!.id), (old) =>
        old?.map((t) => (t.id === updated.id ? updated : t)),
      )
      if (updated.due_date) {
        qc.invalidateQueries({ queryKey: taskKeys.byDate(user!.id, updated.due_date) })
      }
      invalidateDashboard(qc)
    },
  })
}

export function useCompleteTask() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      completeTask(id, completed),
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey: taskKeys.all(user!.id) })
      const prev = qc.getQueryData<Task[]>(taskKeys.all(user!.id))
      qc.setQueryData<Task[]>(taskKeys.all(user!.id), (old) =>
        old?.map((t) =>
          t.id === id
            ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null }
            : t,
        ),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(taskKeys.all(user!.id), ctx.prev)
    },
    onSuccess: (updated, { completed }) => {
      if (updated.due_date) {
        qc.invalidateQueries({ queryKey: taskKeys.stats(user!.id, updated.due_date) })
      }
      invalidateDashboard(qc)
      if (completed && user) {
        Promise.allSettled([
          awardCoins(
            user.id,
            'task_complete',
            REWARDS.task_complete.coins,
            `Task: ${updated.title}`,
          ).then(() => qc.invalidateQueries({ queryKey: profileKeys.byId(user.id) })),
          waterNewestActiveTree(user.id, REWARDS.task_complete.xp).then(() =>
            qc.invalidateQueries({ queryKey: gardenKeys.trees(user.id) }),
          ),
          createNotification({
            user_id: user.id,
            type: 'task_complete',
            title: 'Task done!',
            body: updated.title,
            action_url: '/tasks',
          }).then(() => qc.invalidateQueries({ queryKey: notificationKeys.all(user.id) })),
        ])
      }
    },
  })
}

export function useDeleteTask() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: taskKeys.all(user!.id) })
      const prev = qc.getQueryData<Task[]>(taskKeys.all(user!.id))
      qc.setQueryData<Task[]>(taskKeys.all(user!.id), (old) => old?.filter((t) => t.id !== id))
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(taskKeys.all(user!.id), ctx.prev)
    },
    onSuccess: () => {
      invalidateDashboard(qc)
    },
  })
}
