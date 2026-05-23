// ─── Challenge Template System ────────────────────────────────────────────────
// Each template has 3 difficulty levels.  Coins are intentionally large —
// completing a challenge is a genuine achievement worth serious reward.

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard'

export interface ChallengeLevel {
  difficulty: ChallengeDifficulty
  /** Short display label, e.g. "Light Detox" */
  label: string
  /** Pre-set day options shown as chips */
  suggestedDays: number[]
  defaultDays: number
  tasks: string[]
  coinsPerDay: number
  completionBonus: number
  treeXpPerDay: number
  treeXpCompletionBonus: number
}

export interface ChallengeTemplate {
  id: string
  name: string
  emoji: string
  tagline: string
  category: string
  colorClass: string
  bgClass: string
  borderClass: string
  levels: Record<ChallengeDifficulty, ChallengeLevel>
}

// ─── Difficulty metadata ──────────────────────────────────────────────────────

export const DIFFICULTY_META: Record<
  ChallengeDifficulty,
  { label: string; colorClass: string; bgClass: string; borderClass: string; ringClass: string }
> = {
  easy: {
    label: 'Easy',
    colorClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30',
    ringClass: 'ring-emerald-500/40',
  },
  medium: {
    label: 'Medium',
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
    ringClass: 'ring-amber-500/40',
  },
  hard: {
    label: 'Hard',
    colorClass: 'text-red-500',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/30',
    ringClass: 'ring-red-500/40',
  },
}

// ─── Category-string helpers ──────────────────────────────────────────────────
// We encode template + difficulty as "templateId|difficulty" in the DB's
// `category` column so no migration is needed.

export function encodeChallengeCategory(templateId: string, difficulty: ChallengeDifficulty) {
  return `${templateId}|${difficulty}`
}

export function parseChallengeCategory(category: string | null | undefined): {
  templateId: string | null
  difficulty: ChallengeDifficulty | null
  template: ChallengeTemplate | null
  level: ChallengeLevel | null
} {
  if (!category || !category.includes('|')) {
    return { templateId: null, difficulty: null, template: null, level: null }
  }
  const [templateId, diff] = category.split('|')
  const template = CHALLENGE_TEMPLATES.find((t) => t.id === templateId) ?? null
  const level = template?.levels[diff as ChallengeDifficulty] ?? null
  return {
    templateId: templateId ?? null,
    difficulty: diff ? (diff as ChallengeDifficulty) : null,
    template,
    level,
  }
}

/** Returns the coin/XP rewards for a given category string (or safe defaults). */
export function getChallengeRewards(category: string | null | undefined): {
  coinsPerDay: number
  completionBonus: number
  treeXpPerDay: number
  treeXpCompletionBonus: number
} {
  const DEFAULT = {
    coinsPerDay: 10,
    completionBonus: 150,
    treeXpPerDay: 5,
    treeXpCompletionBonus: 50,
  }
  const { level } = parseChallengeCategory(category)
  if (!level) return DEFAULT
  return {
    coinsPerDay: level.coinsPerDay,
    completionBonus: level.completionBonus,
    treeXpPerDay: level.treeXpPerDay,
    treeXpCompletionBonus: level.treeXpCompletionBonus,
  }
}

// ─── The 6 built-in templates ─────────────────────────────────────────────────

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  // ── 1. Dopamine Detox ───────────────────────────────────────────────────────
  {
    id: 'dopamine-detox',
    name: 'Dopamine Detox',
    emoji: '🧠',
    tagline: "Reset your brain's reward circuitry",
    category: 'mindset',
    colorClass: 'text-violet-400',
    bgClass: 'bg-violet-500/10',
    borderClass: 'border-violet-500/20',
    levels: {
      easy: {
        difficulty: 'easy',
        label: 'Light Detox',
        suggestedDays: [7, 10, 14],
        defaultDays: 7,
        tasks: [
          'Zero social media (all platforms)',
          'Daily 30-min walk outside',
          '1 hr quiet time — no phone, no TV',
          'Max 2 hrs entertainment screen time',
        ],
        coinsPerDay: 20,
        completionBonus: 200,
        treeXpPerDay: 10,
        treeXpCompletionBonus: 100,
      },
      medium: {
        difficulty: 'medium',
        label: 'Deep Reset',
        suggestedDays: [14, 21],
        defaultDays: 14,
        tasks: [
          'Zero social media (all platforms)',
          'Daily 45-min walk outside',
          '2 hrs quiet time — staring at wall, journaling',
          'Max 1 hr screen time (non-work)',
          'No Netflix / YouTube / short-form video',
          'No video games',
        ],
        coinsPerDay: 50,
        completionBonus: 750,
        treeXpPerDay: 25,
        treeXpCompletionBonus: 300,
      },
      hard: {
        difficulty: 'hard',
        label: 'Full Purge',
        suggestedDays: [21, 30],
        defaultDays: 21,
        tasks: [
          'Zero social media (all platforms)',
          'Daily 1-hr walk outside',
          '2 hrs quiet time — no inputs, pure boredom',
          'Zero entertainment screen time',
          'No music (nasheed / Quran only)',
          'Cold shower every morning',
          'No video games',
          'Phone in another room at night',
        ],
        coinsPerDay: 100,
        completionBonus: 2000,
        treeXpPerDay: 50,
        treeXpCompletionBonus: 750,
      },
    },
  },

  // ── 2. Spiritual Recharge ───────────────────────────────────────────────────
  {
    id: 'spiritual-recharge',
    name: 'Spiritual Recharge',
    emoji: '🌙',
    tagline: 'Reconnect with Allah through intentional worship',
    category: 'prayer',
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/20',
    levels: {
      easy: {
        difficulty: 'easy',
        label: 'Core Ibadah',
        suggestedDays: [7, 10, 14],
        defaultDays: 7,
        tasks: [
          'All 5 fardh prayers on time',
          'Morning adhkar (full set)',
          '2 pages Quran',
          '100× tasbih (SubhanAllah / Alhamdulillah / Allahu Akbar)',
        ],
        coinsPerDay: 20,
        completionBonus: 200,
        treeXpPerDay: 10,
        treeXpCompletionBonus: 100,
      },
      medium: {
        difficulty: 'medium',
        label: 'Elevated Worship',
        suggestedDays: [14, 21],
        defaultDays: 14,
        tasks: [
          'All 5 prayers + sunnah rawatib',
          'Morning + evening adhkar',
          '5 pages Quran',
          '33× post-prayer tasbih (all 3 prayers)',
          'Watch 1 Islamic lecture / podcast',
          'Give sadaqah — any amount',
        ],
        coinsPerDay: 50,
        completionBonus: 750,
        treeXpPerDay: 25,
        treeXpCompletionBonus: 300,
      },
      hard: {
        difficulty: 'hard',
        label: 'Spiritual Warrior',
        suggestedDays: [21, 30, 40],
        defaultDays: 30,
        tasks: [
          'All 5 prayers + full sunnah rawatib',
          'Tahajjud — minimum 2 rakat',
          'Morning + evening + after-prayer adhkar',
          '1 juz Quran (or minimum 20 pages)',
          'Watch 1 Islamic lecture / podcast',
          'Daily sadaqah — any amount',
          'Fast Mondays & Thursdays',
          'Nightly accountability: count sins & seek tawbah',
        ],
        coinsPerDay: 100,
        completionBonus: 2000,
        treeXpPerDay: 50,
        treeXpCompletionBonus: 750,
      },
    },
  },

  // ── 3. Exam Sprint ──────────────────────────────────────────────────────────
  {
    id: 'exam-sprint',
    name: 'Exam Sprint',
    emoji: '📚',
    tagline: 'Lock in and dominate your exams',
    category: 'mindset',
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/20',
    levels: {
      easy: {
        difficulty: 'easy',
        label: 'Focused Study',
        suggestedDays: [7, 10, 14],
        defaultDays: 7,
        tasks: [
          '3 hrs active study',
          '2 Pomodoro focus sessions',
          "Review previous day's notes",
          'Sleep by midnight',
        ],
        coinsPerDay: 20,
        completionBonus: 200,
        treeXpPerDay: 10,
        treeXpCompletionBonus: 100,
      },
      medium: {
        difficulty: 'medium',
        label: 'Deep Work Mode',
        suggestedDays: [14, 21],
        defaultDays: 14,
        tasks: [
          '5 hrs active study',
          '4 Pomodoro focus sessions',
          'No social media during study hours',
          'Summarise everything covered today',
          'Practice questions / past papers',
          'Sleep by 11 pm',
        ],
        coinsPerDay: 50,
        completionBonus: 750,
        treeXpPerDay: 25,
        treeXpCompletionBonus: 300,
      },
      hard: {
        difficulty: 'hard',
        label: 'Beast Mode',
        suggestedDays: [21, 30],
        defaultDays: 21,
        tasks: [
          '8 hrs active study',
          '6 Pomodoro focus sessions',
          'Zero social media',
          'Complete topic summary for every subject studied',
          'Explain a concept to someone else (Feynman technique)',
          'Review notes before sleep',
          'Sleep by 10:30 pm',
          'Fajr on time (mental clarity boost)',
        ],
        coinsPerDay: 100,
        completionBonus: 2000,
        treeXpPerDay: 50,
        treeXpCompletionBonus: 750,
      },
    },
  },

  // ── 4. Back to Gym ──────────────────────────────────────────────────────────
  {
    id: 'back-to-gym',
    name: 'Back to Gym',
    emoji: '💪',
    tagline: 'Rebuild your fitness habit from the ground up',
    category: 'fitness',
    colorClass: 'text-orange-400',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/20',
    levels: {
      easy: {
        difficulty: 'easy',
        label: 'Getting Moving',
        suggestedDays: [14, 21],
        defaultDays: 14,
        tasks: [
          '3 gym sessions this week',
          '20-min walk on rest days',
          'Drink 2 L water',
          '5-min stretch / mobility work',
        ],
        coinsPerDay: 20,
        completionBonus: 200,
        treeXpPerDay: 10,
        treeXpCompletionBonus: 100,
      },
      medium: {
        difficulty: 'medium',
        label: 'Back on Track',
        suggestedDays: [21, 30],
        defaultDays: 21,
        tasks: [
          '4 gym sessions this week',
          '30-min walk on rest days',
          'Track food / macros',
          'Drink 3 L water',
          '7+ hrs sleep',
          'No junk food / takeaways',
        ],
        coinsPerDay: 50,
        completionBonus: 750,
        treeXpPerDay: 25,
        treeXpCompletionBonus: 300,
      },
      hard: {
        difficulty: 'hard',
        label: 'No Days Off',
        suggestedDays: [30, 45],
        defaultDays: 30,
        tasks: [
          '5 gym sessions this week',
          '45-min walk on rest days',
          'Meal prep every Sunday',
          'Track all food — no guessing',
          'Zero junk food / takeaways',
          '8 hrs sleep every night',
          'Cold shower post-workout',
          'Log all lifts — progressive overload',
        ],
        coinsPerDay: 100,
        completionBonus: 2000,
        treeXpPerDay: 50,
        treeXpCompletionBonus: 750,
      },
    },
  },

  // ── 5. Digital Minimalism ───────────────────────────────────────────────────
  {
    id: 'digital-minimalism',
    name: 'Digital Minimalism',
    emoji: '📵',
    tagline: 'Reclaim your attention from the algorithm',
    category: 'mindset',
    colorClass: 'text-rose-400',
    bgClass: 'bg-rose-500/10',
    borderClass: 'border-rose-500/20',
    levels: {
      easy: {
        difficulty: 'easy',
        label: 'Mindful Tech',
        suggestedDays: [7, 14],
        defaultDays: 7,
        tasks: [
          'Phone-free meals',
          'No phone first 30 min after waking',
          'Max 1 hr social media total',
          'No phone 30 min before bed',
        ],
        coinsPerDay: 20,
        completionBonus: 200,
        treeXpPerDay: 10,
        treeXpCompletionBonus: 100,
      },
      medium: {
        difficulty: 'medium',
        label: 'Digital Diet',
        suggestedDays: [14, 21],
        defaultDays: 14,
        tasks: [
          'Phone-free meals',
          'No phone first 1 hr after waking',
          'Max 30 min social media — intentional use only',
          'Phone out of bedroom',
          'Daily walk without earphones or phone',
          'Disable all non-essential notifications',
        ],
        coinsPerDay: 50,
        completionBonus: 750,
        treeXpPerDay: 25,
        treeXpCompletionBonus: 300,
      },
      hard: {
        difficulty: 'hard',
        label: 'Digital Silence',
        suggestedDays: [21, 30],
        defaultDays: 21,
        tasks: [
          'Zero social media — apps blocked or deleted',
          'Phone-free first 2 hrs of day',
          'Grayscale phone screen mode',
          'Digital sunset: no phone 2 hrs before sleep',
          'Phone out of bedroom',
          'Max 1 hr total screen time (non-work)',
          'One fully offline day per week',
        ],
        coinsPerDay: 100,
        completionBonus: 2000,
        treeXpPerDay: 50,
        treeXpCompletionBonus: 750,
      },
    },
  },

  // ── 6. Morning Warrior ──────────────────────────────────────────────────────
  {
    id: 'morning-warrior',
    name: 'Morning Warrior',
    emoji: '🌅',
    tagline: 'Win the morning, win the day',
    category: 'habit',
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/20',
    levels: {
      easy: {
        difficulty: 'easy',
        label: 'Early Riser',
        suggestedDays: [14, 21],
        defaultDays: 14,
        tasks: [
          'Wake before 6:30 am',
          'Fajr prayer',
          'Morning adhkar',
          '10-min outdoor walk',
          'Make your bed',
        ],
        coinsPerDay: 20,
        completionBonus: 200,
        treeXpPerDay: 10,
        treeXpCompletionBonus: 100,
      },
      medium: {
        difficulty: 'medium',
        label: 'Dawn Champion',
        suggestedDays: [21, 30],
        defaultDays: 21,
        tasks: [
          'Wake before 5:30 am',
          'Fajr prayer on time',
          'Full morning adhkar',
          '20-min walk / light exercise',
          '10-min journaling',
          'Plan your day — top 3 tasks',
          'No phone first hour',
        ],
        coinsPerDay: 50,
        completionBonus: 750,
        treeXpPerDay: 25,
        treeXpCompletionBonus: 300,
      },
      hard: {
        difficulty: 'hard',
        label: 'Fajr Warrior',
        suggestedDays: [30, 40],
        defaultDays: 30,
        tasks: [
          'Wake before 5 am',
          'Tahajjud (min 2 rakat) + Fajr on time',
          'Full morning adhkar',
          '30-min walk or workout',
          'Cold shower',
          '15-min journaling',
          'Plan the day — top 3 + 3 stretch tasks',
          'No phone first 2 hrs',
          'Healthy breakfast — no skipping',
        ],
        coinsPerDay: 100,
        completionBonus: 2000,
        treeXpPerDay: 50,
        treeXpCompletionBonus: 750,
      },
    },
  },
]
