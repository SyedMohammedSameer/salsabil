import { create } from 'zustand'
import { storage } from '@/lib/platform/storage'
import type { FardName } from '@/lib/api/prayerTimes'

// Which reminders the user wants, kept on the device. Reminders are scheduled
// on the device too, so there is nothing for a server to know.

const KEY = 'salsabil-notification-prefs'

export interface NotificationPrefs {
  /** Adhan-time reminders for the five daily prayers. */
  prayers: boolean
  /** Per-prayer switches, for people who only want some of them. */
  prayerOn: Record<FardName, boolean>
  /** Minutes before the prayer time; 0 means at the time. */
  prayerLead: number
  /** Morning adhkar after Fajr, evening adhkar after Asr. */
  adhkar: boolean
  /** A chime and a notification when a focus session ends. */
  focusEnd: boolean
  /** Android: the session pinned in the notification tray while it runs. */
  focusOngoing: boolean
  /** A reminder for tasks that have a due time. */
  tasks: boolean
  /** Minutes before the due time; 0 means at the time. */
  taskLead: number
}

export const DEFAULT_PREFS: NotificationPrefs = {
  prayers: true,
  prayerOn: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
  prayerLead: 0,
  adhkar: true,
  focusEnd: true,
  focusOngoing: true,
  tasks: true,
  taskLead: 0,
}

export const PRAYER_LEADS = [0, 5, 10, 15, 30]
export const TASK_LEADS = [0, 10, 30, 60]

interface PrefsState {
  prefs: NotificationPrefs
  loaded: boolean
  update: (patch: Partial<NotificationPrefs>) => void
}

export const useNotificationPrefs = create<PrefsState>((set, get) => ({
  prefs: DEFAULT_PREFS,
  loaded: false,
  update: (patch) => {
    const prefs = { ...get().prefs, ...patch }
    set({ prefs })
    void storage.setItem(KEY, JSON.stringify(prefs))
  },
}))

void storage.getItem(KEY).then((raw) => {
  let stored: Partial<NotificationPrefs> = {}
  try {
    stored = raw ? (JSON.parse(raw) as Partial<NotificationPrefs>) : {}
  } catch {
    stored = {}
  }
  useNotificationPrefs.setState({
    prefs: {
      ...DEFAULT_PREFS,
      ...stored,
      prayerOn: { ...DEFAULT_PREFS.prayerOn, ...(stored.prayerOn ?? {}) },
    },
    loaded: true,
  })
})

/** For code outside React (the focus session side-effects). */
export function currentPrefs(): NotificationPrefs {
  return useNotificationPrefs.getState().prefs
}

export function leadLabel(minutes: number): string {
  if (minutes === 0) return 'At the time'
  if (minutes < 60) return `${minutes} min before`
  return `${minutes / 60} hour before`
}
