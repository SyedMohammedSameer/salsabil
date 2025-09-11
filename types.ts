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
}

// MODIFY YOUR EXISTING View ENUM TO ADD Garden:
export enum View {
  Planner = 'Planner',
  Calendar = 'Calendar',
  AIAssistant = 'AI Assistant',
  Dashboard = 'Dashboard',
  Pomodoro = 'Pomodoro',
  PrayerTracker = 'Prayer Tracker',
  QuranLog = 'Quran Log',
  Garden = 'Garden',  // <-- ADD THIS LINE
}