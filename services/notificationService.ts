// services/notificationService.ts - Notification management for in-app and push notifications
import { getToken, onMessage } from 'firebase/messaging';
import { collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db, messaging, VAPID_KEY } from '../lib/firebase';
import type { Notification, NotificationType, UserSettings } from '../types';

// Request permission and get FCM token
export const requestNotificationPermission = async (uid: string): Promise<string | null> => {
  try {
    if (!messaging) {
      console.warn('Firebase Messaging not initialized');
      return null;
    }

    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });

    if (token) {
      // Save token to Firestore
      await savePushToken(uid, token);
      console.log('✅ FCM token obtained and saved:', token);
      return token;
    }

    return null;
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};

// Save push token to Firestore
const savePushToken = async (uid: string, token: string) => {
  try {
    const tokenRef = collection(db, `push_tokens/${uid}/tokens`);
    await addDoc(tokenRef, {
      token,
      platform: 'web',
      createdAt: Timestamp.now(),
      lastSeenAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error saving push token:', error);
  }
};

// Create an in-app notification
export const createNotification = async (
  uid: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string
): Promise<void> => {
  try {
    const notificationsRef = collection(db, 'notifications');
    await addDoc(notificationsRef, {
      uid,
      type,
      title,
      body,
      link: link || null,
      createdAt: Timestamp.now(),
      readAt: null
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      readAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (uid: string): Promise<void> => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('uid', '==', uid),
      where('readAt', '==', null)
    );

    const snapshot = await getDocs(q);
    const promises = snapshot.docs.map(doc =>
      updateDoc(doc.ref, { readAt: Timestamp.now() })
    );

    await Promise.all(promises);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
};

// Listen to notifications in real-time
export const setupNotificationsListener = (
  uid: string,
  callback: (notifications: Notification[]) => void
): (() => void) => {
  const notificationsRef = collection(db, 'notifications');
  const q = query(
    notificationsRef,
    where('uid', '==', uid),
    orderBy('createdAt', 'desc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const notifications: Notification[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      readAt: doc.data().readAt?.toDate() || undefined
    } as Notification));

    callback(notifications);
  });

  return unsubscribe;
};

// Listen to foreground messages
export const setupForegroundMessaging = (
  onMessageReceived: (payload: any) => void
) => {
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    onMessageReceived(payload);

    // Show browser notification for foreground messages
    if (Notification.permission === 'granted') {
      new Notification(payload.notification?.title || 'Salsabil', {
        body: payload.notification?.body || '',
        icon: '/salsabil-icon-192.png'
      });
    }
  });
};

// Check if in quiet hours
export const isInQuietHours = (settings: UserSettings): boolean => {
  if (!settings.quietHours.enabled) return false;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const { start, end } = settings.quietHours;

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (start > end) {
    return currentTime >= start || currentTime <= end;
  }

  // Handle same-day quiet hours (e.g., 13:00 to 14:00)
  return currentTime >= start && currentTime <= end;
};

// Should send notification (respects quiet hours and focus mode)
export const shouldSendNotification = (settings: UserSettings): boolean => {
  if (!settings.notificationEnabled) return false;
  if (settings.focusMode.enabled) return false;
  if (isInQuietHours(settings)) return false;
  return true;
};

// Import getDocs
import { getDocs } from 'firebase/firestore';
