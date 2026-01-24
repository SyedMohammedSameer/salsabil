// AI Scheduler Service - Proactive AI check-ins and reminders
import { UserSettings, AIGeneratedNotification } from '../types';
import * as notificationService from './notificationService';
import * as firebaseService from './firebaseService';
import * as aiAnalyticsService from './aiAnalyticsService';

/**
 * Proactive AI Scheduler
 * Handles scheduled AI check-ins, reminders, and proactive interactions
 * based on user-defined settings and quiet hours
 */

interface ScheduledTask {
  id: string;
  userId: string;
  type: 'ai-checkin' | 'reminder' | 'motivation';
  scheduledFor: Date;
  executed: boolean;
}

// In-memory store for active schedulers (per user session)
const activeSchedulers = new Map<string, NodeJS.Timeout>();

/**
 * Start the proactive AI scheduler for a user
 */
export const startAIScheduler = async (userId: string) => {
  // Stop any existing scheduler for this user
  stopAIScheduler(userId);

  try {
    const settings = await firebaseService.loadUserSettings(userId);

    if (!settings.aiCheckInEnabled) {
      console.log('AI check-ins disabled for user:', userId);
      return;
    }

    const intervalMinutes = settings.aiCheckInIntervalMinutes || 60;
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`Starting AI scheduler for user ${userId} with ${intervalMinutes}min interval`);

    // Schedule recurring check-ins
    const schedulerId = setInterval(async () => {
      await performAICheckIn(userId, settings);
    }, intervalMs);

    activeSchedulers.set(userId, schedulerId);

    // Perform initial check-in after 5 minutes
    setTimeout(() => {
      performAICheckIn(userId, settings);
    }, 5 * 60 * 1000);

  } catch (error) {
    console.error('Error starting AI scheduler:', error);
  }
};

/**
 * Stop the proactive AI scheduler for a user
 */
export const stopAIScheduler = (userId: string) => {
  const scheduler = activeSchedulers.get(userId);
  if (scheduler) {
    clearInterval(scheduler);
    activeSchedulers.delete(userId);
    console.log(`Stopped AI scheduler for user ${userId}`);
  }
};

/**
 * Perform a proactive AI check-in
 */
const performAICheckIn = async (userId: string, settings: UserSettings) => {
  try {
    // Check if we should send notification (respects quiet hours and focus mode)
    if (!notificationService.shouldSendNotification(settings)) {
      console.log('AI check-in skipped due to quiet hours or focus mode');
      return;
    }

    // Generate contextual AI check-in message (now powered by real AI!)
    const message = await generateCheckInMessage(userId);

    // Create notification
    await notificationService.createNotification(
      userId,
      'ai',
      message.title || 'Check-in from Noor',
      message.body,
      message.link
    );

    console.log('AI check-in notification sent to user:', userId);
  } catch (error) {
    console.error('Error performing AI check-in:', error);
  }
};

/**
 * Generate contextual AI check-in message based on user's current state
 * Now uses real AI to generate personalized, context-aware notifications!
 */
const generateCheckInMessage = async (userId: string): Promise<{ body: string; link?: string; title?: string }> => {
  try {
    // Build comprehensive context for AI
    const notificationContext = await aiAnalyticsService.buildNotificationContext(userId);

    // Call AI notification generator serverless function
    const response = await fetch('/.netlify/functions/ai-notification-generator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notificationContext }),
    });

    if (!response.ok) {
      throw new Error(`AI generator failed: ${response.statusText}`);
    }

    const notification: AIGeneratedNotification = await response.json();

    // Track this AI interaction
    const contextSnapshot = {
      tasksCompleted: notificationContext.userStats.tasksCompleted,
      prayersCompleted: notificationContext.userStats.prayersCompleted,
      quranPagesRead: notificationContext.userStats.quranPagesReadToday,
      focusMinutesToday: notificationContext.userStats.focusMinutesTotal,
    };

    // Don't await tracking to not slow down notification
    aiAnalyticsService.trackAIInteraction(
      userId,
      'check_in',
      notification.body,
      false, // Will be updated when user engages
      contextSnapshot
    ).catch(err => console.error('Failed to track AI interaction:', err));

    return {
      title: notification.title,
      body: notification.body,
      link: notification.link || '#dashboard',
    };

  } catch (error) {
    console.error('Error generating AI check-in message:', error);

    // Fallback to a simple contextual message if AI fails
    const now = new Date();
    const hour = now.getHours();

    if (hour >= 5 && hour < 12) {
      return {
        title: "Morning Check-in",
        body: "Good morning! Ready to make today productive?",
        link: '#planner'
      };
    } else if (hour >= 12 && hour < 17) {
      return {
        title: "Afternoon Check-in",
        body: "How's your day going? Let's review your progress.",
        link: '#dashboard'
      };
    } else if (hour >= 17 && hour < 21) {
      return {
        title: "Evening Reflection",
        body: "Take a moment to reflect on your day's achievements.",
        link: '#dashboard'
      };
    } else {
      return {
        title: "Night Check-in",
        body: "Prepare for a restful night. Have you completed your evening routine?",
        link: '#adhkar'
      };
    }
  }
};

/**
 * Schedule a one-time reminder
 */
export const scheduleReminder = async (
  userId: string,
  title: string,
  body: string,
  scheduledFor: Date,
  link?: string
) => {
  const delay = scheduledFor.getTime() - Date.now();

  if (delay <= 0) {
    console.error('Cannot schedule reminder in the past');
    return;
  }

  setTimeout(async () => {
    const settings = await firebaseService.loadUserSettings(userId);
    if (notificationService.shouldSendNotification(settings)) {
      await notificationService.createNotification(userId, 'reminder', title, body, link);
    }
  }, delay);

  console.log(`Reminder scheduled for ${scheduledFor.toLocaleString()}`);
};

/**
 * Send motivational notification based on user progress
 */
export const sendMotivationalNotification = async (userId: string, context: {
  type: 'prayer' | 'quran' | 'task' | 'focus' | 'challenge';
  achievement?: string;
}) => {
  try {
    const settings = await firebaseService.loadUserSettings(userId);
    if (!notificationService.shouldSendNotification(settings)) {
      return;
    }

    let title = '';
    let body = '';
    let link = '';

    switch (context.type) {
      case 'prayer':
        title = 'Prayer Reminder ⏰';
        body = "It's time for prayer! Don't miss this blessed opportunity.";
        link = '#prayers';
        break;
      case 'quran':
        title = 'Quran Reading 📖';
        body = context.achievement || "Keep up your reading streak! Every verse brings barakah.";
        link = '#quran';
        break;
      case 'task':
        title = 'Task Achievement 🎉';
        body = context.achievement || "Great job completing your tasks! You're making excellent progress!";
        link = '#dashboard';
        break;
      case 'focus':
        title = 'Focus Session 🎯';
        body = context.achievement || "Amazing focus! You're building great concentration habits!";
        link = '#pomodoro';
        break;
      case 'challenge':
        title = 'Challenge Progress 💪';
        body = context.achievement || "Keep going! You're on the path to completing your challenge!";
        link = '#challenges';
        break;
    }

    await notificationService.createNotification(userId, context.type === 'prayer' ? 'reminder' : 'system', title, body, link);
  } catch (error) {
    console.error('Error sending motivational notification:', error);
  }
};

/**
 * Initialize AI scheduler on app startup (call this when user logs in)
 */
export const initializeAIScheduler = async (userId: string) => {
  try {
    // Set up listener for settings changes
    firebaseService.setupUserSettingsListener(userId, (settings) => {
      if (settings.aiCheckInEnabled) {
        startAIScheduler(userId);
      } else {
        stopAIScheduler(userId);
      }
    });

    // Start scheduler if enabled
    const settings = await firebaseService.loadUserSettings(userId);
    if (settings.aiCheckInEnabled) {
      await startAIScheduler(userId);
    }
  } catch (error) {
    console.error('Error initializing AI scheduler:', error);
  }
};

/**
 * Cleanup scheduler on logout
 */
export const cleanupAIScheduler = (userId: string) => {
  stopAIScheduler(userId);
  console.log('AI scheduler cleaned up for user:', userId);
};
