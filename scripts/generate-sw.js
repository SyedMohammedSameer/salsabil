// Generate firebase-messaging-sw.js with environment variables
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const swContent = `// Firebase Cloud Messaging Service Worker
// Handles background push notifications
// This file is auto-generated at build time - do not edit manually

importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging-compat.js');

// Initialize Firebase with config from environment variables
const firebaseConfig = {
  apiKey: '${process.env.VITE_FIREBASE_API_KEY}',
  authDomain: '${process.env.VITE_FIREBASE_AUTH_DOMAIN}',
  projectId: '${process.env.VITE_FIREBASE_PROJECT_ID}',
  storageBucket: '${process.env.VITE_FIREBASE_STORAGE_BUCKET}',
  messagingSenderId: '${process.env.VITE_FIREBASE_MESSAGING_SENDER_ID}',
  appId: '${process.env.VITE_FIREBASE_APP_ID}'
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
    const urlToOpen = event.notification.data.link || '/';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((windowClients) => {
          for (let client of windowClients) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
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
`;

// Write to public directory
const outputPath = join(__dirname, '../public/firebase-messaging-sw.js');
writeFileSync(outputPath, swContent, 'utf8');
console.log('✅ Generated firebase-messaging-sw.js with environment variables');
