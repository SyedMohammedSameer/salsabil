# 🔔 Push Notifications Setup Guide

## Complete Step-by-Step Instructions to Enable Push Notifications in Salsabil

---

## Prerequisites

✅ Firebase project already configured
✅ App deployed and accessible via HTTPS (required for service workers)
✅ Modern browser (Chrome, Firefox, Safari, Edge)

---

## Step 1: Generate Firebase VAPID Key

### 1.1 Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your **Salsabil** project
3. Click on the **⚙️ Settings** gear icon (top left)
4. Select **Project settings**

### 1.2 Navigate to Cloud Messaging
1. Click on the **Cloud Messaging** tab
2. Scroll down to the **Web configuration** section
3. Under **Web Push certificates**, click **Generate key pair**
4. Copy the generated **VAPID key** (starts with `B...`)

### 1.3 Add VAPID Key to Environment Variables
Create or update your `.env` file in the project root:

```env
# Firebase VAPID Key for Push Notifications
VITE_FIREBASE_VAPID_KEY=YOUR_VAPID_KEY_HERE
```

**Example:**
```env
VITE_FIREBASE_VAPID_KEY=BK8X3vJ9Qr5L... (your actual key)
```

---

## Step 2: Enable Firebase Cloud Messaging API

### 2.1 Enable the API
1. In Firebase Console, go to **Project Settings**
2. Click on **Cloud Messaging** tab
3. You should see **Cloud Messaging API (Legacy)** - this is automatically enabled
4. For newer projects, ensure **Firebase Cloud Messaging API (V1)** is also enabled:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select your project
   - Navigate to **APIs & Services → Library**
   - Search for **Firebase Cloud Messaging API**
   - Click **Enable** if not already enabled

---

## Step 3: Deploy Service Worker

### 3.1 Verify Service Worker File Exists
The file `public/firebase-messaging-sw.js` should already exist. Verify it's in the right location:

```
salsabil/
├── public/
│   ├── firebase-messaging-sw.js  ← This file must be here
│   ├── index.html
│   └── ...
```

### 3.2 Update Firebase Config in Service Worker
Open `public/firebase-messaging-sw.js` and update the Firebase configuration with your actual Firebase project credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

**⚠️ Important:** These values must match your `lib/firebase.ts` configuration.

---

## Step 4: Build and Deploy

### 4.1 Build the Application
```bash
npm run build
```

Verify the build completes successfully with zero errors.

### 4.2 Deploy to Your Hosting
Deploy the `dist` folder to your hosting provider (Netlify, Vercel, Firebase Hosting, etc.):

**For Netlify:**
```bash
netlify deploy --prod
```

**For Firebase Hosting:**
```bash
firebase deploy
```

**For Vercel:**
```bash
vercel --prod
```

### 4.3 Verify HTTPS
**CRITICAL:** Service workers only work over HTTPS (or localhost for development).
Ensure your deployed app is accessible via `https://your-domain.com`

---

## Step 5: Request Notification Permission

### 5.1 Open the App
1. Navigate to your deployed app
2. Log in with your account

### 5.2 Enable Notifications in Settings
1. Click the **⚙️ Settings** button (top right of the app)
2. In the **User Settings** modal:
   - Toggle **Enable Notifications** to ON
   - Click **Enable Push Notifications** button
3. Browser will show a permission prompt
4. Click **Allow** when prompted

### 5.3 Verify Permission Granted
After clicking Allow, you should see:
- ✅ "Push notifications enabled successfully" message
- The push toggle should remain ON in settings
- Your FCM token should be stored in Firestore

---

## Step 6: Test Notifications

### 6.1 Test In-App Notifications
The app automatically creates notifications for:
- **AI Check-ins** (based on your interval setting - default 60 min)
- **Challenge Progress** (when you complete daily tasks)
- **Workout Logging** (when you add workouts)
- **Prayer Reminders** (time-based)
- **Focus Sessions** (when you complete sessions)

### 6.2 Verify Notification Center
1. Click the **🔔 Bell icon** in the header
2. You should see your notifications list
3. Unread notifications will have a blue dot
4. Click "Mark all read" to mark them as read

### 6.3 Test Background Notifications
1. Minimize or close the browser tab
2. Wait for the next AI check-in (or trigger a notification via the app)
3. You should receive a browser notification even when the app is closed

---

## Step 7: Configure AI Proactive Check-ins

### 7.1 Open Settings Modal
Click the ⚙️ Settings button

### 7.2 Configure AI Assistant
Under **AI Assistant** section:
- Toggle **Proactive Check-ins** to ON
- Set **Check-in Frequency** (15, 30, 60, 120, or 240 minutes)
- AI will send contextual check-ins based on time of day

### 7.3 Set Quiet Hours (Optional)
Under **Quiet Hours** section:
- Toggle **Enable Quiet Hours** to ON
- Set **Start Time** (e.g., 22:00 - 10 PM)
- Set **End Time** (e.g., 07:00 - 7 AM)
- No notifications will be sent during these hours

---

## Step 8: Troubleshooting

### Problem: "Notification permission denied"
**Solution:**
1. Check browser notification permissions:
   - Chrome: `chrome://settings/content/notifications`
   - Firefox: Hamburger menu → Settings → Privacy & Security → Permissions → Notifications
2. Find your domain and ensure it's set to "Allow"
3. If blocked, change to "Allow" and refresh the app

### Problem: "Service worker registration failed"
**Solution:**
1. Verify `firebase-messaging-sw.js` is in the `public/` folder
2. Check browser console for errors
3. Ensure app is running on HTTPS (not HTTP)
4. Clear browser cache and reload

### Problem: "No notifications received"
**Solution:**
1. Verify FCM token is stored in Firestore:
   - Go to Firebase Console → Firestore Database
   - Check `users/{userId}/settings` document
   - Should have `fcmToken` field
2. Check quiet hours aren't active
3. Check focus mode isn't enabled (disables notifications)
4. Verify browser notifications are enabled in OS settings

### Problem: "VAPID key error"
**Solution:**
1. Regenerate VAPID key in Firebase Console
2. Update `.env` file with new key
3. Rebuild and redeploy the app
4. Clear browser cache and re-grant permissions

---

## Step 9: Advanced Configuration

### Customize Notification Sounds
Modify `public/firebase-messaging-sw.js`:

```javascript
self.addEventListener('notificationclick', function(event) {
  // Add custom sound or vibration pattern
  event.notification.close();
  // ... rest of code
});
```

### Schedule Custom Reminders
Use the AI Scheduler Service:

```typescript
import * as aiScheduler from './services/aiSchedulerService';

// Schedule a custom reminder
await aiScheduler.scheduleReminder(
  userId,
  'Custom Reminder',
  'Your custom message here',
  new Date('2024-12-31T12:00:00'),
  '#dashboard'
);
```

---

## Step 10: Monitoring and Analytics

### Check Notification Delivery
1. Open Firebase Console
2. Go to **Cloud Messaging**
3. View **Message history** to see sent notifications

### Monitor in Firestore
1. Navigate to Firestore Database
2. Check `users/{userId}/notifications` collection
3. See all notifications with timestamps and read status

---

## ✅ Setup Complete!

Your push notifications are now fully configured and working!

**Features Enabled:**
- ✅ In-app notification center with unread badges
- ✅ Browser push notifications (background + foreground)
- ✅ Proactive AI check-ins with contextual messages
- ✅ Quiet hours support
- ✅ Focus mode integration
- ✅ Time-based and event-based notifications

**Next Steps:**
- Configure your AI check-in frequency
- Set quiet hours if desired
- Use the app and watch notifications appear!

---

## Need Help?

- Check DEV_NOTES.md for implementation details
- Review browser console for errors
- Check Firebase Console for Cloud Messaging logs
- Verify service worker is registered in DevTools → Application → Service Workers
