// Updated services/firebaseService.ts with Pomodoro session support
import { Task, Theme, PomodoroSettings, DailyPrayerLog, DailyQuranLog, ChatMessage, PomodoroMode } from '../types';
import { DEFAULT_POMODORO_SETTINGS } from '../constants';
import * as firestore from '../lib/firestore';
import * as localStorage from './localStorageService';

// Add FocusSession interface
export interface FocusSession {
  id: string;
  type: PomodoroMode;
  duration: number;
  completedAt: Date;
  interrupted: boolean;
  actualTimeSpent: number;
}

// Hybrid service that uses Firebase when user is logged in, localStorage as fallback
let currentUserId: string | null = null;
let saveTimeout: NodeJS.Timeout | null = null;
let prayerLogSaveTimeout: NodeJS.Timeout | null = null;
let chatSaveTimeout: NodeJS.Timeout | null = null;

export function setCurrentUser(userId: string | null) {
  currentUserId = userId;
}

// Tasks
export const loadTasks = async (): Promise<Task[]> => {
  if (currentUserId) {
    try {
      return await firestore.getUserTasks(currentUserId);
    } catch (error) {
      console.error('Error loading tasks from Firebase, falling back to localStorage:', error);
    }
  }
  return localStorage.loadTasksFromLocalStorage() || [];
};

export const saveTasks = async (tasks: Task[]): Promise<void> => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(async () => {
    if (currentUserId) {
      try {
        await Promise.all(tasks.map(task => firestore.saveTask(currentUserId!, task)));
        return;
      } catch (error) {
        console.error('Error saving tasks to Firebase, falling back to localStorage:', error);
      }
    }
    localStorage.saveTasksToLocalStorage(tasks);
  }, 1000);
};

export const saveTask = async (task: Task): Promise<void> => {
  if (currentUserId) {
    try {
      await firestore.saveTask(currentUserId, task);
      return;
    } catch (error) {
      console.error('Error saving task to Firebase:', error);
    }
  }
  const tasks = localStorage.loadTasksFromLocalStorage() || [];
  const existingIndex = tasks.findIndex(t => t.id === task.id);
  if (existingIndex >= 0) {
    tasks[existingIndex] = task;
  } else {
    tasks.push(task);
  }
  localStorage.saveTasksToLocalStorage(tasks);
};

export const deleteTask = async (taskId: string): Promise<void> => {
  if (currentUserId) {
    try {
      await firestore.deleteTask(currentUserId, taskId);
      return;
    } catch (error) {
      console.error('Error deleting task from Firebase:', error);
    }
  }
  const tasks = localStorage.loadTasksFromLocalStorage() || [];
  const filteredTasks = tasks.filter(t => t.id !== taskId);
  localStorage.saveTasksToLocalStorage(filteredTasks);
};

// Theme
export const loadTheme = async (): Promise<Theme> => {
  if (currentUserId) {
    try {
      const settings = await firestore.getUserSettings(currentUserId);
      if (settings?.theme) {
        return settings.theme;
      }
    } catch (error) {
      console.error('Error loading theme from Firebase:', error);
    }
  }
  return localStorage.loadThemeFromLocalStorage();
};

export const saveTheme = async (theme: Theme): Promise<void> => {
  if (currentUserId) {
    try {
      await firestore.saveUserSettings(currentUserId, { theme });
    } catch (error) {
      console.error('Error saving theme to Firebase:', error);
    }
  }
  localStorage.saveThemeToLocalStorage(theme);
};

// Pomodoro Settings
export const loadPomodoroSettings = async (): Promise<PomodoroSettings> => {
  if (currentUserId) {
    try {
      const settings = await firestore.getUserSettings(currentUserId);
      if (settings?.pomodoroSettings) {
        return { ...DEFAULT_POMODORO_SETTINGS, ...settings.pomodoroSettings };
      }
    } catch (error) {
      console.error('Error loading pomodoro settings from Firebase:', error);
    }
  }
  return localStorage.loadPomodoroSettingsFromLocalStorage();
};

export const savePomodoroSettings = async (settings: PomodoroSettings): Promise<void> => {
  if (currentUserId) {
    try {
      await firestore.saveUserSettings(currentUserId, { pomodoroSettings: settings });
    } catch (error) {
      console.error('Error saving pomodoro settings to Firebase:', error);
    }
  }
  localStorage.savePomodoroSettingsToLocalStorage(settings);
};

// Pomodoro Sessions (New)
export const loadPomodoroSessions = async (): Promise<FocusSession[]> => {
  if (currentUserId) {
    try {
      return await firestore.getPomodoroSessions(currentUserId);
    } catch (error) {
      console.error('Error loading pomodoro sessions from Firebase:', error);
    }
  }
  return localStorage.loadPomodoroSessionsFromLocalStorage();
};

export const savePomodoroSession = async (session: FocusSession): Promise<void> => {
  if (currentUserId) {
    try {
      await firestore.savePomodoroSession(currentUserId, session);
    } catch (error) {
      console.error('Error saving pomodoro session to Firebase:', error);
    }
  }
  localStorage.savePomodoroSessionToLocalStorage(session);
};

export const savePomodoroSessions = async (sessions: FocusSession[]): Promise<void> => {
  if (currentUserId) {
    try {
      await firestore.savePomodoroSessions(currentUserId, sessions);
    } catch (error) {
      console.error('Error saving pomodoro sessions to Firebase:', error);
    }
  }
  localStorage.savePomodoroSessionsToLocalStorage(sessions);
};

// Prayer Logs
export const loadPrayerLogs = async (): Promise<DailyPrayerLog[]> => {
  if (currentUserId) {
    try {
      return await firestore.getPrayerLogs(currentUserId);
    } catch (error) {
      console.error('Error loading prayer logs from Firebase:', error);
    }
  }
  return localStorage.loadPrayerLogsFromLocalStorage();
};

export const savePrayerLogs = async (logs: DailyPrayerLog[]): Promise<void> => {
  if (prayerLogSaveTimeout) {
    clearTimeout(prayerLogSaveTimeout);
  }
  
  prayerLogSaveTimeout = setTimeout(async () => {
    if (currentUserId) {
      try {
        await firestore.savePrayerLogs(currentUserId, logs);
      } catch (error) {
        console.error('Error saving prayer logs to Firebase:', error);
      }
    }
    localStorage.savePrayerLogsToLocalStorage(logs);
  }, 1000);
};

// Quran Logs
export const loadQuranLogs = async (): Promise<DailyQuranLog[]> => {
  if (currentUserId) {
    try {
      return await firestore.getQuranLogs(currentUserId);
    } catch (error) {
      console.error('Error loading Quran logs from Firebase:', error);
    }
  }
  return localStorage.loadQuranLogsFromLocalStorage();
};

export const saveQuranLogs = async (logs: DailyQuranLog[]): Promise<void> => {
  if (currentUserId) {
    try {
      await firestore.saveQuranLogs(currentUserId, logs);
    } catch (error) {
      console.error('Error saving Quran logs to Firebase:', error);
    }
  }
  localStorage.saveQuranLogsToLocalStorage(logs);
};

// Chat History
export const loadChatHistory = async (): Promise<ChatMessage[]> => {
  if (currentUserId) {
    try {
      return await firestore.getChatHistory(currentUserId);
    } catch (error) {
      console.error('Error loading chat history from Firebase:', error);
    }
  }
  return localStorage.loadChatHistoryFromLocalStorage();
};

export const saveChatHistory = async (messages: ChatMessage[]): Promise<void> => {
  if (chatSaveTimeout) {
    clearTimeout(chatSaveTimeout);
  }
  
  chatSaveTimeout = setTimeout(async () => {
    if (currentUserId) {
      try {
        await firestore.saveChatHistory(currentUserId, messages);
      } catch (error) {
        console.error('Error saving chat history to Firebase:', error);
      }
    }
    localStorage.saveChatHistoryToLocalStorage(messages);
  }, 2000);
};

export const clearChatHistory = async (): Promise<void> => {
  if (currentUserId) {
    try {
      await firestore.clearChatHistory(currentUserId);
    } catch (error) {
      console.error('Error clearing chat history from Firebase:', error);
    }
  }
  localStorage.clearChatHistoryFromLocalStorage();
};