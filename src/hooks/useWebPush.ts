// Web Push subscription management.
//
// Split out of useNotifications.ts because it is browser-only: it reaches for
// the service worker, the Notification API and a VAPID key. The native app
// imports useNotifications for the shared in-app notification queries, and
// pulling this in with it dragged registerSW.ts — and the whole service-worker
// model — into the React Native bundle, where none of it exists.
//
// Native notifications are scheduled on-device instead; see
// mobile/lib/notifications.ts.

import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { savePushSubscription, deletePushSubscription } from '@/lib/api/notifications'
import { registerSW, subscribeToPush, unsubscribeFromPush } from '@/lib/registerSW'
import { env } from '@/lib/platform/env'
import { useAuth } from './useAuth'

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

      const vapidKey = env.vapidPublicKey
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
