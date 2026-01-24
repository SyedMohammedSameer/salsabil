export enum Priority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO string format YYYY-MM-DD. Replaces 'day'.
  startTime?: string; // HH:MM format, optional for timed events
  endTime?: string; // HH:MM format, optional for timed events
  priority: Priority;
  subtasks: Subtask[];
  completedSubtasks: number; // Count of completed subtasks for progress
  completed: boolean;
}

export enum View {
  Planner = 'Planner',
  Calendar = 'Calendar',
  AIAssistant = 'AI Assistant',
  Dashboard = 'Dashboard',
  Pomodoro = 'Pomodoro',
  PrayerTracker = 'Prayer Tracker',
  QuranLog = 'Quran Log',
  Adhkar = 'Adhkar',
  Garden = 'Garden',
  Workouts = 'Workouts',
  Challenges = 'Challenges',
  SoloRoom = 'Solo Room',
}

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

export interface CalendarEvent {
  id:string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: string; // For event-specific color
  taskRef?: string; // Reference to original task ID if it's from a task
  description?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export enum PomodoroMode {
  Work = 'Work',
  ShortBreak = 'ShortBreak',
  LongBreak = 'LongBreak',
}

export interface PomodoroSettings {
  workDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  pomodorosBeforeLongBreak: number;
}

// Prayer Tracker Types
export enum PrayerName {
  Fajr = "Fajr",
  Dhuhr = "Dhuhr",
  Asr = "Asr",
  Maghrib = "Maghrib",
  Isha = "Isha",
  Tahajjud = "Tahajjud"
}

export interface PrayerDetail {
  name: PrayerName;
  fardh?: boolean;     // Completion status for Fardh
  sunnah?: boolean;    // Completion status for Sunnah
  isApplicable: boolean; // e.g. Tahajjud might not be daily for everyone or treated differently
  fardhCount?: number; // e.g. 2 for Fajr, 4 for Dhuhr etc. (Optional, for display)
  sunnahCount?: number; // (Optional, for display)
}

export interface DailyPrayerLog {
  date: string; // YYYY-MM-DD
  prayers: Partial<Record<PrayerName, Pick<PrayerDetail, 'fardh' | 'sunnah'>>>; // Store only completion status
  notes?: string;
}


// Quran Log Types
export interface DailyQuranLog {
  date: string; // YYYY-MM-DD
  readQuran: boolean;
  pagesRead?: number;
  notes?: string;
}

export enum TreeType {
  Work = 'Work',
  Study = 'Study', 
  QuranReading = 'QuranReading',
  Dhikr = 'Dhikr',
  GeneralFocus = 'GeneralFocus'
}

export enum TreeGrowthStage {
  Seed = 'Seed',
  Sprout = 'Sprout', 
  Sapling = 'Sapling',
  YoungTree = 'YoungTree',
  MatureTree = 'MatureTree'
}

export interface Tree {
  id: string;
  type: TreeType;
  plantedAt: Date;
  growthStage: TreeGrowthStage;
  focusMinutes: number;
  isAlive: boolean;
  plantedBy: string; // userId
  plantedByName: string; // display name
  // New fields for tree varieties
  varietyName?: string; // e.g., "Oak Tree", "Cherry Blossom"
  varietyEmoji?: string; // e.g., "🌳", "🌸"
  varietyColor?: string; // e.g., "from-green-500 to-emerald-500"
}

export interface StudyRoom {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  isActive: boolean;
  participantCount: number;
  maxParticipants: number;
  focusDuration: number; // in minutes
  treeType: TreeType;
  currentSessionStart?: Date;
  trees: Tree[];
  tags: string[];
}

export interface RoomParticipant {
  userId: string;
  displayName: string;
  joinedAt: Date;
  isActive: boolean;
  currentFocusStart?: Date;
  totalFocusMinutes: number;
  treesPlanted: number;
  isReady?: boolean;
}

// ===========================
// NEW TYPES FOR MAJOR UPGRADE
// ===========================

// User Settings
export interface UserSettings {
  notificationEnabled: boolean;
  pushEnabled: boolean;
  aiCheckInEnabled: boolean;
  aiCheckInIntervalMinutes: number; // default 120
  quietHours: {
    start: string; // HH:MM format
    end: string; // HH:MM format
    enabled: boolean;
  };
  timezone: string;
  focusMode: {
    enabled: boolean;
  };
  uiDensity: 'compact' | 'standard';
}

// Notifications
export type NotificationType = 'ai' | 'reminder' | 'challenge' | 'workout' | 'system';

export interface Notification {
  id: string;
  uid: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: Date;
  readAt?: Date;
  link?: string;
}

// Push Tokens
export interface PushToken {
  id: string;
  token: string;
  platform: 'web';
  createdAt: Date;
  lastSeenAt: Date;
}

// Workouts
export interface WorkoutEntry {
  id: string;
  date: string; // YYYY-MM-DD
  type: string;
  durationMinutes: number;
  notes?: string;
  completed: boolean;
  createdAt: Date;
}

// Challenges
export interface ChallengeRule {
  id: string;
  label: string;
  required: boolean;
}

export interface Challenge {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  durationDays: number;
  rules: ChallengeRule[];
  active: boolean;
  createdAt: Date;
}

export interface ChallengeDay {
  id: string;
  challengeId: string;
  date: string; // YYYY-MM-DD
  ruleStatus: { [ruleId: string]: boolean };
  completed: boolean;
  updatedAt: Date;
}

// AI Threads
export interface AIMessage {
  role: 'user' | 'ai';
  content: string;
  createdAt: Date;
}

export interface AIThread {
  id: string;
  messages: AIMessage[];
  contextSummary: string;
  updatedAt: Date;
}

// ===========================
// AI PERSONALITY & LEARNING
// ===========================

export type AICommunicationStyle = 'encouraging' | 'direct' | 'casual' | 'formal';
export type AINotificationTone = 'motivational' | 'reminder' | 'celebration' | 'gentle_nudge';

export interface AIPersonalityProfile {
  communicationStyle: AICommunicationStyle;
  preferredNotificationTimes: string[]; // HH:MM format
  engagementRate: number; // 0-1, percentage of notifications user engages with
  lastInteraction: Date;
  totalInteractions: number;
  userPreferences: {
    likesEmojis: boolean;
    prefersShortMessages: boolean;
    respondsToMotivation: boolean;
    respondsToReminders: boolean;
  };
  learningData: {
    mostProductiveTime: string; // e.g., "morning", "afternoon", "evening", "night"
    averageTaskCompletionRate: number;
    prayerConsistencyScore: number; // 0-100
    quranReadingStreak: number;
    focusSessionsPerWeek: number;
  };
}

export interface AIInteraction {
  id: string;
  type: 'notification' | 'chat' | 'suggestion' | 'check_in';
  aiMessage: string;
  userEngaged: boolean; // Did user click/respond?
  userSentiment?: 'positive' | 'neutral' | 'negative'; // Inferred from response
  timestamp: Date;
  contextSnapshot: {
    tasksCompleted: number;
    prayersCompleted: number;
    quranPagesRead: number;
    focusMinutesToday: number;
  };
}

export interface AINotificationContext {
  userId: string;
  currentTime: string; // HH:MM
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  userStats: {
    // Today's progress
    tasksTotal: number;
    tasksCompleted: number;
    prayersTotal: number;
    prayersCompleted: number;
    quranPagesReadToday: number;
    focusMinutesTotal: number;

    // Week/month trends
    weeklyTaskCompletionRate: number;
    weeklyPrayerRate: number;
    currentQuranStreak: number;
    treesPlantedThisWeek: number;

    // Patterns
    hasUpcomingTasks: boolean;
    hasMissedPrayers: boolean;
    isOnStreak: boolean;
    lastCheckInResponse?: string;
  };
  userProfile: AIPersonalityProfile;
}

export interface AIGeneratedNotification {
  title: string;
  body: string;
  tone: AINotificationTone;
  link?: string;
  reasoning?: string; // Why AI generated this message (for debugging)
}

