# Salsabil Development Notes

## Overview
Salsabil is a productivity and spiritual growth app combining task management, Islamic spiritual tracking, and an AI companion called Noor.

## Upgrade History

### v3.0.0 — Noor 2.0: Jarvis AI Upgrade (February 2026)
Major AI transformation:

**Removed:**
- Solo Room (SoloRoomView) — functionality absorbed into Noor AI

**New AI System (components/ai/):**
- `AIAssistantViewJarvis.tsx` — Jarvis-style dark theme AI interface with animated orb
- `JarvisOrb.tsx` — Animated CSS orb with 5 states (idle/listening/thinking/speaking/acting)
- `NoorAmbientBackground.tsx` — Dark HUD with floating particles
- `NoorMiniOrb.tsx` — Floating quick-access orb on all views
- `ActionConfirmation.tsx` — AI action confirm/dismiss UI
- `AudioVisualizer.tsx` — Real-time voice waveform visualization
- `DailyBriefing.tsx` — Morning/evening briefing component
- `MeetNoorOnboarding.tsx` — First-time user onboarding for Noor

**New Services:**
- `aiMemoryService.ts` — Long-term memory with decay/boost (Firestore: users/{uid}/ai_memory/)
- `aiContextService.ts` — Gathers ALL app data for AI context
- `aiActionService.ts` — AI function calling (create tasks, log prayers, etc.)

**New Hooks:**
- `useNoorState.ts` — Orb state machine
- `useAudioVisualizer.ts` — Web Audio API integration

**Fixed:**
- Push notifications (service worker registration, Firebase config injection, VAPID key)
- Notification foreground handler wired up

**Enhanced:**
- Groq system prompt: Jarvis-level intelligence, pattern analysis, action execution
- Notification generator: better context passing
- Tailwind: 15+ new animation keyframes, noor color palette

### v2.0.0 — Major Upgrade (December 2025)
- UI compaction (mobile-first)
- Notifications system (in-app + push)
- Workout tracking
- Multiple concurrent challenges
- Proactive AI check-ins

## Firestore Collections

### Core
- `users/{uid}/tasks` — Task items
- `users/{uid}/settings/prayerLogs` — Prayer tracking
- `users/{uid}/settings/quranLogs` — Quran reading logs
- `users/{uid}/settings/pomodoro` — Pomodoro settings
- `users/{uid}/challenges` — Active challenges
- `users/{uid}/workouts` — Workout entries

### AI
- `users/{uid}/ai_memory/` — Noor's long-term memory (goals, struggles, milestones, preferences)
- `ai_threads/{uid}/threads/{threadId}` — Conversation threads

### Notifications
- `notifications/{notificationId}` — In-app notifications
- `push_tokens/{uid}/tokens/{tokenId}` — FCM push tokens

### Garden
- `studyRooms/{roomId}` — Study circle rooms
- `studyRooms/{roomId}/participants/{uid}` — Room participants

## Environment Variables
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_VAPID_KEY          # Required for push notifications
VITE_GROQ_API_KEY                # Groq AI (also set GROQ_API_KEY on Netlify)
```

## Tech Stack
- React 19, TypeScript, Vite 6, Tailwind CSS 3
- Firebase (Auth + Firestore + Cloud Messaging)
- Groq SDK (llama-3.3-70b-versatile)
- Three.js (3D garden), framer-motion (animations)
- Netlify (deployment + serverless functions)
