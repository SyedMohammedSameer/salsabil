// services/aiAnalyticsService.ts - AI personality learning and engagement tracking
import { doc, setDoc, getDoc, collection, addDoc, query, where, orderBy, limit, getDocs, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type {
  AIPersonalityProfile,
  AIInteraction,
  AINotificationContext,
  AICommunicationStyle
} from '../types';

/**
 * Initialize AI personality profile for a new user
 */
export const initializeAIProfile = async (userId: string): Promise<void> => {
  const profileRef = doc(db, `users/${userId}/ai_profile/main`);

  const defaultProfile: AIPersonalityProfile = {
    communicationStyle: 'encouraging',
    preferredNotificationTimes: ['09:00', '14:00', '20:00'],
    engagementRate: 0.5, // Neutral starting point
    lastInteraction: new Date(),
    totalInteractions: 0,
    userPreferences: {
      likesEmojis: true,
      prefersShortMessages: true,
      respondsToMotivation: true,
      respondsToReminders: true,
    },
    learningData: {
      mostProductiveTime: 'morning',
      averageTaskCompletionRate: 0,
      prayerConsistencyScore: 0,
      quranReadingStreak: 0,
      focusSessionsPerWeek: 0,
    }
  };

  try {
    await setDoc(profileRef, defaultProfile);
  } catch (error) {
    console.error('Error initializing AI profile:', error);
  }
};

/**
 * Get user's AI personality profile
 */
export const getAIProfile = async (userId: string): Promise<AIPersonalityProfile> => {
  const profileRef = doc(db, `users/${userId}/ai_profile/main`);

  try {
    const profileDoc = await getDoc(profileRef);

    if (!profileDoc.exists()) {
      // Initialize if doesn't exist
      await initializeAIProfile(userId);
      return (await getDoc(profileRef)).data() as AIPersonalityProfile;
    }

    return profileDoc.data() as AIPersonalityProfile;
  } catch (error) {
    console.error('Error getting AI profile:', error);
    throw error;
  }
};

/**
 * Track an AI interaction (notification sent, chat message, etc.)
 */
export const trackAIInteraction = async (
  userId: string,
  type: AIInteraction['type'],
  aiMessage: string,
  userEngaged: boolean,
  contextSnapshot: AIInteraction['contextSnapshot']
): Promise<void> => {
  const interactionsRef = collection(db, `users/${userId}/ai_interactions`);

  const interaction: Omit<AIInteraction, 'id'> = {
    type,
    aiMessage,
    userEngaged,
    timestamp: new Date(),
    contextSnapshot,
  };

  try {
    await addDoc(interactionsRef, {
      ...interaction,
      timestamp: Timestamp.now(),
    });

    // Update profile engagement rate
    await updateEngagementRate(userId, userEngaged);
  } catch (error) {
    console.error('Error tracking AI interaction:', error);
  }
};

/**
 * Update engagement rate based on user interaction
 */
const updateEngagementRate = async (userId: string, engaged: boolean): Promise<void> => {
  const profileRef = doc(db, `users/${userId}/ai_profile/main`);

  try {
    const profileDoc = await getDoc(profileRef);
    if (!profileDoc.exists()) return;

    const profile = profileDoc.data() as AIPersonalityProfile;
    const totalInteractions = profile.totalInteractions + 1;

    // Calculate new engagement rate (weighted average, recent interactions count more)
    const weight = 0.2; // 20% weight for new interaction
    const newEngagementRate = profile.engagementRate * (1 - weight) + (engaged ? 1 : 0) * weight;

    await updateDoc(profileRef, {
      engagementRate: newEngagementRate,
      totalInteractions,
      lastInteraction: Timestamp.now(),
    });

    // Adapt communication style based on engagement
    if (totalInteractions >= 10) {
      await adaptCommunicationStyle(userId, newEngagementRate);
    }
  } catch (error) {
    console.error('Error updating engagement rate:', error);
  }
};

/**
 * Adapt communication style based on engagement patterns
 */
const adaptCommunicationStyle = async (userId: string, engagementRate: number): Promise<void> => {
  const profileRef = doc(db, `users/${userId}/ai_profile/main`);

  try {
    const profileDoc = await getDoc(profileRef);
    if (!profileDoc.exists()) return;

    const profile = profileDoc.data() as AIPersonalityProfile;
    let newStyle: AICommunicationStyle = profile.communicationStyle;

    // Adapt style based on engagement
    if (engagementRate < 0.3) {
      // Low engagement - try different approach
      newStyle = profile.communicationStyle === 'encouraging' ? 'direct' : 'casual';
    } else if (engagementRate > 0.7) {
      // High engagement - current style works, maybe enhance
      if (profile.communicationStyle === 'direct') {
        newStyle = 'encouraging'; // Add warmth if direct approach is working
      }
    }

    if (newStyle !== profile.communicationStyle) {
      await updateDoc(profileRef, {
        communicationStyle: newStyle,
      });
    }
  } catch (error) {
    console.error('Error adapting communication style:', error);
  }
};

/**
 * Update user preferences based on interaction patterns
 */
export const updateUserPreferences = async (
  userId: string,
  preferences: Partial<AIPersonalityProfile['userPreferences']>
): Promise<void> => {
  const profileRef = doc(db, `users/${userId}/ai_profile/main`);

  try {
    const profileDoc = await getDoc(profileRef);
    if (!profileDoc.exists()) return;

    const profile = profileDoc.data() as AIPersonalityProfile;

    await updateDoc(profileRef, {
      userPreferences: {
        ...profile.userPreferences,
        ...preferences,
      },
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
  }
};

/**
 * Update learning data (productivity patterns, prayer consistency, etc.)
 */
export const updateLearningData = async (
  userId: string,
  learningData: Partial<AIPersonalityProfile['learningData']>
): Promise<void> => {
  const profileRef = doc(db, `users/${userId}/ai_profile/main`);

  try {
    const profileDoc = await getDoc(profileRef);
    if (!profileDoc.exists()) {
      await initializeAIProfile(userId);
      return updateLearningData(userId, learningData);
    }

    const profile = profileDoc.data() as AIPersonalityProfile;

    await updateDoc(profileRef, {
      learningData: {
        ...profile.learningData,
        ...learningData,
      },
    });
  } catch (error) {
    console.error('Error updating learning data:', error);
  }
};

/**
 * Build AI notification context from user data
 * This gathers all the data needed for AI to generate a personalized notification
 */
export const buildNotificationContext = async (userId: string): Promise<AINotificationContext> => {
  const now = new Date();
  const hour = now.getHours();

  // Determine time of day
  let timeOfDay: AINotificationContext['timeOfDay'];
  if (hour >= 5 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
  else timeOfDay = 'night';

  const currentTime = `${String(hour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = days[now.getDay()];

  // Fetch user data
  const [profile, todayStats, weeklyStats] = await Promise.all([
    getAIProfile(userId),
    getTodayStats(userId),
    getWeeklyStats(userId),
  ]);

  return {
    userId,
    currentTime,
    timeOfDay,
    dayOfWeek,
    userStats: {
      ...todayStats,
      ...weeklyStats,
    },
    userProfile: profile,
  };
};

/**
 * Get today's stats (tasks, prayers, quran, focus)
 */
const getTodayStats = async (userId: string) => {
  const today = new Date().toISOString().split('T')[0];

  try {
    // Fetch tasks for today
    const tasksRef = collection(db, `users/${userId}/tasks`);
    const tasksQuery = query(tasksRef, where('date', '==', today));
    const tasksSnapshot = await getDocs(tasksQuery);
    const tasks = tasksSnapshot.docs.map(doc => doc.data());

    const tasksTotal = tasks.length;
    const tasksCompleted = tasks.filter(t => t.completed).length;
    const hasUpcomingTasks = tasks.some(t => !t.completed);

    // Fetch prayer log for today
    const prayerLogRef = doc(db, `users/${userId}/settings/prayerLogs`);
    const prayerDoc = await getDoc(prayerLogRef);
    const prayerLogs = prayerDoc.exists() ? prayerDoc.data() : {};
    const todayPrayers = prayerLogs[today] || {};
    const prayersTotal = 5; // Fardh prayers
    const prayersCompleted = Object.values(todayPrayers.prayers || {}).filter((p: any) => p.fardh).length;
    const hasMissedPrayers = prayersCompleted < prayersTotal;

    // Fetch Quran log for today
    const quranLogRef = doc(db, `users/${userId}/settings/quranLogs`);
    const quranDoc = await getDoc(quranLogRef);
    const quranLogs = quranDoc.exists() ? quranDoc.data() : {};
    const todayQuran = quranLogs[today] || {};
    const quranPagesReadToday = todayQuran.pagesRead || 0;

    // Calculate Quran streak
    const currentQuranStreak = calculateQuranStreak(quranLogs);
    const isOnStreak = currentQuranStreak > 0;

    // Fetch focus sessions for today
    const sessionsRef = collection(db, `users/${userId}/pomodoroSessions`);
    const sessionsQuery = query(
      sessionsRef,
      where('date', '==', today),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const sessionsSnapshot = await getDocs(sessionsQuery);
    const focusMinutesTotal = sessionsSnapshot.docs.reduce((total, doc) => {
      const data = doc.data();
      return total + (data.duration || 0);
    }, 0);

    return {
      tasksTotal,
      tasksCompleted,
      prayersTotal,
      prayersCompleted,
      quranPagesReadToday,
      focusMinutesTotal: Math.round(focusMinutesTotal / 60), // Convert to minutes
      hasUpcomingTasks,
      hasMissedPrayers,
      isOnStreak,
    };
  } catch (error) {
    console.error('Error getting today stats:', error);
    return {
      tasksTotal: 0,
      tasksCompleted: 0,
      prayersTotal: 5,
      prayersCompleted: 0,
      quranPagesReadToday: 0,
      focusMinutesTotal: 0,
      hasUpcomingTasks: false,
      hasMissedPrayers: false,
      isOnStreak: false,
    };
  }
};

/**
 * Get weekly stats
 */
const getWeeklyStats = async (userId: string) => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  try {
    // Weekly task completion rate
    const tasksRef = collection(db, `users/${userId}/tasks`);
    const tasksQuery = query(
      tasksRef,
      where('date', '>=', weekAgoStr),
      where('date', '<=', todayStr)
    );
    const tasksSnapshot = await getDocs(tasksQuery);
    const weeklyTasks = tasksSnapshot.docs.map(doc => doc.data());
    const weeklyTaskCompletionRate = weeklyTasks.length > 0
      ? weeklyTasks.filter(t => t.completed).length / weeklyTasks.length
      : 0;

    // Weekly prayer rate (would need to fetch prayer logs for past week)
    // Simplified for now
    const weeklyPrayerRate = 0.8; // Placeholder

    // Trees planted this week
    const gardenRef = doc(db, `users/${userId}/garden/trees`);
    const gardenDoc = await getDoc(gardenRef);
    const trees = gardenDoc.exists() ? (gardenDoc.data().trees || []) : [];
    const treesPlantedThisWeek = trees.filter((tree: any) => {
      const plantedDate = tree.plantedAt?.toDate?.() || new Date(tree.plantedAt);
      return plantedDate >= weekAgo;
    }).length;

    return {
      weeklyTaskCompletionRate,
      weeklyPrayerRate,
      currentQuranStreak: 0, // Calculated in getTodayStats
      treesPlantedThisWeek,
    };
  } catch (error) {
    console.error('Error getting weekly stats:', error);
    return {
      weeklyTaskCompletionRate: 0,
      weeklyPrayerRate: 0,
      currentQuranStreak: 0,
      treesPlantedThisWeek: 0,
    };
  }
};

/**
 * Calculate current Quran reading streak
 */
const calculateQuranStreak = (quranLogs: any): number => {
  const dates = Object.keys(quranLogs).sort().reverse();
  let streak = 0;

  for (let i = 0; i < dates.length; i++) {
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - i);
    const expectedDateStr = expectedDate.toISOString().split('T')[0];

    if (dates[i] !== expectedDateStr) break;
    if (quranLogs[dates[i]]?.readQuran) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

/**
 * Get recent AI interactions to avoid repetition
 */
export const getRecentInteractions = async (userId: string, limitCount = 5): Promise<AIInteraction[]> => {
  const interactionsRef = collection(db, `users/${userId}/ai_interactions`);
  const q = query(
    interactionsRef,
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date(),
    } as AIInteraction));
  } catch (error) {
    console.error('Error getting recent interactions:', error);
    return [];
  }
};
