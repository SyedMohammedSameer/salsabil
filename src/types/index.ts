/* ─────────────────────────────────────────────────────────────────────────
   Salsabil — Shared TypeScript Types
   All types live here. Import from '@/types'.
   ───────────────────────────────────────────────────────────────────────── */

// ─── App routing ──────────────────────────────────────────────────────────

export type AppRoute =
  | '/'
  | '/auth'
  | '/focus'
  | '/ai'
  | '/prayers'
  | '/quran'
  | '/adhkar'
  | '/tasks'
  | '/calendar'
  | '/workouts'
  | '/challenges'
  | '/rooms'
  | '/profile'
  | '/settings'
  | '/analytics'

// ─── Theme ────────────────────────────────────────────────────────────────

export type Theme = 'light' | 'dark' | 'system'

// ─── User / Auth ──────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  ai_onboarding_done: boolean
  onboarding_step: number
  preferences: UserPreferences
  created_at: string
}

export interface UserPreferences {
  theme: Theme
  notification_enabled: boolean
  push_enabled: boolean
  morning_brief_time: string // HH:MM
  streak_alerts: boolean
  quiet_hours_start: string // HH:MM
  quiet_hours_end: string // HH:MM
  quiet_hours_enabled: boolean
  tts_enabled: boolean
  tts_voice_gender: 'female' | 'male'
  ai_communication_style: AICommunicationStyle
  prayer_times: PrayerTimes
  timer_work_minutes: number
  timer_short_break_minutes: number
  timer_long_break_minutes: number
  timer_sessions_before_long: number
  timer_sound_enabled: boolean
}

// ─── Prayer ───────────────────────────────────────────────────────────────

export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'tahajjud'

export const PRAYER_NAMES: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'tahajjud']

export interface PrayerTimes {
  fajr: string // HH:MM
  dhuhr: string
  asr: string
  maghrib: string
  isha: string
  tahajjud: string
}

export interface PrayerLogEntry {
  id: string
  user_id: string
  date: string // YYYY-MM-DD
  fajr_fardh: boolean
  fajr_sunnah: boolean
  dhuhr_fardh: boolean
  dhuhr_sunnah: boolean
  asr_fardh: boolean
  asr_sunnah: boolean
  maghrib_fardh: boolean
  maghrib_sunnah: boolean
  isha_fardh: boolean
  isha_sunnah: boolean
  tahajjud: boolean
  notes: string | null
}

export interface PrayerMeta {
  name: PrayerName
  label: string
  fardh_count: number
  sunnah_count: number
  has_sunnah: boolean
  gradient: string
}

export const PRAYER_META: Record<PrayerName, PrayerMeta> = {
  fajr: {
    name: 'fajr',
    label: 'Fajr',
    fardh_count: 2,
    sunnah_count: 2,
    has_sunnah: true,
    gradient: 'from-orange-400 to-pink-500',
  },
  dhuhr: {
    name: 'dhuhr',
    label: 'Dhuhr',
    fardh_count: 4,
    sunnah_count: 4,
    has_sunnah: true,
    gradient: 'from-yellow-400 to-amber-500',
  },
  asr: {
    name: 'asr',
    label: 'Asr',
    fardh_count: 4,
    sunnah_count: 4,
    has_sunnah: true,
    gradient: 'from-amber-400 to-orange-500',
  },
  maghrib: {
    name: 'maghrib',
    label: 'Maghrib',
    fardh_count: 3,
    sunnah_count: 2,
    has_sunnah: true,
    gradient: 'from-rose-400 to-purple-500',
  },
  isha: {
    name: 'isha',
    label: 'Isha',
    fardh_count: 4,
    sunnah_count: 2,
    has_sunnah: true,
    gradient: 'from-indigo-500 to-violet-600',
  },
  tahajjud: {
    name: 'tahajjud',
    label: 'Tahajjud',
    fardh_count: 0,
    sunnah_count: 0,
    has_sunnah: false,
    gradient: 'from-slate-600 to-slate-800',
  },
}

// ─── Quran ────────────────────────────────────────────────────────────────

export interface QuranLogEntry {
  id: string
  user_id: string
  date: string
  surah_number: number | null
  ayah_start: number | null
  ayah_end: number | null
  pages: number | null
  duration_minutes: number | null
  notes: string | null
  created_at: string
}

// ─── Adhkar ───────────────────────────────────────────────────────────────

export type AdhkarSetId = 'morning' | 'evening' | 'after-prayer'

export interface AdhkarItem {
  id: string
  arabic: string
  transliteration: string
  translation: string
  count: number
  source?: string
}

export interface AdhkarLogEntry {
  id: string
  user_id: string
  date: string
  set_id: AdhkarSetId
  completed_at: string
}

// ─── Tasks ────────────────────────────────────────────────────────────────

export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskCategory = 'work' | 'study' | 'personal' | 'deen' | 'health'

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  due_date: string | null // YYYY-MM-DD
  start_time: string | null // HH:MM
  end_time: string | null // HH:MM
  priority: TaskPriority
  category: TaskCategory
  completed: boolean
  completed_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
  subtasks?: Subtask[]
}

export interface Subtask {
  id: string
  task_id: string
  user_id: string
  text: string
  completed: boolean
  sort_order: number
}

export type CreateTaskInput = Pick<Task, 'title' | 'priority' | 'category'> &
  Partial<Pick<Task, 'description' | 'due_date' | 'start_time' | 'end_time'>>

// ─── Focus / Pomodoro ─────────────────────────────────────────────────────

export type SessionMode = 'focus' | 'short_break' | 'long_break'

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed' | 'killed'

export interface TimerState {
  status: TimerStatus
  mode: SessionMode
  remaining_seconds: number
  session_id: string | null
  started_at: string | null
}

export interface FocusSession {
  id: string
  user_id: string
  started_at: string
  ended_at: string | null
  duration_minutes: number
  mode: SessionMode
  completed: boolean
  killed: boolean
  task_id: string | null
  tree_id: string | null
}

// ─── Garden ───────────────────────────────────────────────────────────────

export type SpeciesId =
  | 'olive'
  | 'palm'
  | 'cedar'
  | 'fig'
  | 'pomegranate'
  | 'lotus'
  | 'ancient-olive'
  | 'sidrat'
  | 'jasmine'
  | 'rose-of-jericho'
  | 'tuba'
  | 'sacred-fig'

export interface GardenTree {
  id: string
  user_id: string
  session_id: string | null
  species_id: SpeciesId
  planted_at: string
  growth_stage: 1 | 2 | 3 | 4 | 5 | 6
  is_alive: boolean
  updated_at: string
}

export interface SpeciesMeta {
  id: SpeciesId
  name: string
  arabic_name: string
  quran_ref: string | null
  cost: number // 0 = free
  description: string
}

export const SPECIES_META: Record<SpeciesId, SpeciesMeta> = {
  olive: {
    id: 'olive',
    name: 'Olive',
    arabic_name: 'زيتون',
    quran_ref: 'An-Nur 24:35',
    cost: 0,
    description: 'Symbol of blessing and light',
  },
  palm: {
    id: 'palm',
    name: 'Palm',
    arabic_name: 'نخل',
    quran_ref: 'Maryam 19:25',
    cost: 0,
    description: 'Symbol of provision and grace',
  },
  cedar: {
    id: 'cedar',
    name: 'Cedar',
    arabic_name: 'أرز',
    quran_ref: 'Ibrahim 14:24',
    cost: 0,
    description: 'The good word like a good tree',
  },
  fig: {
    id: 'fig',
    name: 'Fig',
    arabic_name: 'تين',
    quran_ref: 'At-Teen 95:1',
    cost: 0,
    description: 'Sworn by in the Quran',
  },
  pomegranate: {
    id: 'pomegranate',
    name: 'Pomegranate',
    arabic_name: 'رمان',
    quran_ref: "Al-An'am 6:141",
    cost: 0,
    description: 'A fruit of paradise',
  },
  lotus: {
    id: 'lotus',
    name: 'Lotus (Sidr)',
    arabic_name: 'سدر',
    quran_ref: 'An-Najm 53:14',
    cost: 0,
    description: 'The lote-tree of the boundary',
  },
  'ancient-olive': {
    id: 'ancient-olive',
    name: 'Ancient Olive',
    arabic_name: 'زيتونة عتيقة',
    quran_ref: "Al-Mu'minun 23:20",
    cost: 100,
    description: 'A blessed tree from a blessed valley',
  },
  sidrat: {
    id: 'sidrat',
    name: 'Sidrat al-Muntaha',
    arabic_name: 'سدرة المنتهى',
    quran_ref: 'An-Najm 53:14',
    cost: 300,
    description: 'The lote-tree of the uttermost boundary',
  },
  jasmine: {
    id: 'jasmine',
    name: 'Jasmine',
    arabic_name: 'ياسمين',
    quran_ref: null,
    cost: 80,
    description: 'Fragrant reminder of the divine garden',
  },
  'rose-of-jericho': {
    id: 'rose-of-jericho',
    name: 'Rose of Jericho',
    arabic_name: 'وردة أريحا',
    quran_ref: null,
    cost: 200,
    description: 'Resurrects with water — a symbol of resilience',
  },
  tuba: {
    id: 'tuba',
    name: 'Tuba Tree',
    arabic_name: 'طوبى',
    quran_ref: "Ar-Ra'd 13:29",
    cost: 500,
    description: 'A tree in paradise for the believers',
  },
  'sacred-fig': {
    id: 'sacred-fig',
    name: 'Sacred Fig',
    arabic_name: 'تينة مقدسة',
    quran_ref: 'At-Teen 95:1',
    cost: 150,
    description: 'Ancient wisdom in living wood',
  },
}

// ─── Workouts ─────────────────────────────────────────────────────────────

export type WorkoutType =
  | 'cardio'
  | 'strength'
  | 'flexibility'
  | 'sport'
  | 'walk'
  | 'yoga'
  | 'swim'
  | 'other'

export type WorkoutIntensity = 'easy' | 'moderate' | 'hard'

export interface WorkoutEntry {
  id: string
  user_id: string
  date: string
  type: WorkoutType
  duration_minutes: number
  intensity: WorkoutIntensity
  notes: string | null
  created_at: string
}

// ─── Challenges ───────────────────────────────────────────────────────────

export type ChallengeTemplateId = '75hard' | '21day' | 'ramadan' | 'custom'

export interface ChallengeRule {
  id: string
  challenge_id: string
  label: string
  required: boolean
  sort_order: number
}

export interface Challenge {
  id: string
  user_id: string
  name: string
  template_id: ChallengeTemplateId
  start_date: string
  duration_days: number
  active: boolean
  created_at: string
  rules?: ChallengeRule[]
}

export interface ChallengeDay {
  id: string
  challenge_id: string
  user_id: string
  date: string
  completed: boolean
  rule_status: Record<string, boolean>
  updated_at: string
}

// ─── Notifications ────────────────────────────────────────────────────────

export type NotificationType = 'ai' | 'streak' | 'challenge' | 'system' | 'achievement'

export interface AppNotification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  read_at: string | null
  link: string | null
  created_at: string
}

// ─── AI / Noor ────────────────────────────────────────────────────────────

export type AICommunicationStyle = 'encouraging' | 'direct' | 'casual' | 'formal'

export type NoorState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'acting'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  action?: AIAction
}

export interface AIAction {
  tool: string
  params: Record<string, unknown>
  status: 'pending' | 'confirmed' | 'dismissed' | 'executed'
  description: string
}

export interface AIMemory {
  id: string
  user_id: string
  category: 'goal' | 'struggle' | 'preference' | 'milestone' | 'spiritual' | 'insight'
  content: string
  relevance_score: number
  created_at: string
  source_conversation_id: string | null
}

// ─── Gamification (V2) ────────────────────────────────────────────────────

export interface CoinLedgerEntry {
  id: string
  user_id: string
  amount: number
  reason: string
  reason_category: string
  action_ref: string | null
  created_at: string
}

export type AchievementId =
  | 'first-tree'
  | 'consistent'
  | 'scholar'
  | 'iron-focus'
  | 'green-thumb'
  | 'never-quit'
  | 'night-prayer'
  | 'morning-person'
  | 'balanced'
  | 'challenger'
  | 'ramadan-ready'
  | 'ancient-grove'
  | 'collector'
  | 'streak-master'
  | 'centurion'
  | 'devoted'
  | 'word-keeper'
  | 'garden-of-eden'
  | 'early-bird'
  | 'noors-favourite'

export interface Achievement {
  id: AchievementId
  name: string
  description: string
  coin_reward: number
  unlocked_at: string | null
}

// ─── Study Rooms ──────────────────────────────────────────────────────────

export type RoomStatus = 'waiting' | 'active' | 'ended'

export interface StudyRoom {
  id: string
  name: string
  description: string | null
  created_by: string
  join_code: string
  max_participants: number
  focus_duration_minutes: number
  species_id: SpeciesId
  status: RoomStatus
  session_started_at: string | null
  created_at: string
}

export interface RoomParticipant {
  user_id: string
  room_id: string
  display_name: string
  avatar_url: string | null
  joined_at: string
  is_active: boolean
  completed_session: boolean
}

// ─── Dashboard stats ──────────────────────────────────────────────────────

export interface DashboardStats {
  prayers_today: number
  focus_minutes_today: number
  quran_pages_today: number
  tasks_completed_today: number
  tasks_total_today: number
  prayer_streak: number
  quran_streak: number
  focus_streak: number
  trees_planted_total: number
}
