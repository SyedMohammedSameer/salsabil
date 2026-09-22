// On-device notifications.
//
// This is the single biggest reason Salsabil needs to be a native app rather
// than a PWA. The web build reaches users through Web Push: a VAPID
// subscription, a Netlify function, and a service worker. On iOS that only
// works if the user manually adds the site to their home screen, and delivery
// is never guaranteed — for prayer times, which must arrive at a precise
// minute, that is not good enough.
//
// Here the five daily prayers are scheduled directly on the device. They fire
// exactly on time, with no network, no server, and no push infrastructure —
// even in airplane mode.

import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import {
  FARD_ORDER,
  prayerTimeToDate,
  type DailyPrayerTimes,
  type FardName,
} from '@/lib/api/prayerTimes'

// Prayer reminders should interrupt: that is the whole point of them.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

/** Marks our notifications so we can clear only ours when rescheduling. */
const PRAYER_CHANNEL = 'prayers'
const FOCUS_CHANNEL = 'focus'
const FOCUS_RUNNING_CHANNEL = 'focus-running'
const TASK_CHANNEL = 'tasks'

const FOCUS_RUNNING_ID = 'focus-running'

type NotificationKind = 'prayer' | 'focus' | 'focus-running' | 'task'

interface SalsabilNotificationData extends Record<string, unknown> {
  kind: NotificationKind
  prayer?: FardName
  taskId?: string
}

const PRAYER_LABEL: Record<FardName, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
}

// ─── Permissions ─────────────────────────────────────────────────────────────

export type NotificationPermission = 'granted' | 'denied' | 'undetermined'

export async function getNotificationPermission(): Promise<NotificationPermission> {
  const { status } = await Notifications.getPermissionsAsync()
  return status as NotificationPermission
}

/**
 * Ask for notification permission, creating the Android channels first.
 *
 * Android channels must exist before any notification is posted, otherwise the
 * system drops it silently. Creating them here rather than at import time keeps
 * module load side-effect free.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(PRAYER_CHANNEL, {
      name: 'Prayer times',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#14b8a6',
    })
    await Notifications.setNotificationChannelAsync(FOCUS_CHANNEL, {
      name: 'Focus sessions',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#14b8a6',
    })
    // The pinned "session in progress" card: visible, but never a sound.
    await Notifications.setNotificationChannelAsync(FOCUS_RUNNING_CHANNEL, {
      name: 'Focus session in progress',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      vibrationPattern: [0],
    })
    await Notifications.setNotificationChannelAsync(TASK_CHANNEL, {
      name: 'Task reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#14b8a6',
    })
  }

  // A simulator cannot grant notification permission; asking throws.
  if (!Device.isDevice) return 'undetermined'

  const existing = await Notifications.getPermissionsAsync()
  if (existing.status === 'granted') return 'granted'
  // On iOS a denied permission cannot be re-requested from the app; the user
  // has to go to Settings, so do not pretend otherwise.
  if (!existing.canAskAgain) return existing.status as NotificationPermission

  const { status } = await Notifications.requestPermissionsAsync()
  return status as NotificationPermission
}

// ─── Prayer reminders ────────────────────────────────────────────────────────

/**
 * Replace all scheduled prayer reminders with ones derived from `times`.
 *
 * Existing prayer notifications are cancelled first so repeated calls (a new
 * day, a location change, a settings change) cannot stack duplicates. Focus
 * notifications are deliberately left alone.
 *
 * Returns the number scheduled. Times already past today are skipped — the
 * caller reschedules tomorrow's set when tomorrow's times arrive.
 */
export async function schedulePrayerReminders(
  times: DailyPrayerTimes,
  opts: { day?: Date; minutesBefore?: number } = {},
): Promise<number> {
  const { day = new Date(), minutesBefore = 0 } = opts

  await cancelByKind('prayer')

  const now = Date.now()
  let scheduled = 0

  for (const prayer of FARD_ORDER) {
    const at = prayerTimeToDate(day, times[prayer])
    if (!at) continue

    const fireAt = new Date(at.getTime() - minutesBefore * 60_000)
    if (fireAt.getTime() <= now) continue

    const data: SalsabilNotificationData = { kind: 'prayer', prayer }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${PRAYER_LABEL[prayer]} — ${times[prayer]}`,
        body:
          minutesBefore > 0
            ? `${PRAYER_LABEL[prayer]} is in ${minutesBefore} minutes.`
            : `It is time for ${PRAYER_LABEL[prayer]}. Log it in Salsabil.`,
        data,
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: PRAYER_CHANNEL } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        ...(Platform.OS === 'android' ? { channelId: PRAYER_CHANNEL } : {}),
      },
    })
    scheduled++
  }

  return scheduled
}

// ─── Focus session end ───────────────────────────────────────────────────────

/**
 * Notify when a focus session ends.
 *
 * The timer itself stays correct while backgrounded because it reads the wall
 * clock, but nothing can *tell* the user it finished if the app is not running.
 * A scheduled local notification can.
 */
export async function scheduleFocusSessionEnd(endsAt: Date, minutes: number): Promise<void> {
  await cancelByKind('focus')

  if (endsAt.getTime() <= Date.now()) return

  const data: SalsabilNotificationData = { kind: 'focus' }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Session complete! MashaAllah.',
      body: `Your ${minutes}-minute focus session is done.`,
      data,
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: FOCUS_CHANNEL } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: endsAt,
      ...(Platform.OS === 'android' ? { channelId: FOCUS_CHANNEL } : {}),
    },
  })
}

export async function cancelFocusSessionEnd(): Promise<void> {
  await cancelByKind('focus')
}

// ─── Pinned "session in progress" ────────────────────────────────────────────
//
// Android: an ongoing (non-dismissable) notification for as long as the timer
// runs, so the session is visible in the shade the way a media player is. It
// states the end time rather than counting down: updating it every second
// would need a foreground service, which is a native module and a new build.
// iOS has no equivalent short of a Live Activity, so nothing is shown there.

export async function presentFocusRunning(endsAt: Date, label: string): Promise<void> {
  if (Platform.OS !== 'android') return
  const data: SalsabilNotificationData = { kind: 'focus-running' }
  const ends = endsAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  await Notifications.scheduleNotificationAsync({
    identifier: FOCUS_RUNNING_ID,
    content: {
      title: `${label} in progress`,
      body: `Ends at ${ends}. Open Salsabil to pause.`,
      data,
      sticky: true,
      autoDismiss: false,
    },
    // An immediate notification still needs a channel on Android; the
    // channel-only trigger is how expo-notifications expresses that.
    trigger: { channelId: FOCUS_RUNNING_CHANNEL },
  })
}

export async function dismissFocusRunning(): Promise<void> {
  if (Platform.OS !== 'android') return
  await Notifications.dismissNotificationAsync(FOCUS_RUNNING_ID)
}

// ─── Task reminders ──────────────────────────────────────────────────────────

export interface TaskReminderInput {
  id: string
  title: string
  due_date: string | null
  due_time: string | null
}

/** Resolve a task's due date and "HH:MM[:SS]" time into a local Date. */
export function taskDueAt(task: Pick<TaskReminderInput, 'due_date' | 'due_time'>): Date | null {
  if (!task.due_date || !task.due_time) return null
  const [y, m, d] = task.due_date.split('-').map(Number)
  const [hh, mm] = task.due_time.split(':').map(Number)
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return null
  return new Date(y, m - 1, d, hh, mm, 0, 0)
}

/**
 * Schedule (or reschedule) a reminder at the task's due time. A task with no
 * time never gets one — a date alone is a plan, not an appointment.
 */
export async function scheduleTaskReminder(task: TaskReminderInput): Promise<boolean> {
  await cancelTaskReminder(task.id)
  const at = taskDueAt(task)
  if (!at || at.getTime() <= Date.now()) return false

  const data: SalsabilNotificationData = { kind: 'task', taskId: task.id }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: task.title,
      body: 'It is time. Mark it done in Salsabil to earn your coins.',
      data,
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: TASK_CHANNEL } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: at,
      ...(Platform.OS === 'android' ? { channelId: TASK_CHANNEL } : {}),
    },
  })
  return true
}

export async function cancelTaskReminder(taskId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  await Promise.all(
    scheduled
      .filter((n) => {
        const d = n.content.data as SalsabilNotificationData | undefined
        return d?.kind === 'task' && d.taskId === taskId
      })
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  )
}

// ─── Internals ───────────────────────────────────────────────────────────────

/**
 * Cancel only the scheduled notifications of one kind.
 *
 * cancelAllScheduledNotificationsAsync would also wipe the other kind, so a
 * finished focus session would silently cancel the day's remaining prayers.
 */
async function cancelByKind(kind: NotificationKind): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  await Promise.all(
    scheduled
      .filter((n) => (n.content.data as SalsabilNotificationData | undefined)?.kind === kind)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  )
}

/** For diagnostics and the settings screen. */
export async function listScheduled() {
  return Notifications.getAllScheduledNotificationsAsync()
}
