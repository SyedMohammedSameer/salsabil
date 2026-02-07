// Firebase Cloud Messaging Service Worker
// Handles background push notifications
// This file is auto-generated at build time - do not edit manually

importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging-compat.js');

// Initialize Firebase with config injected at build time
const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: ''
};

// Only initialize if config is valid
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'Salsabil';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new notification',
      icon: '/salsabil-icon-192.png',
      badge: '/salsabil-icon-72.png',
      tag: payload.data?.type || 'default',
      requireInteraction: false,
      data: payload.data || {},
      actions: [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
  console.warn('[firebase-messaging-sw.js] Firebase config not available, push notifications disabled');
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.link || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ('focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(urlToOpen);
      })
  );
});

// Listen for push events (backup handler)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.notification?.title || 'Salsabil';
    const options = {
      body: data.notification?.body || 'You have a new notification',
      icon: '/salsabil-icon-192.png',
      badge: '/salsabil-icon-72.png',
      data: data.data || {}
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Error parsing push data:', error);
  }
});

console.log('[firebase-messaging-sw.js] Service Worker loaded and ready');
