// services/firebaseService.ts - FIXED VERSION with proper authentication sync
import { Task, Theme, PomodoroSettings, DailyPrayerLog, DailyQuranLog, ChatMessage, PomodoroMode } from '../types';
import { DEFAULT_POMODORO_SETTINGS } from '../constants';
import * as firestore from '../lib/firestore';
import * as localStorage from './localStorageService';
import { db } from '../lib/firebase';
import { Tree, TreeType, TreeGrowthStage } from '../types';
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    setDoc,
    getDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    limit,
    onSnapshot,
    Unsubscribe
} from 'firebase/firestore';

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
export const loadPomodoroSessions = async (userId: string | null): Promise<FocusSession[]> => {
    if (userId) {
        return await firestore.getPomodoroSessions(userId);
    }
    return localStorage.loadPomodoroSessionsFromLocalStorage();
}

export const savePomodoroSession = async (userId: string | null, session: FocusSession): Promise<void> => {
    localStorage.savePomodoroSessionToLocalStorage(session);
    if (userId) {
        await firestore.savePomodoroSession(userId, session);
    }
}

export const savePersonalTree = async (userId: string, tree: Tree): Promise<void> => {
    if (!userId) {
      console.warn('🔥 Firebase: No user ID provided, cannot save personal tree.');
      return;
    }

    try {
      console.log('🌱 Saving personal tree:', tree.id, 'for user:', userId);
      const treeRef = doc(db, 'users', userId, 'garden', tree.id);

      // Use Firestore timestamp for proper sorting
      await setDoc(treeRef, {
        ...tree,
        plantedAt: serverTimestamp(), // Use Firestore timestamp for proper ordering
        originalPlantedAt: tree.plantedAt.toISOString(), // Keep original date as string backup
        createdAt: serverTimestamp()
      });
      console.log('✅ Personal tree saved successfully:', tree.id);
    } catch (error) {
      console.error('❌ Error saving personal tree:', error);
      throw error;
    }
  };
  
  export const loadPersonalTrees = async (userId: string | null): Promise<Tree[]> => {
    if (!userId) {
      console.warn('🔥 Firebase: No user ID provided, cannot load personal trees.');
      return [];
    }
    
    try {
      const gardenRef = collection(db, 'users', userId, 'garden');
      const gardenQuery = query(gardenRef, orderBy('plantedAt', 'desc'), limit(100));
      const querySnapshot = await getDocs(gardenQuery);
      
      const trees: Tree[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        trees.push({
          id: data.id,
          type: data.type as TreeType,
          plantedAt: new Date(data.plantedAt), // Convert string back to Date
          growthStage: data.growthStage,
          focusMinutes: data.focusMinutes,
          isAlive: data.isAlive,
          plantedBy: data.plantedBy,
          plantedByName: data.plantedByName
        });
      });
      
      console.log(`🌳 Loaded ${trees.length} personal trees for user ${userId}`);
      return trees;
    } catch (error) {
      console.error('Error loading personal trees:', error);
      return [];
    }
  };
  
  export const setupPersonalGardenListener = (userId: string, callback: (trees: Tree[]) => void): Unsubscribe => {
    console.log(`🔥 Firebase: Setting up personal garden listener for user: ${userId}`);
    const gardenRef = collection(db, 'users', userId, 'garden');
    const gardenQuery = query(gardenRef, orderBy('plantedAt', 'desc'), limit(100));

    const unsubscribe = onSnapshot(gardenQuery, (snapshot) => {
      const trees: Tree[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();

        // Handle both Firestore timestamp and string dates
        let plantedAtDate: Date;
        if (data.plantedAt?.toDate) {
          // Firestore timestamp
          plantedAtDate = data.plantedAt.toDate();
        } else if (data.originalPlantedAt) {
          // Fallback to string date
          plantedAtDate = new Date(data.originalPlantedAt);
        } else if (typeof data.plantedAt === 'string') {
          plantedAtDate = new Date(data.plantedAt);
        } else {
          // Fallback to creation time
          plantedAtDate = data.createdAt?.toDate() || new Date();
        }

        trees.push({
          id: data.id,
          type: data.type as TreeType,
          plantedAt: plantedAtDate,
          growthStage: data.growthStage,
          focusMinutes: data.focusMinutes,
          isAlive: data.isAlive,
          plantedBy: data.plantedBy,
          plantedByName: data.plantedByName,
          // Include variety data if present
          varietyName: data.varietyName,
          varietyEmoji: data.varietyEmoji,
          varietyColor: data.varietyColor
        });
      });

      console.log(`🌳 Personal garden listener received ${trees.length} trees for user ${userId}`);
      callback(trees);
    }, (error) => {
      console.error('❌ Personal garden listener error:', error);
      callback([]);
    });

    return unsubscribe;
  };
  
  // Personal Garden Stats
  export const updatePersonalGardenStats = async (userId: string, stats: {
    totalTrees: number;
    totalFocusMinutes: number;
    treesThisWeek: number;
    currentStreak: number;
  }): Promise<void> => {
    if (!userId) return;
    
    try {
      const statsRef = doc(db, 'users', userId, 'gardenStats', 'summary');
      await setDoc(statsRef, {
        ...stats,
        lastUpdated: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating garden stats:', error);
    }
  };
  
  export const loadPersonalGardenStats = async (userId: string | null): Promise<{
    totalTrees: number;
    totalFocusMinutes: number;
    treesThisWeek: number;
    currentStreak: number;
  } | null> => {
    if (!userId) return null;
    
    try {
      const statsRef = doc(db, 'users', userId, 'gardenStats', 'summary');
      const docSnap = await getDoc(statsRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as any;
      }
      return null;
    } catch (error) {
      console.error('Error loading garden stats:', error);
      return null;
    }
  };
  
  // Helper function to calculate tree growth stage
  export const getGrowthStage = (focusMinutes: number): TreeGrowthStage => {
    if (focusMinutes < 25) return TreeGrowthStage.Sprout;
    if (focusMinutes < 50) return TreeGrowthStage.Sapling;
    if (focusMinutes < 100) return TreeGrowthStage.YoungTree;
    return TreeGrowthStage.MatureTree;
  };

// ============================================================================
// NEW COLLECTIONS FOR MAJOR UPGRADE
// ============================================================================

import type { UserSettings, WorkoutEntry, Challenge, ChallengeDay, AIThread } from '../types';
import { Timestamp } from 'firebase/firestore';

// Default user settings
const DEFAULT_USER_SETTINGS: UserSettings = {
  notificationEnabled: true,
  pushEnabled: false,
  aiCheckInEnabled: true,
  aiCheckInIntervalMinutes: 120,
  quietHours: {
    start: '22:00',
    end: '07:00',
    enabled: true
  },
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  focusMode: {
    enabled: false
  },
  uiDensity: 'compact'
};

// ============================================================================
// USER SETTINGS
// ============================================================================

export const loadUserSettings = async (userId: string | null): Promise<UserSettings> => {
  if (!userId) return DEFAULT_USER_SETTINGS;

  try {
    const settingsRef = doc(db, 'user_settings', userId);
    const docSnap = await getDoc(settingsRef);

    if (docSnap.exists()) {
      return { ...DEFAULT_USER_SETTINGS, ...docSnap.data() } as UserSettings;
    }

    // Create default settings
    await setDoc(settingsRef, DEFAULT_USER_SETTINGS);
    return DEFAULT_USER_SETTINGS;
  } catch (error) {
    console.error('Error loading user settings:', error);
    return DEFAULT_USER_SETTINGS;
  }
};

export const saveUserSettings = async (userId: string, settings: Partial<UserSettings>): Promise<void> => {
  if (!userId) return;

  try {
    const settingsRef = doc(db, 'user_settings', userId);
    await setDoc(settingsRef, settings, { merge: true });
  } catch (error) {
    console.error('Error saving user settings:', error);
  }
};

export const setupUserSettingsListener = (userId: string, callback: (settings: UserSettings) => void): Unsubscribe => {
  const settingsRef = doc(db, 'user_settings', userId);

  return onSnapshot(settingsRef, (doc) => {
    if (doc.exists()) {
      callback({ ...DEFAULT_USER_SETTINGS, ...doc.data() } as UserSettings);
    } else {
      callback(DEFAULT_USER_SETTINGS);
    }
  });
};

// ============================================================================
// WORKOUTS
// ============================================================================

export const saveWorkout = async (userId: string, workout: Omit<WorkoutEntry, 'id' | 'createdAt'>): Promise<void> => {
  if (!userId) return;

  try {
    const workoutsRef = collection(db, `workouts/${userId}/entries`);
    await addDoc(workoutsRef, {
      ...workout,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error saving workout:', error);
  }
};

export const updateWorkout = async (userId: string, workoutId: string, updates: Partial<WorkoutEntry>): Promise<void> => {
  if (!userId) return;

  try {
    const workoutRef = doc(db, `workouts/${userId}/entries`, workoutId);
    await updateDoc(workoutRef, updates);
  } catch (error) {
    console.error('Error updating workout:', error);
  }
};

export const deleteWorkout = async (userId: string, workoutId: string): Promise<void> => {
  if (!userId) return;

  try {
    const workoutRef = doc(db, `workouts/${userId}/entries`, workoutId);
    await deleteDoc(workoutRef);
  } catch (error) {
    console.error('Error deleting workout:', error);
  }
};

export const loadWorkouts = async (userId: string | null, date?: string): Promise<WorkoutEntry[]> => {
  if (!userId) return [];

  try {
    const workoutsRef = collection(db, `workouts/${userId}/entries`);
    let q = query(workoutsRef, orderBy('date', 'desc'));

    if (date) {
      q = query(workoutsRef, where('date', '==', date));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    } as WorkoutEntry));
  } catch (error) {
    console.error('Error loading workouts:', error);
    return [];
  }
};

export const setupWorkoutsListener = (userId: string, callback: (workouts: WorkoutEntry[]) => void): Unsubscribe => {
  const workoutsRef = collection(db, `workouts/${userId}/entries`);
  const q = query(workoutsRef, orderBy('date', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const workouts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    } as WorkoutEntry));
    callback(workouts);
  });
};

// ============================================================================
// CHALLENGES
// ============================================================================

export const saveChallenge = async (userId: string, challenge: Omit<Challenge, 'id' | 'createdAt'>): Promise<string> => {
  if (!userId) return '';

  try {
    const challengesRef = collection(db, `challenges/${userId}/items`);
    const docRef = await addDoc(challengesRef, {
      ...challenge,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving challenge:', error);
    return '';
  }
};

export const updateChallenge = async (userId: string, challengeId: string, updates: Partial<Challenge>): Promise<void> => {
  if (!userId) return;

  try {
    const challengeRef = doc(db, `challenges/${userId}/items`, challengeId);
    await updateDoc(challengeRef, updates);
  } catch (error) {
    console.error('Error updating challenge:', error);
  }
};

export const loadChallenges = async (userId: string | null): Promise<Challenge[]> => {
  if (!userId) return [];

  try {
    const challengesRef = collection(db, `challenges/${userId}/items`);
    const q = query(challengesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    } as Challenge));
  } catch (error) {
    console.error('Error loading challenges:', error);
    return [];
  }
};

export const setupChallengesListener = (userId: string, callback: (challenges: Challenge[]) => void): Unsubscribe => {
  const challengesRef = collection(db, `challenges/${userId}/items`);
  const q = query(challengesRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const challenges = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    } as Challenge));
    callback(challenges);
  });
};

// ============================================================================
// CHALLENGE DAYS
// ============================================================================

export const saveChallengeDay = async (userId: string, day: Omit<ChallengeDay, 'id' | 'updatedAt'>): Promise<void> => {
  if (!userId) return;

  try {
    const dayRef = doc(db, `challenge_days/${userId}/days`, `${day.challengeId}_${day.date}`);
    await setDoc(dayRef, {
      ...day,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving challenge day:', error);
  }
};

export const loadChallengeDays = async (userId: string | null, challengeId: string): Promise<ChallengeDay[]> => {
  if (!userId) return [];

  try {
    const daysRef = collection(db, `challenge_days/${userId}/days`);
    const q = query(daysRef, where('challengeId', '==', challengeId), orderBy('date', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    } as ChallengeDay));
  } catch (error) {
    console.error('Error loading challenge days:', error);
    return [];
  }
};

// ============================================================================
// AI THREADS
// ============================================================================

export const saveAIThread = async (userId: string, threadId: string, thread: Partial<AIThread>): Promise<void> => {
  if (!userId) return;

  try {
    const threadRef = doc(db, `ai_threads/${userId}/threads`, threadId);
    await setDoc(threadRef, {
      ...thread,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving AI thread:', error);
  }
};

export const loadAIThread = async (userId: string | null, threadId: string): Promise<AIThread | null> => {
  if (!userId) return null;

  try {
    const threadRef = doc(db, `ai_threads/${userId}/threads`, threadId);
    const docSnap = await getDoc(threadRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        messages: data.messages.map((msg: any) => ({
          ...msg,
          createdAt: msg.createdAt?.toDate() || new Date()
        })),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as AIThread;
    }

    return null;
  } catch (error) {
    console.error('Error loading AI thread:', error);
    return null;
  }
};
  