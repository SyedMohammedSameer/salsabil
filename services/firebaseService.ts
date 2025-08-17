// services/firebaseService.ts - FIXED VERSION with real-time syncing
import { Task, Theme, PomodoroSettings, DailyPrayerLog, DailyQuranLog, ChatMessage, PomodoroMode } from '../types';
import { DEFAULT_POMODORO_SETTINGS } from '../constants';
import * as firestore from '../lib/firestore';
import * as localStorage from './localStorageService';
import { onSnapshot, collection, doc, Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Add FocusSession interface
export interface FocusSession {
  id: string;
  type: PomodoroMode;
  duration: number;
  completedAt: Date;
  interrupted: boolean;
  actualTimeSpent: number;
}

// Real-time listener management
let currentUserId: string | null = null;
let unsubscribeCallbacks: { [key: string]: Unsubscribe } = {};

// Clear all caches and listeners
let settingsCache: { theme?: Theme; pomodoroSettings?: PomodoroSettings } | null = null;
let sessionsCache: FocusSession[] = [];
let sessionsCacheExpiry: number = 0;

// Callback functions for real-time updates
type DataUpdateCallback<T> = (data: T) => void;
let tasksUpdateCallback: DataUpdateCallback<Task[]> | null = null;
let prayerLogsUpdateCallback: DataUpdateCallback<DailyPrayerLog[]> | null = null;
let quranLogsUpdateCallback: DataUpdateCallback<DailyQuranLog[]> | null = null;
let chatHistoryUpdateCallback: DataUpdateCallback<ChatMessage[]> | null = null;

export function setCurrentUser(userId: string | null) {
  // Clean up previous user's listeners
  if (currentUserId !== userId) {
    cleanupAllListeners();
    clearAllCaches();
  }
  
  currentUserId = userId;
  console.log('Firebase service: User changed to:', userId ? 'authenticated' : 'anonymous');
}

function cleanupAllListeners() {
  Object.values(unsubscribeCallbacks).forEach(unsubscribe => {
    if (unsubscribe) {
      unsubscribe();
    }
  });
  unsubscribeCallbacks = {};
}

function clearAllCaches() {
  settingsCache = null;
  sessionsCache = [];
  sessionsCacheExpiry = 0;
  tasksUpdateCallback = null;
  prayerLogsUpdateCallback = null;
  quranLogsUpdateCallback = null;
  chatHistoryUpdateCallback = null;
}

// ============================================================================
// TASKS - WITH REAL-TIME LISTENERS
// ============================================================================

export const setupTasksListener = (callback: DataUpdateCallback<Task[]>): void => {
  tasksUpdateCallback = callback;
  
  if (!currentUserId) {
    // No user - provide empty array or sample tasks based on your logic
    callback([]);
    return;
  }

  try {
    const tasksRef = collection(db, 'users', currentUserId, 'tasks');
    
    // Clean up previous listener
    if (unsubscribeCallbacks.tasks) {
      unsubscribeCallbacks.tasks();
    }
    
    unsubscribeCallbacks.tasks = onSnapshot(
      tasksRef,
      (snapshot) => {
        const tasks: Task[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          tasks.push({
            id: doc.id,
            title: data.title,
            description: data.description,
            date: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
            priority: data.priority,
            subtasks: data.subtasks || [],
            completedSubtasks: data.completedSubtasks || 0,
            completed: data.completed || false
          });
        });
        
        console.log(`Firebase: Received ${tasks.length} tasks for user ${currentUserId}`);
        callback(tasks);
        
        // Also save to localStorage as backup
        localStorage.saveTasksToLocalStorage(tasks);
      },
      (error) => {
        console.error('Firebase tasks listener error:', error);
        // Fallback to localStorage
        const localTasks = localStorage.loadTasksFromLocalStorage() || [];
        callback(localTasks);
      }
    );
  } catch (error) {
    console.error('Error setting up tasks listener:', error);
    const localTasks = localStorage.loadTasksFromLocalStorage() || [];
    callback(localTasks);
  }
};

export const loadTasks = async (): Promise<Task[]> => {
  // This is now mainly for initial load - real-time updates come through listener
  if (currentUserId) {
    try {
      return await firestore.getUserTasks(currentUserId);
    } catch (error) {
      console.error('Error loading tasks from Firebase:', error);
    }
  }
  return localStorage.loadTasksFromLocalStorage() || [];
};

export const saveTask = async (task: Task): Promise<void> => {
  if (currentUserId) {
    try {
      await firestore.saveTask(currentUserId, task);
      // Real-time listener will automatically update the UI
      return;
    } catch (error) {
      console.error('Error saving task to Firebase:', error);
    }
  }
  
  // Fallback to localStorage
  const tasks = localStorage.loadTasksFromLocalStorage() || [];
  const existingIndex = tasks.findIndex(t => t.id === task.id);
  if (existingIndex >= 0) {
    tasks[existingIndex] = task;
  } else {
    tasks.push(task);
  }
  localStorage.saveTasksToLocalStorage(tasks);
  
  // Notify callback if available
  if (tasksUpdateCallback) {
    tasksUpdateCallback(tasks);
  }
};

export const deleteTask = async (taskId: string): Promise<void> => {
  if (currentUserId) {
    try {
      await firestore.deleteTask(currentUserId, taskId);
      // Real-time listener will automatically update the UI
      return;
    } catch (error) {
      console.error('Error deleting task from Firebase:', error);
    }
  }
  
  // Fallback to localStorage
  const tasks = localStorage.loadTasksFromLocalStorage() || [];
  const filteredTasks = tasks.filter(t => t.id !== taskId);
  localStorage.saveTasksToLocalStorage(filteredTasks);
  
  // Notify callback if available
  if (tasksUpdateCallback) {
    tasksUpdateCallback(filteredTasks);
  }
};

// ============================================================================
// PRAYER LOGS - WITH REAL-TIME LISTENERS
// ============================================================================

export const setupPrayerLogsListener = (callback: DataUpdateCallback<DailyPrayerLog[]>): void => {
  prayerLogsUpdateCallback = callback;
  
  if (!currentUserId) {
    callback([]);
    return;
  }

  try {
    const prayerLogsRef = doc(db, 'users', currentUserId, 'settings', 'prayerLogs');
    
    if (unsubscribeCallbacks.prayerLogs) {
      unsubscribeCallbacks.prayerLogs();
    }
    
    unsubscribeCallbacks.prayerLogs = onSnapshot(
      prayerLogsRef,
      (doc) => {
        const logs = doc.exists() ? (doc.data().logs || []) : [];
        console.log(`Firebase: Received ${logs.length} prayer logs`);
        callback(logs);
        localStorage.savePrayerLogsToLocalStorage(logs);
      },
      (error) => {
        console.error('Firebase prayer logs listener error:', error);
        const localLogs = localStorage.loadPrayerLogsFromLocalStorage();
        callback(localLogs);
      }
    );
  } catch (error) {
    console.error('Error setting up prayer logs listener:', error);
    const localLogs = localStorage.loadPrayerLogsFromLocalStorage();
    callback(localLogs);
  }
};

// ============================================================================
// QURAN LOGS - WITH REAL-TIME LISTENERS  
// ============================================================================

export const setupQuranLogsListener = (callback: DataUpdateCallback<DailyQuranLog[]>): void => {
  quranLogsUpdateCallback = callback;
  
  if (!currentUserId) {
    callback([]);
    return;
  }

  try {
    const quranLogsRef = doc(db, 'users', currentUserId, 'settings', 'quranLogs');
    
    if (unsubscribeCallbacks.quranLogs) {
      unsubscribeCallbacks.quranLogs();
    }
    
    unsubscribeCallbacks.quranLogs = onSnapshot(
      quranLogsRef,
      (doc) => {
        const logs = doc.exists() ? (doc.data().logs || []) : [];
        console.log(`Firebase: Received ${logs.length} quran logs`);
        callback(logs);
        localStorage.saveQuranLogsToLocalStorage(logs);
      },
      (error) => {
        console.error('Firebase quran logs listener error:', error);
        const localLogs = localStorage.loadQuranLogsFromLocalStorage();
        callback(localLogs);
      }
    );
  } catch (error) {
    console.error('Error setting up quran logs listener:', error);
    const localLogs = localStorage.loadQuranLogsFromLocalStorage();
    callback(localLogs);
  }
};

// ============================================================================
// LEGACY FUNCTIONS (maintained for compatibility)
// ============================================================================

export const saveTasks = async (tasks: Task[]): Promise<void> => {
  if (currentUserId) {
    try {
      await Promise.all(tasks.map(task => firestore.saveTask(currentUserId!, task)));
      return;
    } catch (error) {
      console.error('Error saving tasks to Firebase:', error);
    }
  }
  localStorage.saveTasksToLocalStorage(tasks);
};

export const loadTheme = async (): Promise<Theme> => {
  if (currentUserId) {
    try {
      if (!settingsCache) {
        settingsCache = await firestore.getUserSettings(currentUserId);
      }
      if (settingsCache?.theme) {
        return settingsCache.theme;
      }
    } catch (error) {
      console.error('Error loading theme from Firebase:', error);
    }
  }
  return localStorage.loadThemeFromLocalStorage();
};

export const saveTheme = async (theme: Theme): Promise<void> => {
  if (settingsCache) {
    settingsCache.theme = theme;
  } else {
    settingsCache = { theme };
  }

  if (currentUserId) {
    try {
      await firestore.saveUserSettings(currentUserId, { theme });
    } catch (error) {
      console.error('Error saving theme to Firebase:', error);
    }
  }
  localStorage.saveThemeToLocalStorage(theme);
};

export const loadPomodoroSettings = async (): Promise<PomodoroSettings> => {
  if (currentUserId) {
    try {
      if (!settingsCache) {
        settingsCache = await firestore.getUserSettings(currentUserId);
      }
      if (settingsCache?.pomodoroSettings) {
        return { ...DEFAULT_POMODORO_SETTINGS, ...settingsCache.pomodoroSettings };
      }
    } catch (error) {
      console.error('Error loading pomodoro settings from Firebase:', error);
    }
  }
  return localStorage.loadPomodoroSettingsFromLocalStorage();
};

export const savePomodoroSettings = async (settings: PomodoroSettings): Promise<void> => {
  if (settingsCache) {
    settingsCache.pomodoroSettings = settings;
  } else {
    settingsCache = { pomodoroSettings: settings };
  }

  if (currentUserId) {
    try {
      await firestore.saveUserSettings(currentUserId, { pomodoroSettings: settings });
    } catch (error) {
      console.error('Error saving pomodoro settings to Firebase:', error);
    }
  }
  localStorage.savePomodoroSettingsToLocalStorage(settings);
};

export const loadPomodoroSessions = async (): Promise<FocusSession[]> => {
  const now = Date.now();
  
  if (sessionsCache.length > 0 && now < sessionsCacheExpiry) {
    return sessionsCache;
  }

  if (currentUserId) {
    try {
      const sessions = await firestore.getPomodoroSessions(currentUserId);
      sessionsCache = sessions;
      sessionsCacheExpiry = now + (5 * 60 * 1000);
      return sessions;
    } catch (error) {
      console.error('Error loading pomodoro sessions from Firebase:', error);
    }
  }
  
  const localSessions = localStorage.loadPomodoroSessionsFromLocalStorage();
  sessionsCache = localSessions;
  sessionsCacheExpiry = now + (5 * 60 * 1000);
  return localSessions;
};

export const savePomodoroSession = async (session: FocusSession): Promise<void> => {
  sessionsCache = [session, ...sessionsCache].slice(0, 100);
  
  if (currentUserId) {
    try {
      await firestore.savePomodoroSession(currentUserId, session);
    } catch (error) {
      console.error('Failed to save session to Firebase:', error);
    }
  }
  
  localStorage.savePomodoroSessionToLocalStorage(session);
};

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
  if (currentUserId) {
    try {
      await firestore.savePrayerLogs(currentUserId, logs);
    } catch (error) {
      console.error('Error saving prayer logs to Firebase:', error);
    }
  }
  localStorage.savePrayerLogsToLocalStorage(logs);
};

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
  if (currentUserId) {
    try {
      await firestore.saveChatHistory(currentUserId, messages);
    } catch (error) {
      console.error('Error saving chat history to Firebase:', error);
    }
  }
  localStorage.saveChatHistoryToLocalStorage(messages);
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

// Cleanup function to be called when app unmounts
export const cleanup = (): void => {
  cleanupAllListeners();
  clearAllCaches();
};