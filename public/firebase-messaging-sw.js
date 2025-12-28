// Firebase Cloud Messaging Service Worker
// Handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// Note: Config comes from environment variables at build time
const firebaseConfig = {
  apiKey: 'AIzaSyA2MMH56_72oL0gTJ4fhPU9m0xtMI-O67M',
  authDomain: 'focusflow-71a55.firebaseapp.com',
  projectId: 'focusflow-71a55',
  storageBucket: 'focusflow-71a55.firebasestorage.app',
  messagingSenderId: '979654187250',
  appId: '1:979654187250:web:b747752305909efa41586b'
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve Firebase Messaging instance
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
      {
        action: 'view',
        title: 'View'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event.notification.tag);

  event.notification.close();

  if (event.action === 'view') {
    // Open the app to the relevant view if a link is provided
    const urlToOpen = event.notification.data.link || '/';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((windowClients) => {
          // Check if there's already a window/tab open
          for (let client of windowClients) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          // If not, open a new window
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
  // 'dismiss' action or default: just close the notification (already done above)
});

// Listen for push events (backup handler)
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received');

  if (!event.data) {
    console.log('[firebase-messaging-sw.js] Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[firebase-messaging-sw.js] Push data:', data);

    const title = data.notification?.title || 'Salsabil';
    const options = {
      body: data.notification?.body || 'You have a new notification',
      icon: '/salsabil-icon-192.png',
      badge: '/salsabil-icon-72.png',
      data: data.data || {}
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Error parsing push data:', error);
  }
});

console.log('[firebase-messaging-sw.js] Service Worker loaded and ready');
