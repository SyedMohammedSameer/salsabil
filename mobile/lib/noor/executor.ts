import { useCallback } from 'react'
import { useRouter, type Href } from 'expo-router'
import { useFocusControl, treeName, useFocusTreeStore } from '~/lib/focusControl'
import { customPreset, PRESETS } from '~/lib/focusPresets'
import { useNotificationPrefs } from '~/lib/notificationPrefs'
import { hubHref } from '~/lib/nav'
import { clock12, relativeDay } from '~/lib/format'
import type { NoorAction } from '~/lib/noor/actions'
import { useAllTasks, useCreateTask, useCompleteTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks'
import { useUpsertPrayer } from '@/hooks/usePrayers'
import { useCreateQuranLog, useQuranLogs } from '@/hooks/useQuranLogs'
import { useLogAdhkarComplete } from '@/hooks/useAdhkar'
import { useCreateWorkout } from '@/hooks/useWorkouts'
import { useChallenges, useCreateChallenge, useIncrementChallenge } from '@/hooks/useChallenges'
import { useGardenTrees, usePlantTree, useWaterTree } from '@/hooks/useGarden'
import { useAddMemory, useForgetMemory } from '@/hooks/useMemories'
import { SPECIES_INFO } from '@/lib/api/garden'
import { localDateString } from '@/lib/dates'
import { surahName, SURAH_COUNT } from '@/data/surahs'
import type {
  AdhkarTime,
  PrayerName,
  PrayerStatus,
  Task,
  TaskPriority,
  TreeSpecies,
  WorkoutType,
} from '@/lib/database.types'
import type { MemoryKind } from '@/lib/api/memories'

// Runs Noor's actions through the same hooks the screens use, so everything
// Noor does pays coins, schedules reminders and refreshes the UI exactly as
// if the user had tapped it themselves.

export interface ActionResult {
  ok: boolean
  /** What happened, in a few words, shown on the chip under the reply. */
  label: string
}

const PRAYERS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'tahajjud']
const STATUSES: PrayerStatus[] = ['prayed', 'late', 'qada', 'missed']
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
const LABEL: Record<string, string> = { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha', tahajjud: 'Tahajjud' }

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const num = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : undefined
}
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim()

/** The best title match: exact, then contains either way, then most shared words. */
function bestMatch<T>(items: T[], query: string, title: (t: T) => string): T | null {
  const q = norm(query)
  if (!q) return null
  const exact = items.find((t) => norm(title(t)) === q)
  if (exact) return exact
  const contains = items.filter((t) => norm(title(t)).includes(q) || q.includes(norm(title(t))))
  if (contains.length) return contains.sort((a, b) => title(a).length - title(b).length)[0]
  const words = new Set(q.split(' ').filter((w) => w.length > 2))
  let best: T | null = null
  let score = 0
  for (const t of items) {
    const s = norm(title(t)).split(' ').filter((w) => words.has(w)).length
    if (s > score) {
      score = s
      best = t
    }
  }
  return score > 0 ? best : null
}

function validDate(v: unknown): string | undefined {
  const s = str(v)
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined
}
function validTime(v: unknown): string | undefined {
  const s = str(v)
  if (!s) return undefined
  const m = /^(\d{1,2}):(\d{2})/.exec(s)
  if (!m) return undefined
  const h = Number(m[1])
  const min = Number(m[2])
  return h < 24 && min < 60 ? `${String(h).padStart(2, '0')}:${m[2]}` : undefined
}

function whenLabel(date?: string, time?: string): string {
  const today = localDateString()
  return [date ? relativeDay(date, today) : null, time ? clock12(time) : null].filter(Boolean).join(' ')
}

/** The model's workout words mapped onto the app's types. */
function workoutType(raw: string | undefined): WorkoutType {
  const t = (raw ?? '').toLowerCase()
  if (['strength', 'cardio', 'flexibility', 'sports', 'walk', 'other'].includes(t)) return t as WorkoutType
  if (/run|cycl|bike|swim|hiit|cardio|row/.test(t)) return 'cardio'
  if (/gym|weight|lift|strength/.test(t)) return 'strength'
  if (/yoga|stretch|pilates|mobility/.test(t)) return 'flexibility'
  if (/walk|hike/.test(t)) return 'walk'
  if (/football|soccer|basket|tennis|padel|sport|cricket/.test(t)) return 'sports'
  return 'other'
}


export function useNoorExecutor() {
  const router = useRouter()
  const today = localDateString()

  const { data: tasks } = useAllTasks()
  const { data: challenges } = useChallenges()
  const { data: trees } = useGardenTrees()
  const { data: quranLogs } = useQuranLogs()

  const createTask = useCreateTask()
  const completeTask = useCompleteTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const upsertPrayer = useUpsertPrayer()
  const createQuran = useCreateQuranLog()
  const logAdhkar = useLogAdhkarComplete()
  const createWorkout = useCreateWorkout()
  const createChallenge = useCreateChallenge()
  const incrementChallenge = useIncrementChallenge()
  const plantTree = usePlantTree()
  const waterTree = useWaterTree()
  const addMemory = useAddMemory()
  const forgetMemory = useForgetMemory()
  const focus = useFocusControl()
  const updatePrefs = useNotificationPrefs((s) => s.update)

  const findTask = useCallback(
    (title: string | undefined, open: boolean): Task | null => {
      if (!title) return null
      const pool = (tasks ?? []).filter((t) => (open ? !t.completed : t.completed))
      return bestMatch(pool, title, (t) => t.title) ?? bestMatch(tasks ?? [], title, (t) => t.title)
    },
    [tasks],
  )

  const findTree = useCallback(
    (name: string | undefined) => {
      const growing = (trees ?? []).filter((t) => t.stage !== 'ancient')
      if (!name) return null
      return bestMatch(growing, name, (t) => `${treeName(t)} ${t.species.replace('_', ' ')}`)
    },
    [trees],
  )

  const run = useCallback(
    async (a: NoorAction): Promise<ActionResult> => {
      const g = a.args
      try {
        switch (a.name) {
          // ── Tasks ──────────────────────────────────────────────────────
          case 'createTask': {
            const title = str(g.title)
            if (!title) return { ok: false, label: 'No task title given' }
            const due_date = validDate(g.due_date)
            const due_time = validTime(g.due_time)
            const priority = PRIORITIES.includes(g.priority as TaskPriority) ? (g.priority as TaskPriority) : 'medium'
            await createTask.mutateAsync({ title, priority, due_date: due_date ?? (due_time ? today : undefined), due_time })
            const when = whenLabel(due_date ?? (due_time ? today : undefined), due_time)
            return { ok: true, label: `Added "${title}"${when ? ` · ${when}` : ''}` }
          }
          case 'completeTask':
          case 'reopenTask': {
            const done = a.name === 'completeTask'
            const task = findTask(str(g.title), done)
            if (!task) return { ok: false, label: `No task matching "${str(g.title) ?? ''}"` }
            await completeTask.mutateAsync({ id: task.id, completed: done })
            return { ok: true, label: done ? `Completed "${task.title}"` : `Reopened "${task.title}"` }
          }
          case 'updateTask': {
            const task = findTask(str(g.title), true)
            if (!task) return { ok: false, label: `No task matching "${str(g.title) ?? ''}"` }
            const updates: Record<string, unknown> = {}
            if (str(g.new_title)) updates.title = str(g.new_title)
            if (validDate(g.due_date)) updates.due_date = validDate(g.due_date)
            if (validTime(g.due_time)) updates.due_time = validTime(g.due_time)
            if (PRIORITIES.includes(g.priority as TaskPriority)) updates.priority = g.priority
            if (g.due_date === null) updates.due_date = null
            if (g.due_time === null) updates.due_time = null
            if (!Object.keys(updates).length) return { ok: false, label: 'Nothing to change' }
            await updateTask.mutateAsync({ id: task.id, updates: updates as never })
            return { ok: true, label: `Updated "${(updates.title as string) ?? task.title}"` }
          }
          case 'deleteTask': {
            const task = findTask(str(g.title), true)
            if (!task) return { ok: false, label: `No task matching "${str(g.title) ?? ''}"` }
            await deleteTask.mutateAsync(task.id)
            return { ok: true, label: `Deleted "${task.title}"` }
          }

          // ── Worship ────────────────────────────────────────────────────
          case 'logPrayer': {
            const prayer = String(g.prayer ?? '').toLowerCase() as PrayerName
            if (!PRAYERS.includes(prayer)) return { ok: false, label: 'Which prayer?' }
            const status = STATUSES.includes(g.status as PrayerStatus) ? (g.status as PrayerStatus) : 'prayed'
            const date = validDate(g.date) ?? today
            if (date > today) return { ok: false, label: 'Cannot log a future prayer' }
            await upsertPrayer.mutateAsync({ date, prayer, status })
            return { ok: true, label: `${LABEL[prayer]} logged as ${status}${date !== today ? ` for ${relativeDay(date, today)}` : ''}` }
          }
          case 'logQuranPages': {
            const pages = num(g.pages)
            if (!pages || pages <= 0 || pages > 604) return { ok: false, label: 'How many pages?' }
            // Without a range, continue from where the last reading stopped.
            const last = quranLogs?.[0]
            const sFrom = num(g.surah_from) ?? last?.surah_to ?? 1
            const aFrom = num(g.ayah_from) ?? (last ? last.ayah_to + 1 : 1)
            const sTo = num(g.surah_to) ?? sFrom
            const aTo = num(g.ayah_to) ?? aFrom
            if (sFrom > SURAH_COUNT || sTo > SURAH_COUNT || sTo < sFrom) return { ok: false, label: 'That surah range is not valid' }
            await createQuran.mutateAsync({ date: today, surah_from: sFrom, ayah_from: aFrom, surah_to: sTo, ayah_to: aTo, pages_read: Math.round(pages * 10) / 10 })
            return { ok: true, label: `Logged ${pages} ${pages === 1 ? 'page' : 'pages'} · ${surahName(sFrom)}` }
          }
          case 'logAdhkar': {
            const time = (['morning', 'evening', 'after_prayer'].includes(String(g.time)) ? g.time : 'morning') as AdhkarTime
            await logAdhkar.mutateAsync({ date: today, time })
            return { ok: true, label: `${time === 'after_prayer' ? 'After-prayer' : time[0].toUpperCase() + time.slice(1)} adhkar logged` }
          }

          // ── Focus ──────────────────────────────────────────────────────
          case 'startTimer':
          case 'startPomodoro': {
            const minutes = Math.round(num(g.minutes) ?? num(g.duration) ?? 25)
            if (minutes < 1 || minutes > 180) return { ok: false, label: 'Sessions run 1 to 180 minutes' }
            const tree = findTree(str(g.tree))
            if (tree) useFocusTreeStore.getState().setTreeId(tree.id)
            if (focus.timer.state === 'running') return { ok: false, label: 'A session is already running' }
            const preset = PRESETS.find((p) => p.type === 'pomodoro' && p.minutes === minutes) ?? customPreset(minutes)
            if (focus.timer.state === 'paused') focus.discard()
            await focus.start(preset)
            return { ok: true, label: `${minutes} min focus started${tree ? ` · grows ${treeName(tree)}` : ''}` }
          }
          case 'pauseTimer':
            if (focus.timer.state !== 'running') return { ok: false, label: 'No session is running' }
            focus.pause()
            return { ok: true, label: 'Session paused' }
          case 'resumeTimer':
            if (focus.timer.state !== 'paused') return { ok: false, label: 'No paused session' }
            focus.resume()
            return { ok: true, label: 'Session resumed' }
          case 'stopTimer': {
            if (focus.timer.state !== 'running' && focus.timer.state !== 'paused') return { ok: false, label: 'No session to stop' }
            const done = Math.floor(focus.timer.preset.minutes - focus.timer.remaining / 60)
            focus.stop()
            return { ok: true, label: `Session ended · ${done} min counted` }
          }
          case 'cancelTimer':
            if (focus.timer.state === 'idle') return { ok: false, label: 'No session to discard' }
            focus.discard()
            return { ok: true, label: 'Session discarded' }
          case 'setFocusTree': {
            const tree = findTree(str(g.tree))
            if (!tree) return { ok: false, label: `No growing tree called "${str(g.tree) ?? ''}"` }
            useFocusTreeStore.getState().setTreeId(tree.id)
            return { ok: true, label: `Sessions now grow ${treeName(tree)}` }
          }
          case 'logFocusSession':
            // Minutes only count when the timer measured them.
            return { ok: false, label: 'Past sessions cannot be logged. Start a timer instead' }

          // ── Health and habits ──────────────────────────────────────────
          case 'logWorkout': {
            const minutes = Math.round(num(g.duration_mins) ?? num(g.minutes) ?? 0)
            if (minutes <= 0) return { ok: false, label: 'How long was the workout?' }
            const type = workoutType(str(g.type) ?? str(g.workout_type))
            const title = str(g.title) ?? type[0].toUpperCase() + type.slice(1)
            await createWorkout.mutateAsync({ type, title, duration_mins: minutes, date: validDate(g.date) ?? today })
            return { ok: true, label: `Logged ${title} · ${minutes} min` }
          }
          case 'createChallenge': {
            const title = str(g.title)
            const days = Math.round(num(g.target_days) ?? 30)
            if (!title) return { ok: false, label: 'No challenge title given' }
            await createChallenge.mutateAsync({ title, target_days: Math.min(365, Math.max(1, days)), start_date: today, category: str(g.category) })
            return { ok: true, label: `Started "${title}" · ${days} days` }
          }
          case 'updateChallengeDay': {
            const active = (challenges ?? []).filter((c) => c.status === 'active')
            const c = str(g.title) ? bestMatch(active, str(g.title)!, (x) => x.title) : active.length === 1 ? active[0] : null
            if (!c) return { ok: false, label: 'Which challenge?' }
            if (c.updated_at.slice(0, 10) === today && c.current_days > 0) return { ok: false, label: `"${c.title}" is already done today` }
            await incrementChallenge.mutateAsync({ id: c.id, currentDays: c.current_days, targetDays: c.target_days, category: c.category })
            return { ok: true, label: `"${c.title}" · day ${c.current_days + 1} of ${c.target_days}` }
          }

          // ── Garden ─────────────────────────────────────────────────────
          case 'plantTree': {
            const species = String(g.species ?? '').toLowerCase().replace(/\s+/g, '_') as TreeSpecies
            if (!(species in SPECIES_INFO)) return { ok: false, label: 'Unknown tree species' }
            await plantTree.mutateAsync({ species })
            return { ok: true, label: `Planted a ${SPECIES_INFO[species].name}` }
          }
          case 'waterTree': {
            const growing = (trees ?? []).filter((t) => t.stage !== 'ancient')
            const tree = findTree(str(g.tree)) ?? [...growing].sort((x, y) => (x.planted_at < y.planted_at ? 1 : -1))[0]
            if (!tree) return { ok: false, label: 'No tree to water' }
            const updated = await waterTree.mutateAsync(tree)
            return { ok: true, label: `Watered ${treeName(tree)} · now ${updated.stage}` }
          }

          // ── Memory ─────────────────────────────────────────────────────
          case 'addMemory': {
            const content = str(g.content)
            if (!content) return { ok: false, label: 'Nothing to remember' }
            const kind = (['fact', 'preference', 'goal', 'context'].includes(String(g.kind)) ? g.kind : 'fact') as MemoryKind
            await addMemory.mutateAsync({ content, kind })
            return { ok: true, label: 'Remembered' }
          }
          case 'forgetMemory': {
            const content = str(g.content)
            if (!content) return { ok: false, label: 'Nothing to forget' }
            await forgetMemory.mutateAsync(content)
            return { ok: true, label: 'Forgotten' }
          }

          // ── App ────────────────────────────────────────────────────────
          case 'setReminders': {
            const patch: Record<string, boolean> = {}
            if (typeof g.prayers === 'boolean') patch.prayers = g.prayers
            if (typeof g.adhkar === 'boolean') patch.adhkar = g.adhkar
            if (typeof g.tasks === 'boolean') patch.tasks = g.tasks
            if (typeof g.focus === 'boolean') patch.focusEnd = g.focus
            if (!Object.keys(patch).length) return { ok: false, label: 'No reminder change given' }
            updatePrefs(patch)
            const on = Object.entries(patch).filter(([, v]) => v).map(([k]) => (k === 'focusEnd' ? 'focus' : k))
            const off = Object.entries(patch).filter(([, v]) => !v).map(([k]) => (k === 'focusEnd' ? 'focus' : k))
            return { ok: true, label: [on.length ? `${on.join(', ')} on` : '', off.length ? `${off.join(', ')} off` : ''].filter(Boolean).join(' · ') }
          }
          case 'navigateTo': {
            const raw = (str(g.screen) ?? str(g.path) ?? '').replace(/^\//, '').toLowerCase()
            const map: Record<string, Href> = {
              home: '/',
              prayers: hubHref('deen', 'prayers'),
              quran: hubHref('deen', 'quran'),
              adhkar: hubHref('deen', 'adhkar'),
              focus: hubHref('focus', 'timer'),
              timer: hubHref('focus', 'timer'),
              tasks: hubHref('focus', 'tasks'),
              rooms: hubHref('focus', 'rooms'),
              garden: hubHref('grow', 'garden'),
              challenges: hubHref('grow', 'challenges'),
              workouts: hubHref('grow', 'workouts'),
              analytics: hubHref('grow', 'analytics'),
              profile: '/profile',
              settings: '/settings',
              notifications: '/notifications' as Href,
              reminders: '/notification-settings' as Href,
            }
            const href = map[raw]
            if (!href) return { ok: false, label: 'Unknown screen' }
            // Close Noor first so the screen opens underneath, not inside the modal.
            if (router.canGoBack()) router.back()
            setTimeout(() => router.push(href), 250)
            return { ok: true, label: `Opened ${raw}` }
          }
        }
      } catch (e) {
        return { ok: false, label: e instanceof Error ? e.message : 'Something went wrong' }
      }
      return { ok: false, label: 'Unknown action' }
    },
    [
      today,
      tasks,
      challenges,
      trees,
      quranLogs,
      findTask,
      findTree,
      createTask,
      completeTask,
      updateTask,
      deleteTask,
      upsertPrayer,
      createQuran,
      logAdhkar,
      createWorkout,
      createChallenge,
      incrementChallenge,
      plantTree,
      waterTree,
      addMemory,
      forgetMemory,
      focus,
      updatePrefs,
      router,
    ],
  )

  return { run }
}
