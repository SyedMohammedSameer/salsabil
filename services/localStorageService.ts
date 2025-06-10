// Updated services/localStorageService.ts with Pomodoro session support
import { Task, Theme, PomodoroSettings, DailyPrayerLog, DailyQuranLog, ChatMessage, PomodoroMode } from '../types';
import { DEFAULT_POMODORO_SETTINGS } from '../constants';

// Add FocusSession interface
export interface FocusSession {
  id: string;
  type: PomodoroMode;
  duration: number;
  completedAt: Date;
  interrupted: boolean;
  actualTimeSpent: number;
}

const TASKS_STORAGE_KEY = 'focusFlowTasks';
const THEME_STORAGE_KEY = 'salsabilTheme';
const POMODORO_SETTINGS_KEY = 'focusFlowPomodoroSettings';
const POMODORO_SESSIONS_KEY = 'focusFlowPomodoroSessions';
const PRAYER_LOGS_KEY = 'focusFlowPrayerLogs';
const QURAN_LOGS_KEY = 'focusFlowQuranLogs';
const CHAT_HISTORY_KEY = 'focusFlowChatHistory';

// Tasks
export const loadTasksFromLocalStorage = (): Task[] | null => {
  try {
    const serializedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
    if (serializedTasks === null) {
      return null;
    }
    return JSON.parse(serializedTasks);
  } catch (error) {
    console.error("Could not load tasks from local storage", error);
    return null;
  }
};

export const saveTasksToLocalStorage = (tasks: Task[]): void => {
  try {
    const serializedTasks = JSON.stringify(tasks);
    localStorage.setItem(TASKS_STORAGE_KEY, serializedTasks);
  } catch (error) {
    console.error("Could not save tasks to local storage", error);
  }
};

// Theme
export const loadThemeFromLocalStorage = (): Theme => {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (storedTheme) {
      return storedTheme;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return Theme.Dark;
    }
    return Theme.Light;
  } catch (error) {
    console.error("Could not load theme from local storage", error);
    return Theme.Light;
  }
};

export const saveThemeToLocalStorage = (theme: Theme): void => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.error("Could not save theme to local storage", error);
  }
};

// Pomodoro Settings
export const loadPomodoroSettingsFromLocalStorage = (): PomodoroSettings => {
  try {
    const serializedSettings = localStorage.getItem(POMODORO_SETTINGS_KEY);
    if (serializedSettings === null) {
      return DEFAULT_POMODORO_SETTINGS;
    }
    return { ...DEFAULT_POMODORO_SETTINGS, ...JSON.parse(serializedSettings) };
  } catch (error) {
    console.error("Could not load pomodoro settings from local storage", error);
    return DEFAULT_POMODORO_SETTINGS;
  }
};

export const savePomodoroSettingsToLocalStorage = (settings: PomodoroSettings): void => {
  try {
    const serializedSettings = JSON.stringify(settings);
    localStorage.setItem(POMODORO_SETTINGS_KEY, serializedSettings);
  } catch (error) {
    console.error("Could not save pomodoro settings to local storage", error);
  }
};

// Pomodoro Sessions (New)
export const loadPomodoroSessionsFromLocalStorage = (): FocusSession[] => {
  try {
    const serializedSessions = localStorage.getItem(POMODORO_SESSIONS_KEY);
    if (serializedSessions === null) {
      return [];
    }
    const parsed = JSON.parse(serializedSessions);
    // Convert timestamp strings back to Date objects
    return parsed.map((session: any) => ({
      ...session,
      completedAt: new Date(session.completedAt)
    }));
  } catch (error) {
    console.error("Could not load pomodoro sessions from local storage", error);
    return [];
  }
};

export const savePomodoroSessionsToLocalStorage = (sessions: FocusSession[]): void => {
  try {
    // Keep only the last 100 sessions in localStorage to avoid bloat
    const recentSessions = sessions.slice(-100);
    // Convert Date objects to strings for storage
    const serialized = recentSessions.map(session => ({
      ...session,
      completedAt: session.completedAt.toISOString()
    }));
    const serializedSessions = JSON.stringify(serialized);
    localStorage.setItem(POMODORO_SESSIONS_KEY, serializedSessions);
  } catch (error) {
    console.error("Could not save pomodoro sessions to local storage", error);
  }
};

export const savePomodoroSessionToLocalStorage = (session: FocusSession): void => {
  try {
    const existingSessions = loadPomodoroSessionsFromLocalStorage();
    const updatedSessions = [session, ...existingSessions].slice(0, 100); // Keep only last 100
    savePomodoroSessionsToLocalStorage(updatedSessions);
  } catch (error) {
    console.error("Could not save pomodoro session to local storage", error);
  }
};

// Prayer Logs
export const loadPrayerLogsFromLocalStorage = (): DailyPrayerLog[] => {
  try {
    const serializedLogs = localStorage.getItem(PRAYER_LOGS_KEY);
    if (serializedLogs === null) {
      return [];
    }
    return JSON.parse(serializedLogs);
  } catch (error) {
    console.error("Could not load prayer logs from local storage", error);
    return [];
  }
};

export const savePrayerLogsToLocalStorage = (logs: DailyPrayerLog[]): void => {
  try {
    const serializedLogs = JSON.stringify(logs);
    localStorage.setItem(PRAYER_LOGS_KEY, serializedLogs);
  } catch (error) {
    console.error("Could not save prayer logs to local storage", error);
  }
};

// Quran Logs
export const loadQuranLogsFromLocalStorage = (): DailyQuranLog[] => {
  try {
    const serializedLogs = localStorage.getItem(QURAN_LOGS_KEY);
    if (serializedLogs === null) {
      return [];
    }
    return JSON.parse(serializedLogs);
  } catch (error) {
    console.error("Could not load Quran logs from local storage", error);
    return [];
  }
};

export const saveQuranLogsToLocalStorage = (logs: DailyQuranLog[]): void => {
  try {
    const serializedLogs = JSON.stringify(logs);
    localStorage.setItem(QURAN_LOGS_KEY, serializedLogs);
  } catch (error) {
    console.error("Could not save Quran logs to local storage", error);
  }
};

// Chat History
export const loadChatHistoryFromLocalStorage = (): ChatMessage[] => {
  try {
    const serializedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
    if (serializedHistory === null) {
      return [];
    }
    const parsed = JSON.parse(serializedHistory);
    // Convert timestamp strings back to Date objects
    return parsed.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
  } catch (error) {
    console.error("Could not load chat history from local storage", error);
    return [];
  }
};

export const saveChatHistoryToLocalStorage = (messages: ChatMessage[]): void => {
  try {
    // Keep only the last 50 messages in localStorage to avoid bloat
    const recentMessages = messages.slice(-50);
    // Convert Date objects to strings for storage
    const serialized = recentMessages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp.toISOString()
    }));
    const serializedHistory = JSON.stringify(serialized);
    localStorage.setItem(CHAT_HISTORY_KEY, serializedHistory);
  } catch (error) {
    console.error("Could not save chat history to local storage", error);
  }
};

export const clearChatHistoryFromLocalStorage = (): void => {
  try {
    localStorage.removeItem(CHAT_HISTORY_KEY);
  } catch (error) {
    console.error("Could not clear chat history from local storage", error);
  }
};