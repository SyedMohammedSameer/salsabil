import { useMemo } from 'react'
import { useDeviceLocation } from '~/lib/location'
import { useNotificationPrefs } from '~/lib/notificationPrefs'
import { describePreset, formatClock, PRESETS } from '~/lib/focusPresets'
import { useFocusTarget, treeName } from '~/lib/focusControl'
import { clock12 } from '~/lib/format'
import { ACTION_MANIFEST } from '~/lib/noor/actions'
import { useFocusTimer } from '@/hooks/useFocusTimer'
import { useProfile } from '@/hooks/useProfile'
import { usePrayersForRange } from '@/hooks/usePrayers'
import { usePrayerTimes } from '@/hooks/usePrayerTimes'
import { useQuranLogs } from '@/hooks/useQuranLogs'
import { useAdhkarLogs } from '@/hooks/useAdhkar'
import { useFocusSessions } from '@/hooks/useFocus'
import { useAllTasks } from '@/hooks/useTasks'
import { useWorkouts } from '@/hooks/useWorkouts'
import { useChallenges } from '@/hooks/useChallenges'
import { useGardenTrees } from '@/hooks/useGarden'
import { useMemories } from '@/hooks/useMemories'
import { FARD_ORDER, nextPrayer } from '@/lib/api/prayerTimes'
import { localDateString, daysAgo } from '@/lib/dates'
import { surahName } from '@/data/surahs'
import type { Task } from '@/lib/database.types'

// Everything Noor knows about the user, as plain text sent with each message.
// The model cannot query the database itself, so this is its whole view of
// the app: today in detail, the week and month in summary, and every open
// task. Kept compact; the phone's action list travels with it.

const PRAYER_LABEL: Record<string, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
  tahajjud: 'Tahajjud',
}

function taskLine(t: Task): string {
  const bits: string[] = [t.priority]
  if (t.due_date) bits.push(t.due_date)
  if (t.due_time) bits.push(clock12(t.due_time))
  return `- ${t.completed ? '[done] ' : ''}"${t.title}" (${bits.join(', ')})`
}

export function useNoorContext(): { context: string | undefined; memories: string | undefined } {
  const today = localDateString()
  const weekStart = localDateString(daysAgo(6))
  const monthStart = localDateString(daysAgo(29))

  const { data: profile } = useProfile()
  const { coords } = useDeviceLocation()
  const { data: times } = usePrayerTimes(coords)
  const { data: prayers } = usePrayersForRange(monthStart, today)
  const { data: quran } = useQuranLogs()
  const { data: adhkar } = useAdhkarLogs(today)
  const { data: sessions } = useFocusSessions()
  const { data: tasks } = useAllTasks()
  const { data: workouts } = useWorkouts()
  const { data: challenges } = useChallenges()
  const { data: trees } = useGardenTrees()
  const { data: memories } = useMemories()
  const timer = useFocusTimer(PRESETS[0])
  const { tree: focusTree } = useFocusTarget()
  const prefs = useNotificationPrefs((s) => s.prefs)

  // The timer's remaining time changes every tick; the context only needs it
  // to the minute, so the memo keys on that.
  const remainingMin = Math.ceil(timer.remaining / 60)

  const context = useMemo(() => {
    if (!profile) return undefined
    const now = new Date()
    const lines: string[] = []

    lines.push(
      `TODAY: ${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} (${today}), local time ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}${times ? `. Hijri ${times.hijri.date} ${times.hijri.month.en}` : ''}`,
    )
    lines.push(
      `USER: ${profile.display_name ?? profile.username ?? 'friend'} | coins ${profile.coins} | streak ${profile.streak} days (best ${Math.max(profile.longest_streak, profile.streak)})`,
    )

    // Prayers today, with times when the location is known.
    const todayRows = (prayers ?? []).filter((p) => p.date === today)
    const status = (name: string) => todayRows.find((p) => p.prayer === name)?.status ?? null
    const prayerParts = FARD_ORDER.map((p) => {
      const s = status(p)
      const at = times ? ` ${times.prayers[p]}` : ''
      return `${PRAYER_LABEL[p]}${at} ${s ?? 'not logged'}`
    })
    const tahajjud = status('tahajjud')
    const next = times ? nextPrayer(times.prayers, now) : null
    lines.push(
      `PRAYERS TODAY: ${prayerParts.join(', ')}${tahajjud ? `, Tahajjud ${tahajjud}` : ''}.${
        next ? ` Next: ${PRAYER_LABEL[next.name]} at ${times!.prayers[next.name]}.` : times ? ' All five have passed.' : ' Location not set, so prayer times are unknown.'
      }`,
    )

    // Adhkar and Quran.
    const adhkarDone = (adhkar ?? []).filter((a) => a.completed).map((a) => a.time)
    lines.push(`ADHKAR TODAY: ${adhkarDone.length ? adhkarDone.join(', ') + ' done' : 'none yet'}`)
    const quranToday = (quran ?? []).filter((q) => q.date === today)
    const pages = (from: string) => (quran ?? []).filter((q) => q.date >= from).reduce((s, q) => s + Number(q.pages_read), 0)
    const lastRead = quran?.[0]
    lines.push(
      `QURAN: ${quranToday.reduce((s, q) => s + Number(q.pages_read), 0)} pages today, ${pages(weekStart)} this week, ${pages(monthStart)} in 30 days.${
        lastRead ? ` Last read up to ${surahName(lastRead.surah_to)} ${lastRead.surah_to}:${lastRead.ayah_to} on ${lastRead.date}.` : ''
      }`,
    )

    // Focus.
    const done = (sessions ?? []).filter((s) => s.completed)
    const day = (s: { started_at: string }) => localDateString(new Date(s.started_at))
    const mins = (from: string) => done.filter((s) => day(s) >= from).reduce((sum, s) => sum + s.duration_mins, 0)
    const todaySessions = done.filter((s) => day(s) === today)
    let timerLine = 'idle'
    if (timer.state === 'running' || timer.state === 'paused') {
      const p = describePreset(timer.preset)
      timerLine = `${timer.state} (${p.label}, ${timer.preset.minutes} min, ${formatClock(timer.remaining)} left)`
    }
    lines.push(
      `FOCUS: ${mins(today)} min today in ${todaySessions.length} sessions, ${mins(weekStart)} min this week, ${mins(monthStart)} min in 30 days. Timer: ${timerLine}. Sessions grow: ${focusTree ? treeName(focusTree) : 'no growing tree'}.`,
    )

    // Tasks: every open one, grouped.
    const open = (tasks ?? []).filter((t) => !t.completed)
    const overdue = open.filter((t) => t.due_date && t.due_date < today)
    const dueToday = (tasks ?? []).filter((t) => t.due_date === today)
    const upcoming = open.filter((t) => t.due_date && t.due_date > today).sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
    const undated = open.filter((t) => !t.due_date)
    const doneMonth = (tasks ?? []).filter((t) => t.completed && t.completed_at && localDateString(new Date(t.completed_at)) >= monthStart).length
    lines.push(`TASKS: ${open.length} open, ${doneMonth} completed in 30 days.`)
    if (overdue.length) lines.push(`Overdue:\n${overdue.slice(0, 10).map(taskLine).join('\n')}`)
    lines.push(dueToday.length ? `Due today:\n${dueToday.slice(0, 15).map(taskLine).join('\n')}` : 'Due today: nothing')
    if (upcoming.length) lines.push(`Upcoming:\n${upcoming.slice(0, 12).map(taskLine).join('\n')}`)
    if (undated.length) lines.push(`No date:\n${undated.slice(0, 10).map(taskLine).join('\n')}`)

    // Month summary of prayers.
    const monthRows = (prayers ?? []).filter((p) => p.prayer !== 'tahajjud')
    const onTime = monthRows.filter((p) => p.status === 'prayed').length
    const late = monthRows.filter((p) => p.status === 'late' || p.status === 'qada').length
    const missed = monthRows.filter((p) => p.status === 'missed').length
    lines.push(`PRAYERS, LAST 30 DAYS: ${onTime} on time, ${late} late or qada, ${missed} missed, ${150 - monthRows.length} not logged (of 150).`)

    // Workouts and challenges.
    const weekWorkouts = (workouts ?? []).filter((w) => w.date >= weekStart)
    lines.push(
      `WORKOUTS: ${weekWorkouts.length} this week${weekWorkouts.length ? ` (${weekWorkouts.slice(0, 5).map((w) => `${w.title}, ${w.type}, ${w.duration_mins} min, ${w.date}`).join('; ')})` : ''}, ${(workouts ?? []).filter((w) => w.date >= monthStart).length} in 30 days.`,
    )
    const active = (challenges ?? []).filter((c) => c.status === 'active')
    lines.push(
      `CHALLENGES: ${active.length ? active.map((c) => `"${c.title}" day ${c.current_days} of ${c.target_days}${c.updated_at.slice(0, 10) === today && c.current_days > 0 ? ', today done' : ', today not yet'}`).join('; ') : 'none active'}`,
    )

    // Garden.
    lines.push(
      `GARDEN: ${(trees ?? []).length ? (trees ?? []).map((t) => `${treeName(t)} (${t.species}, ${t.stage}, ${t.xp} XP)`).join('; ') : 'no trees yet'}`,
    )

    lines.push(
      `REMINDERS: prayers ${prefs.prayers ? 'on' : 'off'}, adhkar ${prefs.adhkar ? 'on' : 'off'}, tasks ${prefs.tasks ? 'on' : 'off'}, focus ${prefs.focusEnd ? 'on' : 'off'}`,
    )

    return `${ACTION_MANIFEST}\n\nDATA:\n${lines.join('\n')}`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, times, prayers, quran, adhkar, sessions, tasks, workouts, challenges, trees, timer.state, timer.preset, remainingMin, focusTree, prefs, today, weekStart, monthStart])

  const memoryString = useMemo(() => {
    if (!memories?.length) return undefined
    return memories
      .slice(0, 30)
      .map((m) => `- ${m.content}${m.kind !== 'fact' ? ` (${m.kind})` : ''}`)
      .join('\n')
  }, [memories])

  return { context, memories: memoryString }
}
