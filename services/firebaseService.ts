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

// ============================================================================
// REAL-TIME LISTENERS
// ============================================================================

/**
 * Sets up a real-time listener for user tasks.
 * @param userId - The ID of the authenticated user.
 * @param callback - The function to call with updated tasks.
 * @returns An unsubscribe function to clean up the listener.
 */
export const setupTasksListener = (userId: string, callback: (tasks: Task[]) => void): Unsubscribe => {
  console.log(`🔥 Firebase: Setting up tasks listener for user: ${userId}`);
  const tasksRef = collection(db, 'users', userId, 'tasks');
  
  const unsubscribe = onSnapshot(tasksRef, (snapshot) => {
    const tasks: Task[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));
    console.log(`🔥 Firebase: Tasks listener received ${tasks.length} tasks.`);
    callback(tasks);
    localStorage.saveTasksToLocalStorage(tasks); // Backup to local storage
  }, (error) => {
    console.error('🔥 Firebase: Tasks listener error:', error);
    // Fallback to local storage on error
    const localTasks = localStorage.loadTasksFromLocalStorage() || [];
    callback(localTasks);
  });

  return unsubscribe;
};

/**
 * Sets up a real-time listener for prayer logs.
 * @param userId - The ID of the authenticated user.
 * @param callback - The function to call with updated prayer logs.
 * @returns An unsubscribe function.
 */
export const setupPrayerLogsListener = (userId: string, callback: (logs: DailyPrayerLog[]) => void): Unsubscribe => {
    console.log(`🔥 Firebase: Setting up prayer logs listener for user: ${userId}`);
    const prayerLogsRef = doc(db, 'users', userId, 'settings', 'prayerLogs');
    
    return onSnapshot(prayerLogsRef, (doc) => {
        const logs = doc.exists() ? (doc.data().logs || []) : [];
        console.log(`🔥 Firebase: Prayer logs listener received ${logs.length} logs`);
        callback(logs);
        localStorage.savePrayerLogsToLocalStorage(logs);
    }, (error) => {
        console.error('🔥 Firebase: Prayer logs listener error:', error);
        callback(localStorage.loadPrayerLogsFromLocalStorage());
    });
};

/**
 * Sets up a real-time listener for Quran logs.
 * @param userId - The ID of the authenticated user.
 * @param callback - The function to call with updated Quran logs.
 * @returns An unsubscribe function.
 */
export const setupQuranLogsListener = (userId: string, callback: (logs: DailyQuranLog[]) => void): Unsubscribe => {
    console.log(`🔥 Firebase: Setting up Quran logs listener for user: ${userId}`);
    const quranLogsRef = doc(db, 'users', userId, 'settings', 'quranLogs');

    return onSnapshot(quranLogsRef, (doc) => {
        const logs = doc.exists() ? (doc.data().logs || []) : [];
        console.log(`🔥 Firebase: Quran logs listener received ${logs.length} logs`);
        callback(logs);
        localStorage.saveQuranLogsToLocalStorage(logs);
    }, (error) => {
        console.error('🔥 Firebase: Quran logs listener error:', error);
        callback(localStorage.loadQuranLogsFromLocalStorage());
    });
};


// ============================================================================
// DATA MUTATION FUNCTIONS (Create, Update, Delete)
// ============================================================================

export const saveTask = async (userId: string, task: Task): Promise<void> => {
  if (!userId) {
    console.warn('🔥 Firebase: No user ID provided, saving task to localStorage only.');
    // Fallback to localStorage
    const tasks = localStorage.loadTasksFromLocalStorage() || [];
    const existingIndex = tasks.findIndex(t => t.id === task.id);
    if (existingIndex >= 0) {
      tasks[existingIndex] = task;
    } else {
      tasks.push(task);
    }
    localStorage.saveTasksToLocalStorage(tasks);
    return;
  }
  await firestore.saveTask(userId, task);
};

export const deleteTask = async (userId: string, taskId: string): Promise<void> => {
    if (!userId) {
        console.warn('🔥 Firebase: No user ID provided, deleting task from localStorage only.');
        const tasks = localStorage.loadTasksFromLocalStorage() || [];
        const filteredTasks = tasks.filter(t => t.id !== taskId);
        localStorage.saveTasksToLocalStorage(filteredTasks);
        return;
    }
    await firestore.deleteTask(userId, taskId);
};


// ============================================================================
// ONE-OFF DATA FETCHING & SAVING (for settings, etc.)
// ============================================================================

export const loadTheme = async (userId: string | null): Promise<Theme> => {
  if (userId) {
    const settings = await firestore.getUserSettings(userId);
    if (settings?.theme) {
      return settings.theme;
    }
  }
  return localStorage.loadThemeFromLocalStorage();
};

export const saveTheme = async (userId: string | null, theme: Theme): Promise<void> => {
  localStorage.saveThemeToLocalStorage(theme); // Save locally immediately
  if (userId) {
    await firestore.saveUserSettings(userId, { theme });
  }
};

export const loadPomodoroSettings = async (userId: string | null): Promise<PomodoroSettings> => {
    if (userId) {
        const settings = await firestore.getUserSettings(userId);
        if (settings?.pomodoroSettings) {
            return { ...DEFAULT_POMODORO_SETTINGS, ...settings.pomodoroSettings };
        }
    }
    return localStorage.loadPomodoroSettingsFromLocalStorage();
};

export const savePomodoroSettings = async (userId: string | null, settings: PomodoroSettings): Promise<void> => {
    localStorage.savePomodoroSettingsToLocalStorage(settings);
    if (userId) {
        await firestore.saveUserSettings(userId, { pomodoroSettings: settings });
    }
};

export const loadChatHistory = async (userId: string | null): Promise<ChatMessage[]> => {
    if (userId) {
        return await firestore.getChatHistory(userId);
    }
    return localStorage.loadChatHistoryFromLocalStorage();
};

export const saveChatHistory = async (userId: string | null, messages: ChatMessage[]): Promise<void> => {
    localStorage.saveChatHistoryToLocalStorage(messages);
    if (userId) {
        await firestore.saveChatHistory(userId, messages);
    }
};

// You can add other functions for Pomodoro sessions, prayer logs, etc. following the same pattern.
// Example:
export const savePrayerLogs = async (userId: string | null, logs: DailyPrayerLog[]): Promise<void> => {
    localStorage.savePrayerLogsToLocalStorage(logs);
    if (userId) {
        await firestore.savePrayerLogs(userId, logs);
    }
};

export const saveQuranLogs = async (userId: string | null, logs: DailyQuranLog[]): Promise<void> => {
    localStorage.saveQuranLogsToLocalStorage(logs);
    if (userId) {
        await firestore.saveQuranLogs(userId, logs);
    }
};

export const loadPrayerLogs = async (userId: string | null): Promise<DailyPrayerLog[]> => {
    if (userId) {
        return await firestore.getPrayerLogs(userId);
    }
    return localStorage.loadPrayerLogsFromLocalStorage();
};

export const loadQuranLogs = async (userId: string | null): Promise<DailyQuranLog[]> => {
    if (userId) {
        return await firestore.getQuranLogs(userId);
    }
    return localStorage.loadQuranLogsFromLocalStorage();
};