// Generate firebase-messaging-sw.js with environment variables
// Loads .env file at build time so process.env.VITE_* are available
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Manually parse .env file since dotenv may not be installed
function loadEnv() {
  const envPath = join(rootDir, '.env');
  if (!existsSync(envPath)) {
    console.warn('⚠️ No .env file found, using process.env values (Netlify build)');
    return;
  }
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();

const getEnv = (key) => process.env[key] || '';

const swContent = `// Firebase Cloud Messaging Service Worker
// Handles background push notifications
// This file is auto-generated at build time - do not edit manually

importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging-compat.js');

// Initialize Firebase with config injected at build time
const firebaseConfig = {
  apiKey: '${getEnv('VITE_FIREBASE_API_KEY')}',
  authDomain: '${getEnv('VITE_FIREBASE_AUTH_DOMAIN')}',
  projectId: '${getEnv('VITE_FIREBASE_PROJECT_ID')}',
  storageBucket: '${getEnv('VITE_FIREBASE_STORAGE_BUCKET')}',
  messagingSenderId: '${getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID')}',
  appId: '${getEnv('VITE_FIREBASE_APP_ID')}'
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
`;

// Write to public directory
const outputPath = join(__dirname, '../public/firebase-messaging-sw.js');
writeFileSync(outputPath, swContent, 'utf8');

// Validate config was injected
const hasConfig = getEnv('VITE_FIREBASE_API_KEY') && getEnv('VITE_FIREBASE_API_KEY') !== 'undefined';
if (hasConfig) {
  console.log('✅ Generated firebase-messaging-sw.js with valid Firebase config');
} else {
  console.warn('⚠️ Generated firebase-messaging-sw.js but Firebase config values are empty. Push notifications will not work until env vars are set.');
}
