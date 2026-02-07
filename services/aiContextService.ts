// services/aiContextService.ts - Build comprehensive context for Noor AI
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Task,
  DailyPrayerLog,
  DailyQuranLog,
  PomodoroSettings,
  Challenge,
  WorkoutEntry,
  AIMemory,
  NoorContext,
} from '../types';
import { getRelevantMemories } from './aiMemoryService';

// ============================================================================
// HELPERS
// ============================================================================

/** Return today's date as YYYY-MM-DD */
const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Return a date N days ago as YYYY-MM-DD */
const daysAgoStr = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};


/** Default pomodoro settings when none are saved */
const DEFAULT_POMODORO: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  pomodorosBeforeLongBreak: 4,
};

/**
 * Calculate the current streak from a sorted array of date strings (YYYY-MM-DD).
 * A streak is consecutive days ending at today or yesterday.
 */
const calculateStreak = (dates: string[]): number => {
  if (dates.length === 0) return 0;

  const sorted = [...dates].sort().reverse(); // most recent first
  const today = todayStr();
  const yesterday = daysAgoStr(1);

  // Streak must start from today or yesterday
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffMs = prev.getTime() - curr.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
};

// ============================================================================
// DATA FETCHERS (each handles its own errors)
// ============================================================================

/**
 * Fetch prayer logs from the single settings doc.
 * Structure: users/{userId}/settings/prayerLogs  -> { [date]: DailyPrayerLog }
 */
const fetchPrayerLogs = async (userId: string): Promise<DailyPrayerLog[]> => {
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'prayerLogs');
    const snap = await getDoc(docRef);
    if (!snap.exists()) return [];

    const data = snap.data();
    const logs: DailyPrayerLog[] = [];
    for (const [date, value] of Object.entries(data)) {
      // Skip non-date keys (e.g. metadata fields)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const entry = value as any;
      logs.push({
        date,
        prayers: entry.prayers || {},
        notes: entry.notes,
      });
    }
    return logs.sort((a, b) => b.date.localeCompare(a.date));
  } catch (err) {
    console.error('aiContextService: Failed to fetch prayer logs', err);
    return [];
  }
};

/**
 * Fetch Quran logs from the single settings doc.
 * Structure: users/{userId}/settings/quranLogs -> { [date]: DailyQuranLog }
 */
const fetchQuranLogs = async (userId: string): Promise<DailyQuranLog[]> => {
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'quranLogs');
    const snap = await getDoc(docRef);
    if (!snap.exists()) return [];

    const data = snap.data();
    const logs: DailyQuranLog[] = [];
    for (const [date, value] of Object.entries(data)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const entry = value as any;
      logs.push({
        date,
        readQuran: entry.readQuran ?? false,
        pagesRead: entry.pagesRead ?? 0,
        notes: entry.notes,
      });
    }
    return logs.sort((a, b) => b.date.localeCompare(a.date));
  } catch (err) {
    console.error('aiContextService: Failed to fetch quran logs', err);
    return [];
  }
};

/**
 * Fetch pomodoro settings.
 */
const fetchPomodoroSettings = async (userId: string): Promise<PomodoroSettings> => {
  try {
    const docRef = doc(db, 'users', userId, 'settings', 'pomodoro');
    const snap = await getDoc(docRef);
    if (!snap.exists()) return DEFAULT_POMODORO;

    const data = snap.data();
    return {
      workDuration: data.workDuration ?? DEFAULT_POMODORO.workDuration,
      shortBreakDuration: data.shortBreakDuration ?? DEFAULT_POMODORO.shortBreakDuration,
      longBreakDuration: data.longBreakDuration ?? DEFAULT_POMODORO.longBreakDuration,
      pomodorosBeforeLongBreak: data.pomodorosBeforeLongBreak ?? DEFAULT_POMODORO.pomodorosBeforeLongBreak,
    };
  } catch (err) {
    console.error('aiContextService: Failed to fetch pomodoro settings', err);
    return DEFAULT_POMODORO;
  }
};

/**
 * Fetch active challenges.
 */
const fetchActiveChallenges = async (userId: string): Promise<Challenge[]> => {
  try {
    const colRef = collection(db, 'users', userId, 'challenges');
    const q = query(colRef, where('active', '==', true));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        startDate: data.startDate,
        durationDays: data.durationDays,
        rules: data.rules || [],
        active: data.active,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
        totalXP: data.totalXP,
        currentStreak: data.currentStreak,
        longestStreak: data.longestStreak,
      } as Challenge;
    });
  } catch (err) {
    console.error('aiContextService: Failed to fetch challenges', err);
    return [];
  }
};

/**
 * Fetch workouts from the last 7 days.
 */
const fetchRecentWorkouts = async (userId: string): Promise<WorkoutEntry[]> => {
  try {
    const colRef = collection(db, 'users', userId, 'workouts');
    const sevenDaysAgo = daysAgoStr(7);
    const q = query(
      colRef,
      where('date', '>=', sevenDaysAgo),
      orderBy('date', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        date: data.date,
        type: data.type,
        durationMinutes: data.durationMinutes,
        notes: data.notes,
        completed: data.completed,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
      } as WorkoutEntry;
    });
  } catch (err) {
    console.error('aiContextService: Failed to fetch workouts', err);
    return [];
  }
};

/**
 * Fetch AI memories via the memory service.
 */
const fetchMemories = async (userId: string): Promise<AIMemory[]> => {
  try {
    return await getRelevantMemories(userId);
  } catch (err) {
    console.error('aiContextService: Failed to fetch AI memories', err);
    return [];
  }
};

// ============================================================================
// STATS CALCULATION
// ============================================================================

interface ComputedStats {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  currentStreak: number;
  weeklyQuranPages: number;
  todayPrayers: number;
  focusMinutesToday: number;
  treesPlanted: number;
  activeChallenges: number;
  weeklyWorkouts: number;
}

const computeStats = (
  tasks: Task[],
  prayerLogs: DailyPrayerLog[],
  quranLogs: DailyQuranLog[],
  challenges: Challenge[],
  workouts: WorkoutEntry[],
  _pomodoroSettings: PomodoroSettings
): ComputedStats => {
  const today = todayStr();
  const sevenDaysAgo = daysAgoStr(7);

  // Task stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) / 100 : 0;

  // Task streak: consecutive days with at least one completed task
  const datesWithCompletedTasks = [...new Set(
    tasks.filter((t) => t.completed).map((t) => t.date)
  )];
  const currentStreak = calculateStreak(datesWithCompletedTasks);

  // Quran pages this week
  const weeklyQuranPages = quranLogs
    .filter((l) => l.date >= sevenDaysAgo)
    .reduce((sum, l) => sum + (l.pagesRead || 0), 0);

  // Today's prayers completed
  const todayPrayerLog = prayerLogs.find((l) => l.date === today);
  let todayPrayers = 0;
  if (todayPrayerLog?.prayers) {
    for (const prayer of Object.values(todayPrayerLog.prayers)) {
      if (prayer?.fardh) todayPrayers++;
    }
  }

  // Focus minutes today and trees planted
  // These are approximations based on pomodoro settings -- actual data would
  // come from focus session logs. We set defaults here; the caller can
  // override if live pomodoro state is available.
  const focusMinutesToday = 0;
  const treesPlanted = 0;

  // Active challenges
  const activeChallenges = challenges.length;

  // Weekly workouts
  const weeklyWorkouts = workouts.filter((w) => w.completed && w.date >= sevenDaysAgo).length;

  return {
    totalTasks,
    completedTasks,
    completionRate,
    currentStreak,
    weeklyQuranPages,
    todayPrayers,
    focusMinutesToday,
    treesPlanted,
    activeChallenges,
    weeklyWorkouts,
  };
};

// ============================================================================
// BUILD FULL CONTEXT
// ============================================================================

/**
 * Gathers ALL user data across the app and builds a comprehensive NoorContext.
 * Uses Promise.all for parallel fetching. If any data source fails, defaults
 * are used and the rest of the context is still built.
 */
export const buildFullContext = async (
  userId: string,
  tasks: Task[]
): Promise<NoorContext> => {
  const [
    prayerLogs,
    quranLogs,
    pomodoroSettings,
    challenges,
    workouts,
    memories,
  ] = await Promise.all([
    fetchPrayerLogs(userId),
    fetchQuranLogs(userId),
    fetchPomodoroSettings(userId),
    fetchActiveChallenges(userId),
    fetchRecentWorkouts(userId),
    fetchMemories(userId),
  ]);

  const stats = computeStats(tasks, prayerLogs, quranLogs, challenges, workouts, pomodoroSettings);

  return {
    tasks,
    prayerLogs,
    quranLogs,
    pomodoroSettings,
    challenges,
    workouts,
    memories,
    stats,
  };
};

// ============================================================================
// CONTEXT TO PROMPT STRING
// ============================================================================

/**
 * Converts a NoorContext into a detailed text prompt for the AI model,
 * covering every data dimension available.
 */
export const contextToPromptString = (context: NoorContext): string => {
  const sections: string[] = [];
  const today = todayStr();

  // --- TASKS & PRODUCTIVITY ---
  const taskLines: string[] = [];
  taskLines.push(`Total tasks: ${context.stats.totalTasks}`);
  taskLines.push(`Completed: ${context.stats.completedTasks}`);
  taskLines.push(`Completion rate: ${Math.round(context.stats.completionRate * 100)}%`);
  taskLines.push(`Current streak: ${context.stats.currentStreak} day(s)`);

  const todayTasks = context.tasks.filter((t) => t.date === today);
  if (todayTasks.length > 0) {
    taskLines.push(`\nToday's tasks (${todayTasks.length}):`);
    for (const t of todayTasks) {
      const status = t.completed ? '[DONE]' : '[PENDING]';
      const time = t.startTime ? ` at ${t.startTime}` : '';
      taskLines.push(`  ${status} ${t.title} (${t.priority} priority)${time}`);
    }
  }

  const upcomingTasks = context.tasks
    .filter((t) => !t.completed && t.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10);
  if (upcomingTasks.length > 0) {
    taskLines.push(`\nUpcoming tasks:`);
    for (const t of upcomingTasks) {
      taskLines.push(`  - ${t.title} (${t.priority}, due ${t.date})`);
    }
  }

  sections.push(`=== TASKS & PRODUCTIVITY ===\n${taskLines.join('\n')}`);

  // --- SPIRITUAL PROGRESS ---
  const spiritLines: string[] = [];

  // Prayer stats for today
  const todayPrayerLog = context.prayerLogs.find((l) => l.date === today);
  spiritLines.push(`Prayers completed today: ${context.stats.todayPrayers}/5`);
  if (todayPrayerLog?.prayers) {
    const prayerNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const completed: string[] = [];
    const missed: string[] = [];
    for (const name of prayerNames) {
      const entry = (todayPrayerLog.prayers as any)[name];
      if (entry?.fardh) {
        completed.push(name);
      } else {
        missed.push(name);
      }
    }
    if (completed.length > 0) spiritLines.push(`  Completed: ${completed.join(', ')}`);
    if (missed.length > 0) spiritLines.push(`  Not yet prayed: ${missed.join(', ')}`);
  }

  // Prayer trend (last 7 days)
  const recentPrayerLogs = context.prayerLogs.filter((l) => l.date >= daysAgoStr(7));
  if (recentPrayerLogs.length > 0) {
    const totalPossible = recentPrayerLogs.length * 5;
    let totalCompleted = 0;
    for (const log of recentPrayerLogs) {
      if (log.prayers) {
        for (const prayer of Object.values(log.prayers)) {
          if (prayer?.fardh) totalCompleted++;
        }
      }
    }
    const prayerRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
    spiritLines.push(`Prayer rate (7-day): ${prayerRate}% (${totalCompleted}/${totalPossible})`);
  }

  // Quran stats
  spiritLines.push(`\nQuran pages this week: ${context.stats.weeklyQuranPages}`);
  const quranDatesRead = context.quranLogs
    .filter((l) => l.readQuran)
    .map((l) => l.date);
  const quranStreak = calculateStreak(quranDatesRead);
  spiritLines.push(`Quran reading streak: ${quranStreak} day(s)`);

  const todayQuranLog = context.quranLogs.find((l) => l.date === today);
  if (todayQuranLog) {
    spiritLines.push(`Today: ${todayQuranLog.readQuran ? `Read ${todayQuranLog.pagesRead || 0} pages` : 'Not yet read'}`);
  }

  sections.push(`=== SPIRITUAL PROGRESS ===\n${spiritLines.join('\n')}`);

  // --- FITNESS & WELLNESS ---
  const fitnessLines: string[] = [];
  fitnessLines.push(`Workouts this week: ${context.stats.weeklyWorkouts}`);

  if (context.workouts.length > 0) {
    fitnessLines.push(`\nRecent workouts:`);
    for (const w of context.workouts.slice(0, 5)) {
      const status = w.completed ? '[DONE]' : '[SKIPPED]';
      fitnessLines.push(`  ${status} ${w.type} - ${w.durationMinutes} min (${w.date})${w.notes ? ` - ${w.notes}` : ''}`);
    }
  } else {
    fitnessLines.push('No recent workouts logged.');
  }

  sections.push(`=== FITNESS & WELLNESS ===\n${fitnessLines.join('\n')}`);

  // --- ACTIVE CHALLENGES ---
  const challengeLines: string[] = [];
  if (context.challenges.length > 0) {
    challengeLines.push(`Active challenges: ${context.stats.activeChallenges}`);
    for (const c of context.challenges) {
      const startDate = new Date(c.startDate);
      const now = new Date();
      const daysPassed = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const progress = Math.min(100, Math.round((daysPassed / c.durationDays) * 100));
      challengeLines.push(`  - ${c.name}: Day ${daysPassed}/${c.durationDays} (${progress}%)`);
      if (c.currentStreak) challengeLines.push(`    Current streak: ${c.currentStreak} day(s)`);
      if (c.totalXP) challengeLines.push(`    XP earned: ${c.totalXP}`);
    }
  } else {
    challengeLines.push('No active challenges.');
  }

  sections.push(`=== ACTIVE CHALLENGES ===\n${challengeLines.join('\n')}`);

  // --- FOCUS & STUDY ---
  const focusLines: string[] = [];
  focusLines.push(`Pomodoro work duration: ${context.pomodoroSettings.workDuration} min`);
  focusLines.push(`Short break: ${context.pomodoroSettings.shortBreakDuration} min`);
  focusLines.push(`Long break: ${context.pomodoroSettings.longBreakDuration} min (every ${context.pomodoroSettings.pomodorosBeforeLongBreak} sessions)`);
  focusLines.push(`Focus minutes today: ${context.stats.focusMinutesToday}`);
  focusLines.push(`Trees planted: ${context.stats.treesPlanted}`);

  sections.push(`=== FOCUS & STUDY ===\n${focusLines.join('\n')}`);

  // --- NOOR'S MEMORY ---
  const memoryLines: string[] = [];
  if (context.memories.length > 0) {
    const groupedMemories: Record<string, AIMemory[]> = {};
    for (const mem of context.memories) {
      if (!groupedMemories[mem.category]) groupedMemories[mem.category] = [];
      groupedMemories[mem.category].push(mem);
    }

    const categoryLabels: Record<string, string> = {
      goal: 'Goals mentioned',
      struggle: 'Known struggles',
      preference: 'Preferences',
      milestone: 'Milestones achieved',
      spiritual: 'Spiritual notes',
      insight: 'Insights',
    };

    for (const [category, memories] of Object.entries(groupedMemories)) {
      const label = categoryLabels[category] || category;
      memoryLines.push(`${label}:`);
      for (const mem of memories) {
        memoryLines.push(`  - ${mem.content} (relevance: ${mem.relevanceScore})`);
      }
    }
  } else {
    memoryLines.push('No stored memories yet (first conversation).');
  }

  sections.push(`=== NOOR'S MEMORY ===\n${memoryLines.join('\n')}`);

  // --- USER MOOD ---
  const moodLines: string[] = [];
  if (context.mood) {
    moodLines.push(`Current mood: ${context.mood}`);
  } else {
    moodLines.push('Mood not set.');
  }

  sections.push(`=== USER MOOD ===\n${moodLines.join('\n')}`);

  return sections.join('\n\n');
};
