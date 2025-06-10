// Updated src/lib/firestore.ts with Pomodoro session support
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
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import { Task, DailyPrayerLog, DailyQuranLog, PomodoroSettings, Theme, ChatMessage, PomodoroMode } from '../types';

// Pomodoro Session interface
export interface FocusSession {
  id: string;
  type: PomodoroMode;
  duration: number;
  completedAt: Date;
  interrupted: boolean;
  actualTimeSpent: number;
}

// Tasks
export async function saveTask(userId: string, task: Task): Promise<void> {
  try {
    const taskRef = doc(db, 'users', userId, 'tasks', task.id);
    
    // Clean the task data to remove undefined values
    const cleanedTask: any = {
      id: task.id,
      title: task.title,
      date: task.date,
      priority: task.priority,
      completed: task.completed || false,
      completedSubtasks: task.completedSubtasks || 0,
      subtasks: task.subtasks || [],
      updatedAt: serverTimestamp()
    };
    
    // Only add optional fields if they have values
    if (task.description) cleanedTask.description = task.description;
    if (task.startTime) cleanedTask.startTime = task.startTime;
    if (task.endTime) cleanedTask.endTime = task.endTime;
    
    await setDoc(taskRef, cleanedTask);
  } catch (error) {
    console.error('Error saving task:', error);
    throw error;
  }
}

export async function getUserTasks(userId: string): Promise<Task[]> {
  try {
    const tasksRef = collection(db, 'users', userId, 'tasks');
    const querySnapshot = await getDocs(tasksRef);
    const tasks: Task[] = [];
    querySnapshot.forEach((doc) => {
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
    return tasks;
  } catch (error) {
    console.error('Error getting tasks:', error);
    throw error;
  }
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', userId, 'tasks', taskId));
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}

// User Settings
export async function saveUserSettings(userId: string, settings: {
  theme?: Theme;
  pomodoroSettings?: PomodoroSettings;
}): Promise<void> {
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
    await setDoc(settingsRef, {
      ...settings,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving user settings:', error);
    throw error;
  }
}

export async function getUserSettings(userId: string): Promise<{
  theme?: Theme;
  pomodoroSettings?: PomodoroSettings;
} | null> {
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
      return docSnap.data() as any;
    }
    return null;
  } catch (error) {
    console.error('Error getting user settings:', error);
    return null;
  }
}

// Pomodoro Sessions (New)
export async function savePomodoroSession(userId: string, session: FocusSession): Promise<void> {
  try {
    const sessionRef = doc(db, 'users', userId, 'pomodoroSessions', session.id);
    await setDoc(sessionRef, {
      id: session.id,
      type: session.type,
      duration: session.duration,
      completedAt: session.completedAt,
      interrupted: session.interrupted,
      actualTimeSpent: session.actualTimeSpent,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error saving pomodoro session:', error);
    throw error;
  }
}

export async function getPomodoroSessions(userId: string): Promise<FocusSession[]> {
  try {
    const sessionsRef = collection(db, 'users', userId, 'pomodoroSessions');
    const q = query(sessionsRef, orderBy('completedAt', 'desc'), limit(100));
    const querySnapshot = await getDocs(q);
    
    const sessions: FocusSession[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      sessions.push({
        id: data.id,
        type: data.type,
        duration: data.duration,
        completedAt: data.completedAt.toDate ? data.completedAt.toDate() : new Date(data.completedAt),
        interrupted: data.interrupted,
        actualTimeSpent: data.actualTimeSpent
      });
    });
    return sessions;
  } catch (error) {
    console.error('Error getting pomodoro sessions:', error);
    throw error;
  }
}

export async function savePomodoroSessions(userId: string, sessions: FocusSession[]): Promise<void> {
  try {
    // Save multiple sessions - typically used for batch operations
    for (const session of sessions) {
      await savePomodoroSession(userId, session);
    }
  } catch (error) {
    console.error('Error saving pomodoro sessions:', error);
    throw error;
  }
}

// Prayer Logs
export async function savePrayerLogs(userId: string, logs: DailyPrayerLog[]): Promise<void> {
  try {
    // Clean the logs data
    const cleanedLogs = logs.map(log => {
      const cleanedLog: any = {
        date: log.date,
        prayers: {}
      };
      
      // Clean prayer entries
      Object.entries(log.prayers).forEach(([prayerName, prayerData]) => {
        if (prayerData) {
          cleanedLog.prayers[prayerName] = {};
          if (prayerData.fardh !== undefined) {
            cleanedLog.prayers[prayerName].fardh = prayerData.fardh;
          }
          if (prayerData.sunnah !== undefined) {
            cleanedLog.prayers[prayerName].sunnah = prayerData.sunnah;
          }
        }
      });
      
      if (log.notes) cleanedLog.notes = log.notes;
      
      return cleanedLog;
    });
    
    const logsRef = doc(db, 'users', userId, 'settings', 'prayerLogs');
    await setDoc(logsRef, {
      logs: cleanedLogs,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error saving prayer logs:', error);
    throw error;
  }
}

export async function getPrayerLogs(userId: string): Promise<DailyPrayerLog[]> {
  try {
    const logsRef = doc(db, 'users', userId, 'settings', 'prayerLogs');
    const docSnap = await getDoc(logsRef);
    if (docSnap.exists()) {
      return docSnap.data().logs || [];
    }
    return [];
  } catch (error) {
    console.error('Error getting prayer logs:', error);
    return [];
  }
}

// Quran Logs
export async function saveQuranLogs(userId: string, logs: DailyQuranLog[]): Promise<void> {
  try {
    const logsRef = doc(db, 'users', userId, 'settings', 'quranLogs');
    await setDoc(logsRef, {
      logs,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error saving Quran logs:', error);
    throw error;
  }
}

export async function getQuranLogs(userId: string): Promise<DailyQuranLog[]> {
  try {
    const logsRef = doc(db, 'users', userId, 'settings', 'quranLogs');
    const docSnap = await getDoc(logsRef);
    if (docSnap.exists()) {
      return docSnap.data().logs || [];
    }
    return [];
  } catch (error) {
    console.error('Error getting Quran logs:', error);
    return [];
  }
}

// Chat History Functions
export async function saveChatHistory(userId: string, messages: ChatMessage[]): Promise<void> {
  try {
    // Keep only the last 100 messages to avoid storage bloat
    const recentMessages = messages.slice(-100);
    
    const chatRef = doc(db, 'users', userId, 'ai-assistant', 'chatHistory');
    await setDoc(chatRef, {
      messages: recentMessages.map(msg => ({
        id: msg.id,
        text: msg.text,
        sender: msg.sender,
        timestamp: msg.timestamp.toISOString() // Convert to string for Firestore
      })),
      updatedAt: serverTimestamp(),
      messageCount: recentMessages.length
    });
  } catch (error) {
    console.error('Error saving chat history:', error);
    throw error;
  }
}

export async function getChatHistory(userId: string): Promise<ChatMessage[]> {
  try {
    const chatRef = doc(db, 'users', userId, 'ai-assistant', 'chatHistory');
    const docSnap = await getDoc(chatRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return (data.messages || []).map((msg: any) => ({
        id: msg.id,
        text: msg.text,
        sender: msg.sender,
        timestamp: new Date(msg.timestamp) // Convert back to Date
      }));
    }
    return [];
  } catch (error) {
    console.error('Error getting chat history:', error);
    return [];
  }
}

export async function clearChatHistory(userId: string): Promise<void> {
  try {
    const chatRef = doc(db, 'users', userId, 'ai-assistant', 'chatHistory');
    await deleteDoc(chatRef);
  } catch (error) {
    console.error('Error clearing chat history:', error);
    throw error;
  }
}

// AI Assistant Analytics (optional - for insights)
export async function saveAIInteraction(userId: string, interaction: {
  prompt: string;
  response: string;
  category: string;
  timestamp: Date;
}): Promise<void> {
  try {
    const analyticsRef = collection(db, 'users', userId, 'ai-analytics');
    await addDoc(analyticsRef, {
      ...interaction,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error saving AI interaction:', error);
    // Don't throw - analytics shouldn't break the main flow
  }
}