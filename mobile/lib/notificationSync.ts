import { useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { useRouter } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { useDeviceLocation } from '~/lib/location'
import { useNotificationPrefs } from '~/lib/notificationPrefs'
import {
  getNotificationPermission,
  ensureNotificationChannels,
  schedulePrayerReminders,
  cancelPrayerReminders,
  syncTaskReminders,
  type NotificationPermission,
  type SalsabilNotificationData,
} from '~/lib/notifications'
import { hubHref } from '~/lib/nav'
import { usePrayerTimes } from '@/hooks/usePrayerTimes'
import { useAllTasks } from '@/hooks/useTasks'
import { localDateString } from '@/lib/dates'

// Keeps the device's scheduled reminders in step with the app, from one place
// mounted in the tab layout:
//
//   * prayer and adhkar reminders for today and tomorrow, rescheduled when the
//     day, the location, the times or the preferences change
//   * a reminder for every open task with a due time, rescheduled whenever
//     the task list changes, whoever changed it (a screen, Noor, the web)
//   * a tapped notification opens the section it is about
//
// Before, prayers were only scheduled while the Prayers screen was open and a
// task only got a reminder if it was created on the Tasks screen.

const permissionListeners = new Set<() => void>()
// A cold-start tap is reported again on every later read; open it once.
const handledResponses = new Set<string>()

function tomorrowOf(d: Date): Date {
  const t = new Date(d)
  t.setDate(t.getDate() + 1)
  return t
}

export function useNotificationSync() {
  const router = useRouter()
  const { coords } = useDeviceLocation()
  const prefs = useNotificationPrefs((s) => s.prefs)
  const prefsLoaded = useNotificationPrefs((s) => s.loaded)

  // The calendar day, refreshed when the app comes back to the foreground so
  // a phone left overnight schedules the new day's reminders.
  const [today, setToday] = useState(() => localDateString())
  const [permission, setPermission] = useState<NotificationPermission>('undetermined')
  useEffect(() => {
    const reread = () => void getNotificationPermission().then(setPermission)
    void ensureNotificationChannels()
    reread()
    permissionListeners.add(reread)
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return
      setToday(localDateString())
      reread()
    })
    return () => {
      permissionListeners.delete(reread)
      sub.remove()
    }
  }, [])

  const now = new Date()
  const { data: todayTimes } = usePrayerTimes(coords, 2, now)
  const { data: tomorrowTimes } = usePrayerTimes(coords, 2, tomorrowOf(now))
  const { data: tasks } = useAllTasks()

  // ── Prayers and adhkar ────────────────────────────────────────────────────
  const prayerKey = useRef<string | null>(null)
  useEffect(() => {
    if (!prefsLoaded || permission !== 'granted') return
    const key = JSON.stringify([
      today,
      todayTimes?.prayers ?? null,
      tomorrowTimes?.prayers ?? null,
      prefs.prayers,
      prefs.prayerOn,
      prefs.prayerLead,
      prefs.adhkar,
    ])
    if (prayerKey.current === key) return
    prayerKey.current = key
    if (!prefs.prayers && !prefs.adhkar) {
      void cancelPrayerReminders().catch(() => undefined)
      return
    }
    const days: { day: Date; times: NonNullable<typeof todayTimes>['prayers'] }[] = []
    const base = new Date()
    if (todayTimes) days.push({ day: base, times: todayTimes.prayers })
    if (tomorrowTimes) days.push({ day: tomorrowOf(base), times: tomorrowTimes.prayers })
    if (days.length === 0) return
    void schedulePrayerReminders(days, {
      prayers: prefs.prayers,
      prayerOn: prefs.prayerOn,
      minutesBefore: prefs.prayerLead,
      adhkar: prefs.adhkar,
    }).catch(() => undefined)
  }, [prefsLoaded, permission, today, todayTimes, tomorrowTimes, prefs])

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const taskKey = useRef<string | null>(null)
  useEffect(() => {
    if (!prefsLoaded || permission !== 'granted' || !tasks) return
    const relevant = tasks
      .filter((t) => !t.completed && t.due_date && t.due_time)
      .map((t) => [t.id, t.title, t.due_date, t.due_time])
    const key = JSON.stringify([today, relevant, prefs.tasks, prefs.taskLead])
    if (taskKey.current === key) return
    taskKey.current = key
    void syncTaskReminders(tasks, { enabled: prefs.tasks, minutesBefore: prefs.taskLead }).catch(() => undefined)
  }, [prefsLoaded, permission, today, tasks, prefs.tasks, prefs.taskLead])

  // ── Taps ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const open = (data: SalsabilNotificationData | undefined) => {
      switch (data?.kind) {
        case 'prayer':
          router.push(hubHref('deen', 'prayers'))
          break
        case 'adhkar':
          router.push(hubHref('deen', 'adhkar'))
          break
        case 'focus':
        case 'focus-running':
          router.push(hubHref('focus', 'timer'))
          break
        case 'task':
          router.push(hubHref('focus', 'tasks'))
          break
        default:
          break
      }
    }
    // A cold start from a tap: the response is waiting before any listener.
    const handle = (r: Notifications.NotificationResponse | null) => {
      if (!r) return
      const id = `${r.notification.request.identifier}:${r.notification.date}`
      if (handledResponses.has(id)) return
      handledResponses.add(id)
      open(r.notification.request.content.data as SalsabilNotificationData)
    }
    void Notifications.getLastNotificationResponseAsync()
      .then(handle)
      .catch(() => undefined)
    const sub = Notifications.addNotificationResponseReceivedListener(handle)
    return () => sub.remove()
  }, [router])
}

/** Call after asking for permission anywhere, so scheduling starts at once. */
export function notifyPermissionChanged() {
  for (const l of permissionListeners) l()
}
