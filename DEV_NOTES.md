# Salsabil Major Upgrade - Development Notes

## Overview
This document tracks a comprehensive upgrade to Salsabil, transforming it into a more compact, feature-rich productivity and spiritual growth application.

## Upgrade Date
December 27, 2025

## Primary Objectives

### 1. UI Compaction (Mobile-First)
- **Goal**: Reduce padding/margins by 30-40% across all views
- **Critical Areas**:
  - Dashboard: Consolidate stat cards, reduce spacing
  - Adhkar: Compress mobile layout, remove excessive padding
  - Calendar: Set default to Day view
  - All views: Tighter, information-dense layouts

### 2. Notifications System
- **In-App Notifications**:
  - Bell icon with unread badge in header
  - Notification center with read/unread states
  - Stored in Firestore: `notifications/{notificationId}`
- **Browser Push Notifications**:
  - Firebase Cloud Messaging (FCM) integration
  - Service worker for background notifications
  - Token management in `push_tokens/{uid}/tokens/{tokenId}`
  - Respects quiet hours and focus mode

### 3. Workout Tracking
- **New View**: WorkoutsView
- **Features**: Add/edit/list workouts by date
- **Collection**: `workouts/{uid}/entries/{entryId}`
- **Fields**: date, type, durationMinutes, notes, completed

### 4. Multiple Concurrent Challenges
- **New View**: ChallengesView
- **Support**: Multiple active challenges simultaneously
- **Collections**:
  - `challenges/{uid}/items/{challengeId}`
  - `challenge_days/{uid}/days/{dayId}`
- **Templates**: 75 Hard, 21-Day Consistency, custom
- **Features**: Custom duration, checklist rules, daily tracking

### 5. Proactive AI
- **Enhancement**: Upgrade from reactive to proactive
- **Features**:
  - User-configurable check-in frequency (60/120/180 min)
  - Respects quiet hours and focus mode
  - Context-aware reminders and motivational messages
  - Conversation continuity via `ai_threads/{uid}/threads/{threadId}`
- **Scheduler**: Client-side scheduling service

### 6. Solo Room
- **New View**: SoloRoomView
- **Features**:
  - Focus timer integration
  - AI chat panel for check-ins
  - Quick reflection input
  - Focus mode activation (suppresses notifications)
  - AI wrap-up on session end

## New Firestore Collections

### user_settings/{uid}
```typescript
{
  notificationEnabled: boolean
  pushEnabled: boolean
  aiCheckInEnabled: boolean
  aiCheckInIntervalMinutes: number (default: 120)
  quietHours: { start: "22:00", end: "07:00", enabled: boolean }
  timezone: string
  focusMode: { enabled: boolean }
  uiDensity: "compact" | "standard" (default: "compact")
}
```

### notifications/{notificationId}
```typescript
{
  uid: string
  type: "ai" | "reminder" | "challenge" | "workout" | "system"
  title: string
  body: string
  createdAt: Timestamp
  readAt?: Timestamp
  link?: string
}
```

### push_tokens/{uid}/tokens/{tokenId}
```typescript
{
  token: string
  platform: "web"
  createdAt: Timestamp
  lastSeenAt: Timestamp
}
```

### workouts/{uid}/entries/{entryId}
```typescript
{
  date: string (YYYY-MM-DD)
  type: string
  durationMinutes: number
  notes?: string
  completed: boolean
  createdAt: Timestamp
}
```

### challenges/{uid}/items/{challengeId}
```typescript
{
  name: string
  startDate: string
  durationDays: number
  rules: Array<{ id: string, label: string, required: boolean }>
  active: boolean
  createdAt: Timestamp
}
```

### challenge_days/{uid}/days/{dayId}
```typescript
{
  challengeId: string
  date: string
  ruleStatus: { [ruleId: string]: boolean }
  completed: boolean
  updatedAt: Timestamp
}
```

### ai_threads/{uid}/threads/{threadId}
```typescript
{
  messages: Array<{ role: string, content: string, createdAt: Timestamp }>
  contextSummary: string
  updatedAt: Timestamp
}
```

## Files Modified

### Core Infrastructure
- `types.ts` - Added all new interfaces
- `lib/firebase.ts` - Added Firebase Cloud Messaging
- `services/firebaseService.ts` - Extended with CRUD for new collections
- `services/notificationService.ts` - **NEW** - Notification logic
- `services/aiSchedulerService.ts` - **NEW** - Proactive AI scheduling

### New Components
- `components/NotificationCenter.tsx` - **NEW** - In-app notifications
- `components/WorkoutsView.tsx` - **NEW** - Workout tracking
- `components/ChallengesView.tsx` - **NEW** - Challenge management
- `components/SoloRoomView.tsx` - **NEW** - Focus + AI room
- `components/UserSettingsModal.tsx` - **NEW** - Settings panel

### Modified Components
- `App.tsx` - Added new routes, notification bell, updated nav
- `DashboardView.tsx` - Compacted UI by ~35%
- `AdhkarView.tsx` - Compacted mobile layout
- `CalendarView.tsx` - Default view set to Day
- `AIAssistantView.tsx` - Enhanced with proactive features

### Service Worker
- `public/firebase-messaging-sw.js` - **NEW** - Background push handling

## Testing Checklist

### Build & TypeScript
- [ ] `npm run build` completes without errors
- [ ] `npm run type-check` passes
- [ ] No console errors in dev mode

### UI Compaction
- [ ] Dashboard loads faster and shows more info above fold
- [ ] Adhkar scrolls properly on mobile (≤480px width)
- [ ] Calendar opens to Day view by default
- [ ] All views feel denser but readable

### Notifications
- [ ] In-app notification bell shows unread count
- [ ] Clicking bell opens notification center
- [ ] Notifications mark as read on click
- [ ] Push permission request appears (single, non-annoying CTA)
- [ ] Push notifications arrive in foreground (toast + in-app)
- [ ] Push notifications arrive in background (service worker)
- [ ] Quiet hours block notifications correctly
- [ ] Focus mode suppresses notifications

### AI Proactivity
- [ ] AI sends check-ins at configured interval
- [ ] AI frequency can be changed in settings
- [ ] AI respects quiet hours
- [ ] AI pauses during focus mode
- [ ] AI messages are contextual and supportive
- [ ] Conversation continuity works across sessions

### Workouts
- [ ] Can add new workout
- [ ] Can edit existing workout
- [ ] Workouts list by date
- [ ] Today's workout shows on Dashboard
- [ ] No crashes or data loss

### Challenges
- [ ] Can create new challenge
- [ ] Can run multiple challenges simultaneously
- [ ] Daily checklist updates per challenge
- [ ] Templates (75 Hard, 21-Day) work
- [ ] Custom duration challenges work
- [ ] AI references specific unchecked items
- [ ] Completion logic works correctly

### Solo Room
- [ ] Timer starts/stops correctly
- [ ] Focus mode activates on start
- [ ] Notifications suppressed during session
- [ ] AI chat panel works
- [ ] Reflection input saves
- [ ] AI wrap-up triggers on session end
- [ ] Focus mode deactivates on end

### Existing Features (No Regressions)
- [ ] Authentication works (sign up/login/logout)
- [ ] Tasks CRUD operations work
- [ ] Prayer tracking works
- [ ] Quran log works
- [ ] Planner view works
- [ ] Pomodoro timer works
- [ ] Garden/Study rooms work
- [ ] Theme toggle works
- [ ] Profile modal works

## Deployment Notes

### Environment Variables Required
Ensure these are set in production:
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
VITE_FIREBASE_VAPID_KEY  # NEW - for FCM push
```

### Firebase Console Setup
1. Enable Cloud Messaging in Firebase Console
2. Generate VAPID key for web push
3. Add VAPID key to environment variables
4. Update Firebase security rules for new collections

### Post-Deployment
1. Test push notifications on production URL
2. Verify service worker registration
3. Monitor Firestore usage for new collections
4. Check AI scheduler performance

## Performance Considerations

- **Notification polling**: Uses real-time Firestore listeners (no polling)
- **AI scheduling**: Client-side only (future: Firebase Functions scheduled job)
- **Service worker**: Minimal bundle, lazy-loaded
- **UI compaction**: Reduces DOM nodes and improves scroll performance

## Future Enhancements (Out of Scope)

- Firebase Functions for server-side AI scheduling
- Advanced workout analytics
- Challenge leaderboards
- AI voice mode
- Offline-first architecture

## Notes

- All changes maintain backward compatibility
- No existing Firestore collections modified (only new fields added)
- Authentication and routes preserved
- Mobile-first design philosophy maintained throughout
- Focused on stability and user experience

---

**Last Updated**: December 27, 2025
**Version**: 2.0.0 (Major Upgrade)
