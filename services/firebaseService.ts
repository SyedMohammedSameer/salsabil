// services/firebaseService.ts - FIXED VERSION with proper authentication sync
import { Task, Theme, PomodoroSettings, DailyPrayerLog, DailyQuranLog, ChatMessage, PomodoroMode } from '../types';
import { DEFAULT_POMODORO_SETTINGS } from '../constants';
import * as firestore from '../lib/firestore';
import * as localStorage from './localStorageService';
import { onSnapshot, collection, doc, Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
let isInitialized = false;

// Caches
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
  console.log('🔥 Firebase: Setting current user from', currentUserId, 'to', userId);
  
  // If user changed, clean up everything
  if (currentUserId !== userId) {
    console.log('🔥 Firebase: User changed - cleaning up old listeners');
    cleanupAllListeners();
    clearAllCaches();
    isInitialized = false;
  }
  
  currentUserId = userId;
  
  // If we have a new authenticated user, wait a bit for authentication to settle
  if (userId) {
    console.log('🔥 Firebase: Authenticated user detected:', userId);
    // Small delay to ensure Firebase auth is fully ready
    setTimeout(() => {
      initializeForAuthenticatedUser();
    }, 1000);
  } else {
    console.log('🔥 Firebase: No user - will show sample data');
  }
}

function initializeForAuthenticatedUser() {
  if (!currentUserId || isInitialized) {
    console.log('🔥 Firebase: Skipping initialization - no user or already initialized');
    return;
  }
  
  console.log('🔥 Firebase: Initializing for authenticated user:', currentUserId);
  isInitialized = true;
  
  // Force refresh listeners for the authenticated user
  if (tasksUpdateCallback) {
    console.log('🔥 Firebase: Setting up tasks listener for authenticated user');
    setupTasksListener(tasksUpdateCallback);
  }
  if (prayerLogsUpdateCallback) {
    console.log('🔥 Firebase: Setting up prayer logs listener for authenticated user');
    setupPrayerLogsListener(prayerLogsUpdateCallback);
  }
  if (quranLogsUpdateCallback) {
    console.log('🔥 Firebase: Setting up quran logs listener for authenticated user');
    setupQuranLogsListener(quranLogsUpdateCallback);
  }
}

function cleanupAllListeners() {
  console.log('🔥 Firebase: Cleaning up all listeners');
  Object.values(unsubscribeCallbacks).forEach(unsubscribe => {
    if (unsubscribe) {
      unsubscribe();
    }
  });
  unsubscribeCallbacks = {};
}

function clearAllCaches() {
  console.log('🔥 Firebase: Clearing all caches');
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
  console.log('🔥 Firebase: Setting up tasks listener for user:', currentUserId);
  tasksUpdateCallback = callback;
  
  if (!currentUserId) {
    console.log('🔥 Firebase: No user - providing empty tasks array');
    callback([]);
    return;
  }

  try {
    const tasksRef = collection(db, 'users', currentUserId, 'tasks');
    
    // Clean up previous listener
    if (unsubscribeCallbacks.tasks) {
      console.log('🔥 Firebase: Cleaning up previous tasks listener');
      unsubscribeCallbacks.tasks();
    }
    
    console.log('🔥 Firebase: Creating new tasks listener for user:', currentUserId);
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
        
        console.log(`🔥 Firebase: Tasks listener received ${tasks.length} tasks for user ${currentUserId}`);
        callback(tasks);
        
        // Also save to localStorage as backup
        localStorage.saveTasksToLocalStorage(tasks);
      },
      (error) => {
        console.error('🔥 Firebase: Tasks listener error:', error);
        // Fallback to localStorage
        const localTasks = localStorage.loadTasksFromLocalStorage() || [];
        console.log(`🔥 Firebase: Falling back to localStorage with ${localTasks.length} tasks`);
        callback(localTasks);
      }
    );
  } catch (error) {
    console.error('🔥 Firebase: Error setting up tasks listener:', error);
    const localTasks = localStorage.loadTasksFromLocalStorage() || [];
    callback(localTasks);
  }
};

export const loadTasks = async (): Promise<Task[]> => {
  console.log('🔥 Firebase: Loading tasks for user:', currentUserId);
  if (currentUserId) {
    try {
      const tasks = await firestore.getUserTasks(currentUserId);
      console.log(`🔥 Firebase: Loaded ${tasks.length} tasks from Firestore`);
      return tasks;
    } catch (error) {
      console.error('🔥 Firebase: Error loading tasks from Firebase:', error);
    }
  }
  const localTasks = localStorage.loadTasksFromLocalStorage() || [];
  console.log(`🔥 Firebase: Falling back to localStorage with ${localTasks.length} tasks`);
  return localTasks;
};

export const saveTask = async (task: Task): Promise<void> => {
  console.log('🔥 Firebase: Saving task:', task.title, 'for user:', currentUserId);
  if (currentUserId) {
    try {
      await firestore.saveTask(currentUserId, task);
      console.log('🔥 Firebase: Task saved successfully to Firestore');
      // Real-time listener will automatically update the UI
      return;
    } catch (error) {
      console.error('🔥 Firebase: Error saving task to Firebase:', error);
    }
  }
  
  // Fallback to localStorage
  console.log('🔥 Firebase: Falling back to localStorage for task save');
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
  console.log('🔥 Firebase: Deleting task:', taskId, 'for user:', currentUserId);
  if (currentUserId) {
    try {
      await firestore.deleteTask(currentUserId, taskId);
      console.log('🔥 Firebase: Task deleted successfully from Firestore');
      // Real-time listener will automatically update the UI
      return;
    } catch (error) {
      console.error('🔥 Firebase: Error deleting task from Firebase:', error);
    }
  }
  
  // Fallback to localStorage
  console.log('🔥 Firebase: Falling back to localStorage for task delete');
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
  console.log('🔥 Firebase: Setting up prayer logs listener for user:', currentUserId);
  prayerLogsUpdateCallback = callback;
  
  if (!currentUserId) {
    callback([]);
    return;
  }

  try {
    const prayerLogsRef = doc(db, 'users', currentUserId, 'settings', 'prayerLogs');
    
    if (unsubscribeCallbacks.prayerLogs) {
      console.log('🔥 Firebase: Cleaning up previous prayer logs listener');
      unsubscribeCallbacks.prayerLogs();
    }
    
    console.log('🔥 Firebase: Creating new prayer logs listener');
    unsubscribeCallbacks.prayerLogs = onSnapshot(
      prayerLogsRef,
      (doc) => {
        const logs = doc.exists() ? (doc.data().logs || []) : [];
        console.log(`🔥 Firebase: Prayer logs listener received ${logs.length} logs`);
        callback(logs);
        localStorage.savePrayerLogsToLocalStorage(logs);
      },
      (error) => {
        console.error('🔥 Firebase: Prayer logs listener error:', error);
        const localLogs = localStorage.loadPrayerLogsFromLocalStorage();
        callback(localLogs);
      }
    );
  } catch (error) {
    console.error('🔥 Firebase: Error setting up prayer logs listener:', error);
    const localLogs = localStorage.loadPrayerLogsFromLocalStorage();
    callback(localLogs);
  }
};

// ============================================================================
// QURAN LOGS - WITH REAL-TIME LISTENERS  
// ============================================================================

export const setupQuranLogsListener = (callback: DataUpdateCallback<DailyQuranLog[]>): void => {
  console.log('🔥 Firebase: Setting up quran logs listener for user:', currentUserId);
  quranLogsUpdateCallback = callback;
  
  if (!currentUserId) {
    callback([]);
    return;
  }

  try {
    const quranLogsRef = doc(db, 'users', currentUserId, 'settings', 'quranLogs');
    
    if (unsubscribeCallbacks.quranLogs) {
      console.log('🔥 Firebase: Cleaning up previous quran logs listener');
      unsubscribeCallbacks.quranLogs();
    }
    
    console.log('🔥 Firebase: Creating new quran logs listener');
    unsubscribeCallbacks.quranLogs = onSnapshot(
      quranLogsRef,
      (doc) => {
        const logs = doc.exists() ? (doc.data().logs || []) : [];
        console.log(`🔥 Firebase: Quran logs listener received ${logs.length} logs`);
        callback(logs);
        localStorage.saveQuranLogsToLocalStorage(logs);
      },
      (error) => {
        console.error('🔥 Firebase: Quran logs listener error:', error);
        const localLogs = localStorage.loadQuranLogsFromLocalStorage();
        callback(localLogs);
      }
    );
  } catch (error) {
    console.error('🔥 Firebase: Error setting up quran logs listener:', error);
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
  console.log('🔥 Firebase: Loading theme for user:', currentUserId);
  if (currentUserId) {
    try {
      if (!settingsCache) {
        settingsCache = await firestore.getUserSettings(currentUserId);
        console.log('🔥 Firebase: Loaded settings cache:', settingsCache);
      }
      if (settingsCache?.theme) {
        console.log('🔥 Firebase: Using theme from Firebase:', settingsCache.theme);
        return settingsCache.theme;
      }
    } catch (error) {
      console.error('🔥 Firebase: Error loading theme from Firebase:', error);
    }
  }
  const localTheme = localStorage.loadThemeFromLocalStorage();
  console.log('🔥 Firebase: Using theme from localStorage:', localTheme);
  return localTheme;
};

export const saveTheme = async (theme: Theme): Promise<void> => {
  console.log('🔥 Firebase: Saving theme:', theme, 'for user:', currentUserId);
  if (settingsCache) {
    settingsCache.theme = theme;
  } else {
    settingsCache = { theme };
  }

  if (currentUserId) {
    try {
      await firestore.saveUserSettings(currentUserId, { theme });
      console.log('🔥 Firebase: Theme saved to Firestore');
    } catch (error) {
      console.error('🔥 Firebase: Error saving theme to Firebase:', error);
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
  console.log('🔥 Firebase: Loading prayer logs for user:', currentUserId);
  if (currentUserId) {
    try {
      const logs = await firestore.getPrayerLogs(currentUserId);
      console.log(`🔥 Firebase: Loaded ${logs.length} prayer logs from Firestore`);
      return logs;
    } catch (error) {
      console.error('🔥 Firebase: Error loading prayer logs from Firebase:', error);
    }
  }
  const localLogs = localStorage.loadPrayerLogsFromLocalStorage();
  console.log(`🔥 Firebase: Using ${localLogs.length} prayer logs from localStorage`);
  return localLogs;
};

export const savePrayerLogs = async (logs: DailyPrayerLog[]): Promise<void> => {
  console.log('🔥 Firebase: Saving prayer logs for user:', currentUserId);
  if (currentUserId) {
    try {
      await firestore.savePrayerLogs(currentUserId, logs);
      console.log('🔥 Firebase: Prayer logs saved to Firestore');
    } catch (error) {
      console.error('🔥 Firebase: Error saving prayer logs to Firebase:', error);
    }
  }
  localStorage.savePrayerLogsToLocalStorage(logs);
};

export const loadQuranLogs = async (): Promise<DailyQuranLog[]> => {
  console.log('🔥 Firebase: Loading quran logs for user:', currentUserId);
  if (currentUserId) {
    try {
      const logs = await firestore.getQuranLogs(currentUserId);
      console.log(`🔥 Firebase: Loaded ${logs.length} quran logs from Firestore`);
      return logs;
    } catch (error) {
      console.error('🔥 Firebase: Error loading Quran logs from Firebase:', error);
    }
  }
  const localLogs = localStorage.loadQuranLogsFromLocalStorage();
  console.log(`🔥 Firebase: Using ${localLogs.length} quran logs from localStorage`);
  return localLogs;
};

export const saveQuranLogs = async (logs: DailyQuranLog[]): Promise<void> => {
  console.log('🔥 Firebase: Saving quran logs for user:', currentUserId);
  if (currentUserId) {
    try {
      await firestore.saveQuranLogs(currentUserId, logs);
      console.log('🔥 Firebase: Quran logs saved to Firestore');
    } catch (error) {
      console.error('🔥 Firebase: Error saving Quran logs to Firebase:', error);
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
  console.log('🔥 Firebase: Cleaning up firebase service');
  cleanupAllListeners();
  clearAllCaches();
  isInitialized = false;
};