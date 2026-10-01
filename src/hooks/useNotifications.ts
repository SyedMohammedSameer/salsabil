import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification,
} from '@/lib/api/notifications'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Notification } from '@/lib/database.types'

export const notificationKeys = {
  all: (userId: string) => ['notifications', userId] as const,
}

// ─── In-app notifications query ───────────────────────────────────────────────

export function useNotifications() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: notificationKeys.all(user?.id ?? ''),
    queryFn: () => fetchNotifications(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  })

  // Realtime: prepend new notifications without full refetch.
  //
  // The channel name must be unique per subscriber. supabase-js returns the
  // existing channel for a name already in use, and adding a listener to a
  // channel that has already subscribed throws, so a second screen using this
  // hook (the bell's badge on Home and the notifications screen above it)
  // crashed the app.
  useEffect(() => {
    if (!user?.id) return
    const ch = supabase
      .channel(`notifications:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notif = payload.new as Notification
          qc.setQueryData<Notification[]>(notificationKeys.all(user.id), (old) =>
            old ? [notif, ...old] : [notif],
          )
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [user?.id, qc])

  return query
}

export function useMarkRead() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: (_data, id) => {
      qc.setQueryData<Notification[]>(notificationKeys.all(user!.id), (old) =>
        old?.map((n) => (n.id === id ? { ...n, read: true } : n)),
      )
    },
  })
}

export function useMarkAllRead() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => markAllNotificationsRead(user!.id),
    onSuccess: () => {
      qc.setQueryData<Notification[]>(notificationKeys.all(user!.id), (old) =>
        old?.map((n) => ({ ...n, read: true })),
      )
    },
  })
}

export function useCreateNotification() {
  return useMutation({
    mutationFn: createNotification,
  })
}
