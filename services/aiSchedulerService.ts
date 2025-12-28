// AI Scheduler Service - Proactive AI check-ins and reminders
import { UserSettings } from '../types';
import * as notificationService from './notificationService';
import * as firebaseService from './firebaseService';

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

    // Generate contextual AI check-in message
    const message = await generateCheckInMessage(userId);

    // Create notification
    await notificationService.createNotification(
      userId,
      'ai',
      'AI Check-in',
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
 */
const generateCheckInMessage = async (userId: string): Promise<{ body: string; link?: string }> => {
  try {
    const now = new Date();
    const hour = now.getHours();

    // Time-based contextual messages
    if (hour >= 5 && hour < 12) {
      // Morning
      return {
        body: "Good morning! Ready to tackle your goals today? Let's review your tasks! ☀️",
        link: '#planner'
      };
    } else if (hour >= 12 && hour < 17) {
      // Afternoon
      const messages = [
        { body: "How's your day going? Need help staying on track? 💪", link: '#dashboard' },
        { body: "Time for a quick focus session? Your tasks are waiting! 🎯", link: '#pomodoro' },
        { body: "Have you completed your prayers? I can help you stay consistent! 🤲", link: '#prayers' }
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    } else if (hour >= 17 && hour < 21) {
      // Evening
      return {
        body: "Evening reflection time! How much Quran have you read today? 📖",
        link: '#quran'
      };
    } else {
      // Night
      return {
        body: "Before you sleep, have you completed your evening adhkar? 🌙",
        link: '#adhkar'
      };
    }
  } catch (error) {
    console.error('Error generating check-in message:', error);
    return {
      body: "Hi! I'm here to help you stay productive and spiritually connected. How can I assist? 🤖"
    };
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
