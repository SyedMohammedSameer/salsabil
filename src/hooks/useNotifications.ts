import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification,
} from '@/lib/api/notifications'
import { savePushSubscription, deletePushSubscription } from '@/lib/api/notifications'
import { registerSW, subscribeToPush, unsubscribeFromPush } from '@/lib/registerSW'
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

  // Realtime: prepend new notifications without full refetch
  useEffect(() => {
    if (!user?.id) return
    const ch = supabase
      .channel(`notifications:${user.id}`)
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

// ─── Push permission + subscription ──────────────────────────────────────────

type PushStatus = 'unsupported' | 'default' | 'granted' | 'denied'

export function usePushNotifications() {
  const { user } = useAuth()
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null)

  const getStatus = (): PushStatus => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported'
    return Notification.permission as PushStatus
  }

  const [status, setStatus] = useState<PushStatus>(getStatus)

  const requestPermission = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated')

      const permission = await Notification.requestPermission()
      setStatus(permission as PushStatus)
      if (permission !== 'granted') throw new Error('Permission denied')

      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
      if (!vapidKey) throw new Error('VAPID key not configured')

      let reg = swRegRef.current
      if (!reg) {
        reg = await registerSW()
        swRegRef.current = reg
      }
      if (!reg) throw new Error('Service worker registration failed')

      const sub = await subscribeToPush(reg, vapidKey)
      if (!sub) throw new Error('Push subscription failed')

      await savePushSubscription(user.id, sub)
      return sub
    },
  })

  const disablePush = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated')

      let reg = swRegRef.current
      if (!reg) {
        reg = (await navigator.serviceWorker.getRegistration('/sw.js')) ?? null
        swRegRef.current = reg
      }
      if (!reg) return

      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await deletePushSubscription(user.id, sub.endpoint)
        await unsubscribeFromPush(reg)
      }
    },
  })

  return { status, requestPermission, disablePush }
}
