# 🔔 Salsabil Notifications Guide & Troubleshooting

## Overview
Salsabil uses an AI-powered notification system with Firebase Cloud Messaging (FCM) for both in-app and push notifications.

## How to Enable Notifications

### 1. **Enable Notifications in Settings**
   - Click on your profile/settings ⚙️
   - Look for "Notifications" section
   - Toggle "Enable Notifications" ON
   - Click "Enable Push Notifications" button
   - Allow notifications when browser prompts

### 2. **Enable AI Check-ins**
   - In Settings → "AI Check-ins"
   - Toggle "Enable AI Check-ins" ON
   - Set interval (default: 60 minutes)
   - AI will send personalized notifications based on your activity

### 3. **Configure Quiet Hours (Optional)**
   - In Settings → "Quiet Hours"
   - Toggle ON to prevent notifications during specific times
   - Set start and end times (e.g., 22:00 to 07:00)

## Notification Types

### 1. **AI Check-ins** 🤖
   - **What**: Personalized, contextual messages from Noor AI
   - **When**: Every 60 minutes (customizable)
   - **Example**: "You've completed 3 of 5 tasks today - keep the momentum going!"

### 2. **Prayer Reminders** 🕌
   - **What**: Reminders for daily prayers
   - **When**: Prayer times (if enabled)
   - **Example**: "It's time for Asr prayer!"

### 3. **Task Reminders** ✅
   - **What**: Notifications about pending/upcoming tasks
   - **When**: Based on task due dates
   - **Example**: "You have 3 high-priority tasks due today"

### 4. **Streak Alerts** 🔥
   - **What**: Quran reading streak maintenance
   - **When**: When streak is at risk
   - **Example**: "Your 7-day Quran streak is at risk - read today!"

### 5. **Achievement Notifications** 🎉
   - **What**: Celebrations for milestones
   - **When**: Completing challenges, hitting goals
   - **Example**: "Amazing! You completed your 21-day challenge!"

## Troubleshooting: Why Am I Not Getting Notifications?

### Step 1: Check Browser Permissions
```
1. Click the lock icon 🔒 in the browser address bar
2. Find "Notifications" permission
3. Ensure it's set to "Allow"
4. If "Block", change to "Allow" and refresh the page
```

### Step 2: Verify Notification Settings in App
```
1. Open Settings ⚙️
2. Check "Notifications Enabled": Should be ON
3. Check "Push Enabled": Should be ON
4. Check "AI Check-ins Enabled": Should be ON
5. Review "AI Check-in Interval": Default 60 min
```

### Step 3: Check Quiet Hours
```
1. Open Settings → Quiet Hours
2. If enabled, check times
3. Current time should NOT be within quiet hours
4. Disable temporarily to test
```

### Step 4: Check Focus Mode
```
1. Notifications are suppressed during Focus Mode
2. Exit Focus Mode to receive notifications
3. Settings → "Focus Mode" should be OFF
```

### Step 5: Browser-Specific Checks

#### Chrome/Edge:
```
1. Go to: chrome://settings/content/notifications
2. Find your app URL
3. Ensure it's in "Allow" list, not "Block"
```

#### Firefox:
```
1. Go to: about:preferences#privacy
2. Scroll to "Permissions" → "Notifications"
3. Find your app URL → Should be "Allow"
```

#### Safari:
```
1. Safari → Preferences → Websites → Notifications
2. Find your app URL
3. Set to "Allow"
```

### Step 6: Test Notifications Manually
```javascript
// Open browser console (F12)
// Run this test command:
Notification.requestPermission().then(perm => {
  if (perm === "granted") {
    new Notification("Test", { body: "Notifications working!" });
  }
});
```

### Step 7: Check Service Worker
```javascript
// Open browser console (F12)
// Check service worker status:
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log("Service Workers:", regs.length);
  regs.forEach(reg => console.log(reg));
});
```

### Step 8: Verify FCM Token
```javascript
// In browser console:
// This checks if Firebase Messaging token was generated
localStorage.getItem('fcm_token')
// Should return a long string token
// If null, token wasn't generated
```

## Default AI Check-in Schedule

- **First check-in**: 5 minutes after login
- **Recurring**: Every 60 minutes (default)
- **Customizable**: 15, 30, 60, 120, or 240 minutes

## AI Notification Examples

### Morning (5 AM - 12 PM)
- "Good morning! Ready to make today productive?"
- "Assalamu Alaikum! You have 5 tasks scheduled for today"

### Afternoon (12 PM - 5 PM)
- "You're doing great with a 3/5 task completion rate"
- "Remember to complete Dhuhr prayer"

### Evening (5 PM - 9 PM)
- "Evening reflection: You've completed 4/5 prayers today - Masha'Allah!"
- "Take a moment to review your day's achievements"

### Night (9 PM - 5 AM)
- "Prepare for a restful night - have you completed evening adhkar?"
- "Your Quran streak continues for 7 days - keep it up!"

## Advanced: AI Notification Context

The AI considers:
- **Current time & day**: Adapts message to time of day
- **Task completion**: "You've completed 3 of 5 tasks today (60%)"
- **Prayer status**: "Today's Prayers: 4/5 completed"
- **Quran streak**: "On a 7-day Quran reading streak"
- **Focus minutes**: "30 minutes of deep work today"
- **Weekly trends**: "85% task completion rate this week"
- **User preferences**: Communication style, emoji usage, motivation level

## Privacy & Data

- Notifications are personalized but private
- No data is shared with third parties
- All processing happens in your Firebase instance
- AI uses Groq API for message generation
- Can be disabled anytime in settings

## Common Issues & Solutions

### Issue: "Push notifications not supported"
**Solution**: Using Safari on iOS or older browser version. Update browser or use Chrome/Firefox.

### Issue: "No FCM token generated"
**Solution**:
1. Ensure VAPID key is configured in firebase config
2. Check browser console for errors
3. Verify firebase-messaging-sw.js is loaded

### Issue: "AI check-ins not sending"
**Solution**:
1. Verify `aiCheckInEnabled` is true in settings
2. Check that scheduler started (console logs)
3. Ensure not in quiet hours or focus mode
4. Wait for initial 5-minute delay after login

### Issue: "Notifications show but don't display"
**Solution**:
1. Check browser notification settings
2. Verify not in "Do Not Disturb" mode (OS level)
3. Check browser notification history

### Issue: "Duplicate notifications"
**Solution**:
1. Multiple browser tabs open - close extras
2. Service worker registration duplicated
3. Clear cache and refresh

## Support

If notifications still don't work:

1. **Check Browser Console**: Look for errors (F12 → Console tab)
2. **Check Network Tab**: Verify API calls to `.netlify/functions/ai-notification-generator`
3. **Verify Firebase**: Check Firebase console for quota limits
4. **Report Issue**: Create issue with:
   - Browser & version
   - Console errors
   - Screenshot of settings
   - Description of issue

## Technical Details (For Developers)

### Architecture:
```
1. Client requests notification permission
2. FCM token generated and saved to Firestore
3. AI Scheduler starts with interval (default: 60 min)
4. Every interval: buildNotificationContext() gathers user data
5. Calls /.netlify/functions/ai-notification-generator with context
6. Groq AI generates personalized message
7. createNotification() adds to Firestore
8. Real-time listener shows notification in-app
9. Service worker shows browser push notification
```

### Files:
- `services/notificationService.ts` - Notification management
- `services/aiSchedulerService.ts` - AI check-in scheduler
- `services/aiAnalyticsService.ts` - Context building
- `netlify/functions/ai-notification-generator.ts` - AI message generation
- `firebase-messaging-sw.js` - Service worker for push notifications

### Testing:
```javascript
// Manually trigger AI check-in (in console):
import * as aiScheduler from './services/aiSchedulerService';
aiScheduler.startAIScheduler('YOUR_USER_ID');
```

## Notification Settings Reference

Default settings (can be changed in Settings):
```typescript
{
  notificationEnabled: true,
  pushEnabled: false,  // Requires manual enable
  aiCheckInEnabled: true,
  aiCheckInIntervalMinutes: 60,
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "07:00"
  },
  focusMode: {
    enabled: false
  }
}
```

---

**Last Updated**: 2026-01-25
**Version**: 2.0 (AI-Powered Notifications)
