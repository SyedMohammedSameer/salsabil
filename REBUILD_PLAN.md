# Salsabil — Full Rebuild Plan

> **Status:** Planning — ready to implement  
> **Goal:** SF Bay Area startup-grade production app  
> **Audience:** Muslim productivity users blending faith practice with focused work  

---

## Confirmed Decisions

| Decision | Choice |
|---|---|
| AI (V1) | Keep Groq (llama-3.3-70b-versatile) via Netlify function |
| AI (V2) | Upgrade to Anthropic Claude API |
| Database | Supabase — new org |
| Hosting | Netlify (`salsabil.netlify.app`, .com later) |
| Analytics | Self-hosted Umami |
| Logo + icons | Carry over from existing (`salsabil-original.png` + all icon sizes) |
| Brand colors | Teal/emerald primary (see Design System below) |
| Theme | Dark + Light, both first-class |

---

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Build | Vite + React 19 + TypeScript | Keep — already correct |
| Styling | Tailwind v4 + shadcn/ui | shadcn gives owned, accessible primitives |
| Animation | Framer Motion | Meaningful transitions only |
| Garden rendering | PixiJS | GPU-accelerated 2D, Forest-app tier quality |
| Auth + DB | Supabase | Postgres, RLS, versioned migrations |
| AI V1 | Groq (Netlify function) | Keep existing, already works |
| AI V2 | Anthropic Claude API | Context-aware, tool-use, streaming |
| Notifications | Web Push API + Supabase | Replace Firebase FCM |
| Router | React Router v7 | File-based routes, deep link support |

---

## Why Supabase over Firebase

- Postgres gives real relational schema — prayers, tasks, sessions have foreign keys
- RLS policies are testable SQL — not Firestore DSL that nobody can verify
- Migrations are versioned files — schema changes are tracked, rollback-safe
- `supabase start` for full local dev
- **User migration:** Google OAuth users re-authenticate seamlessly (OAuth flow is identical, no action needed on their part). Email/password users get a password reset email. Data starts fresh as agreed.

---

## Design System

### Brand Colors (carried from original, corrected)

The original app defined these in `tailwind.config.js` — we keep them, but promote **teal** as the true primary (the original used blue as primary but the whole visual identity is teal/emerald):

```
noor teal:    #14b8a6  (primary brand color, Noor AI, active states)
accent:       #10b981  (emerald, success states, streak indicators)
warm sand:    #f5f0e8  (light mode backgrounds)
deep slate:   #0f172a  (dark mode backgrounds)
```

PWA `theme-color`: `#14b8a6` (was `#3b82f6` — correcting this)

### Typography
- Geist Sans — body, UI
- Geist Mono — timers, stats, coin counts

### Glassmorphism — Surgical Use Only
- Sidebar rail, modals, floating cards
- Rule: glass = `backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20`
- Never apply to full-page backgrounds or list items

### Dark / Light Mode
- CSS variables on `:root` and `.dark`
- Toggled via `<html class="dark">`, persisted in `localStorage`
- System preference respected on first load
- `prefers-reduced-motion` respected throughout

### Assets to Carry Over
- `public/salsabil-original.png` — 4096×4096 source logo, copy directly
- All `public/salsabil-icon-*.png` sizes — copy directly
- `public/favicon.ico` + `public/favicon.png` — copy directly
- `public/manifest.json` — rewrite content but keep icon references

---

## Navigation — Locked Pattern

Specified up front because this has broken before. **Do not deviate from this.**

```
Desktop (≥1024px):
  Left sidebar rail
  Collapsed: 64px wide — icons only
  Expanded: 240px wide — icons + labels
  Toggle chevron at bottom of rail
  Active state: teal accent bar on left edge + filled icon
  Max 8 items; overflow goes to Settings page link

Mobile (<1024px):
  Bottom tab bar — fixed, safe-area-inset-bottom padding
  5 primary items max
  Overflow items accessible via "More" bottom sheet
  Active: filled icon + label in teal
  NO hamburger menus. NO slide-out drawers. Zero exceptions.
```

Single `<Navigation>` component renders both layouts via responsive CSS.  
`useNavigation` hook owns active route state.  
Framer Motion `layoutId` for active indicator animation.

**Nav items (primary 5 for mobile):**
1. Dashboard (Home)
2. Focus (Pomodoro + Garden combined entry)
3. Noor (AI)
4. Prayers
5. More → sheet with: Tasks, Calendar, Quran, Adhkar, Workouts, Challenges

**Desktop sidebar groups:**
- Core: Dashboard, Focus, Tasks, Calendar
- Spiritual: Prayers, Quran, Adhkar
- Growth: Challenges, Workouts
- Bottom: Noor AI, Profile/Settings

---

## Feature Completeness Audit

Cross-checked against original app. Everything below must be in the rebuild.

### V1 Core (was missing from first draft of plan)
- **Calendar view** — monthly grid with task dots, tap day to see tasks. Separate from the weekly Planner. Original had `CalendarViewImproved.tsx` as a distinct view.
- **Weekly Planner** — week columns, time slots, task cards. Separate from Calendar.
- **Fardh + Sunnah tracking** — original prayer tracker tracks both. Schema must store both. Plan had only fardh.
- **Tahajjud** — 6th prayer type in the original. Include in schema and UI.
- **Noor Mini Orb** — floating persistent bubble across all non-AI views. Tap = open Noor panel. Shows notification badge when Noor has a suggestion.
- **Noor onboarding flow** — "Meet Noor" first-time walkthrough (4 steps: Meet / She Listens / She Thinks / She Acts). Shown once per user, stored in Supabase profile.
- **Text-to-speech** — Noor speaks her responses aloud. Web Speech API, gender-selectable voice, platform-native voice quality (Samantha on macOS, Daniel on macOS UK, etc.). User can mute in settings.
- **In-app Notification Center** — bell icon in header, list of unread in-app notifications (AI check-ins, streak alerts, challenge updates).
- **Push notifications** — Web Push API via Supabase Edge Functions or Netlify. Replaces Firebase FCM. User grants permission on first login.
- **Deep links for Study Rooms** — `/join/:roomId` route handling. Original had this. Must carry forward. Store pending invite in sessionStorage, resolve after auth.

### V2 Additions (was missing from first draft)
- **AI long-term memory** — original had `aiMemoryService.ts` with category-based memory (goals, struggles, preferences, milestones, spiritual, insights) and a relevance decay score. V2 stores this in Supabase `ai_memories` table instead of Firestore.
- **AI Personality Profile** — original tracked `communicationStyle`, `engagementRate`, `mostProductiveTime`, `prayerConsistencyScore` etc. V2 carries this forward in `user_ai_profiles` table, updated by background analysis.
- **Challenges with templates** — original had 75 Hard, 21-Day Consistency, Ramadan Challenge templates plus custom rules. Keep all three templates. Ramadan template is important (Islamic context).
- **Challenge XP system** — original had XP per challenge day. In rebuild, XP is replaced by coins but the mechanic (daily check-off + reward) stays.

---

## Version 1 — Foundation

**Goal:** Polished, tested, production-ready core.  
**Scope:** Dashboard, Prayer, Quran, Adhkar, Tasks, Planner, Calendar, Pomodoro, Garden, Noor (Groq), Notifications.  
**Timeline estimate:** 8–10 weeks

---

### Phase 1 — Infrastructure & Design System

**Goal:** Zero features. Bones are unbreakable.

#### 1A — Project Scaffold
- Fresh Vite + React 19 + TypeScript on this branch (wipe existing src, keep public assets)
- ESLint + Prettier + Husky pre-commit hooks (lint + type-check on commit)
- Absolute imports: `@/components`, `@/lib`, `@/hooks`, `@/views`, `@/services`, `@/utils`
- Tailwind v4 config with full design token set (colors, spacing, radius, shadows, blur)
- shadcn/ui init — component theme matched to Salsabil brand colors
- Dark/light mode system: `useTheme` hook, `ThemeProvider`, `ThemeToggle` component
- `ErrorBoundary` at app root with friendly fallback UI
- React Router v7 setup: `/`, `/focus`, `/ai`, `/prayers`, `/quran`, `/adhkar`, `/tasks`, `/calendar`, `/planner`, `/workouts`, `/challenges`, `/profile`, `/join/:roomId`
- `<PageMeta>` component for per-page titles

#### 1B — Supabase Setup
- New Supabase project (new org)
- Schema migrations in `supabase/migrations/`

**Tables:**
```sql
profiles            (id uuid PK → auth.users, username, avatar_url, display_name,
                     preferences jsonb, ai_onboarding_done bool, created_at)

prayer_logs         (id, user_id, date date, 
                     fajr_fardh bool, fajr_sunnah bool,
                     dhuhr_fardh bool, dhuhr_sunnah bool,
                     asr_fardh bool, asr_sunnah bool,
                     maghrib_fardh bool, maghrib_sunnah bool,
                     isha_fardh bool, isha_sunnah bool,
                     tahajjud bool, notes text,
                     UNIQUE(user_id, date))

quran_logs          (id, user_id, date date, surah_number int, 
                     ayah_start int, ayah_end int, pages numeric, 
                     duration_minutes int, notes text, created_at)

adhkar_logs         (id, user_id, date date, set_id text, completed_at timestamptz)

tasks               (id, user_id, title, description, due_date date, 
                     start_time time, end_time time, priority text, 
                     category text, completed bool, completed_at timestamptz,
                     created_at, updated_at)

subtasks            (id, task_id, user_id, text, completed bool, sort_order int)

focus_sessions      (id, user_id, started_at timestamptz, ended_at timestamptz,
                     duration_minutes int, mode text, completed bool, 
                     killed bool, task_id uuid → tasks, tree_id uuid → garden_trees)

garden_trees        (id, user_id, session_id, species_id text, 
                     planted_at timestamptz, growth_stage int, 
                     is_alive bool, updated_at)

notifications       (id, user_id, type text, title, body, read bool, 
                     read_at timestamptz, link text, created_at)

push_tokens         (id, user_id, token text, platform text, 
                     created_at, last_seen_at)

workouts            (id, user_id, date date, type text, 
                     duration_minutes int, intensity text, notes text, created_at)

challenges          (id, user_id, name, template_id text, start_date date, 
                     duration_days int, active bool, created_at)

challenge_rules     (id, challenge_id, label, required bool, sort_order int)

challenge_days      (id, challenge_id, user_id, date date, completed bool,
                     rule_status jsonb, updated_at,
                     UNIQUE(challenge_id, date))
```

- RLS on every table: `auth.uid() = user_id`
- Supabase Auth: Google OAuth + Email/Password
- DB trigger: auto-create `profiles` row on `auth.users` insert
- `lib/supabase.ts` singleton + `lib/supabase.types.ts` (generated via `supabase gen types`)

#### 1C — Auth Flow
- `<AuthProvider>` — session, user, loading, signOut
- `<AuthPage>` — full-page auth (not a modal overlay): Google OAuth + email form, clean centered layout
- Protected route wrapper — redirects unauthenticated users to `/auth`
- `<UsernamePromptModal>` — triggered after first sign-in if `profiles.username` is null
- Pending invite handling: deep link `/join/:roomId` stores roomId in sessionStorage before auth redirect, resumes join after auth

#### 1D — Navigation Component
- Built exactly to spec above — single `<Navigation>` component
- Desktop sidebar: smooth 64px ↔ 240px transition, Framer Motion width animation
- Mobile bottom bar: fixed, `pb-[env(safe-area-inset-bottom)]`, no overflow issues
- `useNavigation` hook: current route, navigate function
- Active indicator: Framer Motion `layoutId="nav-active"` pill
- Noor Mini Orb: rendered here, always visible except on `/ai` route
- Theme toggle in sidebar footer (desktop) / accessible via More sheet (mobile)

---

### Phase 2 — Core Views

**Goal:** Prayer, Quran, Adhkar, Tasks, Planner, Calendar — fully functional, beautiful, offline-tolerant.

#### 2A — Dashboard
- Today card: prayers done/5 (or 6 with Tahajjud), focus minutes, Quran pages, tasks done
- Streak row: prayer streak, Quran streak, focus streak — tap each to go to that view
- Rotating Islamic quote (curated local JSON, no API)
- Quick actions: Start Focus, Log Prayer, Log Quran
- Framer Motion entrance animations on stats (staggered)
- Responsive: 1col mobile, 2col tablet, 4col desktop

#### 2B — Prayer Tracker
- Week header tabs — tap a day to view it
- 6 prayer cards per day: Fajr, Dhuhr, Asr, Maghrib, Isha, Tahajjud
- Each card: Fardh toggle (primary) + Sunnah toggle (secondary, smaller)
- Color per prayer: Fajr=orange-pink, Dhuhr=yellow, Asr=amber, Maghrib=purple, Isha=indigo, Tahajjud=slate
- Completion ring on each card (fardh = required, sunnah = bonus)
- Monthly heatmap grid at bottom — tap a day to jump to it
- Streak counter with milestone badges
- Optimistic UI: local state update first, Supabase write in background
- `UNIQUE(user_id, date)` means upsert, never duplicates

#### 2C — Quran Log
- Log session modal: surah number + name picker (all 114 surahs), from/to ayah OR pages, duration (auto-counted or manual)
- Today's card: pages today, minutes today
- This week bar chart: pages per day (pure SVG, no chart lib)
- Streak counter
- Session history list: grouped by date

#### 2D — Adhkar
- Three tabs: Morning, Evening, After Prayer
- Each tab has its authentic adhkar list (Arabic text, transliteration, translation, count)
- Counter on each card — tap to increment, ring fills toward target count
- Completion: card glows and checks off when count reached
- Set completion: full-screen celebration (canvas confetti, JS only, ~2KB)
- Session saved to `adhkar_logs` on set completion
- Daily reset at midnight (local time)

#### 2E — Task Manager
- Four sections: Overdue (red), Today, This Week, Later
- Each task card: title, priority dot, due date, subtask progress bar
- Add task FAB → modal: title, due date+time (optional), priority, category, description, subtasks
- Swipe right to complete (mobile), checkbox on desktop
- Swipe left to delete with undo toast (3 second window)
- Category filter chips above list
- Completed tasks collapse to "Done today" at bottom
- Tasks are editable (tap → edit modal)

#### 2F — Weekly Planner
- 7-day column view (Mon–Sun)
- Each column: date header, list of tasks for that day
- Time-slotted tasks show in timed position within column
- Add task button per column
- Week navigation: prev/next chevrons
- Mobile: single day view with day picker at top, swipe left/right between days
- Today's column always highlighted

#### 2G — Calendar
- Monthly grid view
- Each day cell shows: dot count for tasks (color-coded by priority)
- Tap a day → bottom sheet with tasks for that day + "Add task" button
- Month navigation
- Today highlighted with teal ring
- Shared task data with Planner (same source of truth, different views)

---

### Phase 3 — Garden & Pomodoro

**Goal:** Forest-app quality. This phase has the highest UX bar.

#### 3A — Pomodoro Timer
- Minimal full-screen timer: large countdown, mode label, start/pause/reset
- Mode cycle: Focus → Short Break → Long Break (after N focus sessions)
- All durations configurable in settings
- Session saved to `focus_sessions` on completion
- **Kill flow:** navigating away mid-session → modal: "Your tree will die if you leave. Stay focused?" → confirm kill → session marked `killed: true`, tree marked `is_alive: false`
- Sound: completion chime (single audio file, ~10KB, user can mute)

#### 3B — Tree Rendering System (PixiJS)

**The product differentiator. Gets the most engineering time.**

**Tree Assets — Answered:**  
The question was whether to commission an illustrator or build trees in code. **Decision: SVG-based procedural trees rendered in PixiJS.** This means:
- Trees are drawn programmatically using PixiJS Graphics API (bezier curves, fills, layering)
- Each species has a defined growth algorithm (branching rules, leaf shapes, color palette)
- This is Forest-app quality because Forest itself uses programmatic rendering, not static illustrations
- No illustrator cost, no asset pipeline, infinite variation
- Wind sway: `gsap.to` on branch pivot points, ~0.3s ease-in-out loop
- This approach also means trees can be killed/grown in real time with smooth transitions

**Species V1 (6, all unlocked):**
- Olive (`zaytoun`) — silver-green canopy, gnarled trunk
- Palm (`nakhl`) — tall single trunk, frond crown
- Cedar (`arz`) — triangular silhouette, layered branches
- Fig (`teen`) — wide spreading canopy, thick trunk
- Pomegranate (`rumman`) — rounded bushy, small leaves
- Lotus (`lotus`) — aquatic, grows from water surface

**Growth stages (6):**
1. Seed — small oval in soil
2. Sprout — stem + 2 cotyledon leaves
3. Sapling — 4–6 leaves, thin trunk
4. Young tree — branching begins, fuller canopy
5. Mature tree — full canopy, thick trunk, species-defining form
6. Ancient tree — massive, gnarly, glowing faintly in dark mode

**Garden Layout:**
- Isometric grid rendered in PixiJS
- Trees placed in rows, oldest top-left, newest bottom-right
- Tap a tree: tooltip card (species, planted date, session duration, growth stage)
- Long-press a tree (mobile) or right-click (desktop): same tooltip
- Pinch-to-zoom + two-finger pan (mobile), scroll-to-zoom + drag (desktop)
- Day/night visual: light mode = warm daylight sky, dark mode = deep blue night with stars
- Killed trees: desaturated, drooping, slightly transparent — stay as reminders
- Active session: seed is visible in garden while timer runs

**Garden View Tabs:**
- My Garden (main PixiJS canvas)
- Species Library (grid of species cards, shows unlock status)
- Sessions (chronological list with mini tree preview)

#### 3C — Pomodoro ↔ Garden Integration
- Timer start: seed placed in garden in real time (PixiJS scene updates)
- Timer complete: seed grows to Sprout with animated transition
- Timer killed: Sprout wilts with drooping animation + grey filter
- All transitions use Framer Motion for the overlay, PixiJS for the tree itself

#### 3D — Noor AI (V1 — Groq)
This is V1 Noor: better than the current version, but not yet V2's full intelligence.

- Groq via Netlify function (same architecture as current)
- Full context injection server-side:
  - Today's prayer status, tasks due, focus sessions today, streaks
  - Time of day, day of week
  - Last 5 conversation messages
- Tool-like responses: Noor can express intent ("I'll add that task for you") but actual action execution is V2
- Voice input: Web Speech API → transcript → send as text message
- Text-to-speech: Noor speaks responses. Platform-native voices, gender-selectable. Mutable in settings.
- Noor Mini Orb: persists across all views, pulsing teal animation, notification badge
- Noor onboarding: "Meet Noor" 4-step flow on first login (stored in `profiles.ai_onboarding_done`)
- Conversation stored in `localStorage` (ephemeral, clears on page reload) — Supabase persistence is V2

---

### Phase 4 — Testing & Hardening

**Goal:** Ship nothing untested. No new features in this phase.

#### 4A — Unit Tests (Vitest)
- All utility functions: date formatting, streak calculation, prayer completion scoring, coin math
- All custom hooks: `useTimer`, `useGarden`, `useStreak`, `useTheme`, `useAuth`
- Supabase service functions: all queries tested with mocked `@supabase/supabase-js` client
- Auth context: all state transitions (loading → authenticated, loading → unauthenticated, sign out)
- Prayer log upsert logic: same-day upsert doesn't create duplicate
- Target: 80%+ coverage on services + hooks

#### 4B — Integration Tests (Vitest + Testing Library)
- Prayer: tap Fajr fardh → optimistic UI updates → Supabase upsert called
- Pomodoro: start timer → reach 0 → session saved → garden tree count +1
- Task: create task → appears in today section → swipe complete → moves to done
- Adhkar: complete full morning set → adhkar_log saved → completion animation fires
- Calendar: add task from day tap → appears in planner week view for same date
- Auth: sign in with Google → profile row created → username prompt shown if needed

#### 4C — E2E Tests (Playwright)
Runs against `supabase start` local instance:

1. New user: sign up → username prompt → complete → land on dashboard
2. Focus: start 25min session → complete → garden shows new tree
3. Kill: start session → click kill → confirm → tree is dead in garden
4. Prayers: log all 5 fardh prayers → streak increments to 1
5. Quran: log session → appears in Quran log list
6. Task: create task → mark complete → moves to done section
7. Adhkar: complete morning set → completion celebration fires
8. Calendar: navigate to calendar → tap today → add task → appears in planner

CI: GitHub Actions workflow runs unit + integration on every push, E2E on every PR to main.

#### 4D — Database & Security Tests
Using pgTAP in `supabase/tests/`:
- User A cannot SELECT from `prayer_logs` where `user_id = User B`
- Unauthenticated request returns 0 rows on all tables
- `UNIQUE(user_id, date)` on `prayer_logs` — insert duplicate date throws, upsert succeeds
- Profile creation trigger fires on new auth user
- RLS on `notifications`: user can only read their own

#### 4E — Performance & Accessibility
- Lighthouse CI in GitHub Actions: target 95+ performance, 100 accessibility
- PixiJS garden: 60fps verified on mid-range Android (Galaxy A-series target)
- Bundle audit: `vite-bundle-visualizer` run, no chunk > 300KB
- All icon buttons have `aria-label`
- All interactive elements keyboard-navigable (Tab + Enter + Space)
- Color contrast: WCAG AA in both dark and light mode
- `prefers-reduced-motion`: all Framer Motion animations wrapped

#### 4F — Cross-browser & Responsive
- Chrome 120+, Firefox 120+, Safari 17+ (desktop)
- Chrome Android, Safari iOS 16+
- Breakpoints: 375px (iPhone SE), 390px (iPhone 15), 768px (tablet), 1024px, 1440px
- Bottom tab bar: `safe-area-inset-bottom` tested on iPhone with home indicator
- Web Speech API: graceful degradation (mic button hidden if not supported)

---

## Version 2 — AI Upgrade, Gamification & Growth

**Goal:** The app becomes intelligent, rewarding, and the users' daily companion.  
**Prerequisite:** V1 shipped, stable, all tests passing.  
**Timeline estimate:** 10–12 weeks

---

### Phase 1 — AI Upgrade (Noor V2)

**Goal:** Replace Groq with Claude. Noor goes from chatbot to genuine productivity co-pilot.

#### 1A — Claude API Migration
- Replace Groq calls with Anthropic Claude API (`claude-sonnet-4-5` for conversations, `claude-haiku-4-5` for quick actions)
- Prompt caching on system prompt — saves ~70% of token cost on repeated calls
- Response streaming — chunks rendered as they arrive, no spinner wait
- Netlify function rewrite: `ai-chat.ts` now calls Claude instead of Groq
- All existing prompt structure migrated + improved

#### 1B — Full Context Injection (Server-Side)
Before every Claude call, Netlify function assembles:
```
- Current datetime + timezone + day of week + hijri date
- Today's prayer log (which fardh + sunnah completed)
- Tasks due today + overdue tasks
- Focus sessions last 7 days (duration, completed/killed ratio)
- Quran sessions last 7 days
- Active streaks (prayer, quran, focus, workout)
- User's ai_profile (communication style, most productive time, etc.)
- Relevant memories from ai_memories (top 5 by recency + relevance score)
- Last 20 messages of current conversation
```
No context is assembled client-side. Client sends only the user message.

#### 1C — AI Actions (Tool Use)
Noor can execute real actions via Claude's tool use feature:

```
Tools:
  create_task(title, due_date?, priority?, category?)
  complete_task(task_id)
  log_prayer(prayer_name, include_sunnah?, date?)
  log_quran(pages?, surah?, duration_minutes?)
  log_adhkar(set_id)
  start_focus_session(duration_minutes?, task_id?)
  get_todays_summary()             ← read-only, executes silently
  get_streak_report()              ← read-only, executes silently
  get_tasks(filter?)               ← read-only
  schedule_reminder(message, iso_datetime)
  log_workout(type, duration_minutes, notes?)
```

- Read-only tools execute and return data inline (no confirmation needed)
- Write tools show a confirmation card in the chat before executing
- User can approve or dismiss the action card
- Failed actions report back to Noor in the next turn so she can recover

#### 1D — AI Memory (Persistent)
- `ai_memories` table: (id, user_id, category, content, relevance_score, created_at, source_conversation_id)
- Categories: goal, struggle, preference, milestone, spiritual, insight
- After each conversation, Claude (in a separate background call) extracts any memories worth storing
- Relevance decay: cron job (Netlify scheduled function, weekly) reduces `relevance_score` of old memories by 0.1
- Top 5 memories by score injected into every conversation context

#### 1E — AI Personality Profile
- `user_ai_profiles` table: communication_style, preferred_notification_times[], engagement_rate, most_productive_time, prayer_consistency_score, etc.
- Updated by background analysis after each session (not blocking the conversation)
- Noor adapts tone based on `communication_style`: encouraging / direct / casual / formal

#### 1F — Proactive Intelligence
- Morning brief push notification at user-configured time
- Prayer break reminder: if user is mid-focus-session and prayer time is near
- Streak protection: if streak at risk and 2 hours left in the day
- Pattern nudges: "You've been most productive on Tuesday mornings — want to block that time?"
- All delivered via Web Push. Noor's push message text is Claude-generated per user (not templated).

#### 1G — Noor UI V2
- Redesigned panel: full-height side panel on desktop, full-screen modal on mobile
- Streaming text renders word by word
- Action confirmation cards inline (not a separate modal)
- Voice input: same Web Speech API, now with real-time transcript shown
- Voice output: same TTS, now uses Claude's response directly
- Memory viewer: settings section shows what Noor remembers about you, with delete per memory
- Conversation history: last 10 conversations stored in Supabase, browsable

---

### Phase 2 — Gamification

**Goal:** Coins for focus and faith. Trees as the reward. Garden as the flex.

#### 2A — Coin Economy

| Action | Coins | Daily Cap |
|---|---|---|
| Complete focus session (25min) | 10 | — |
| Complete focus session (50min+) | 25 | — |
| Log all 5 fardh prayers | 20 | 20 |
| Log individual fardh prayer | 2 | 10 |
| Log all sunnah prayers (day) | 10 | 10 |
| Log Quran (any session) | 5 | — |
| Log Quran (30min+) | 15 | 15 |
| Complete Morning or Evening adhkar set | 8 | 16 |
| Complete a task | 3 | 30 |
| Log Tahajjud | 5 | 5 |
| Complete a workout | 10 | 10 |
| Complete challenge day | 15 | 15 |
| Study group session (30min+) | 20 | 20 |
| 7-day prayer streak | 50 | — (milestone, once) |
| 7-day focus streak | 50 | — (milestone, once) |
| 30-day any-habit streak | 200 | — (milestone, once) |

**Anti-gaming:**
- Focus session coins only on `completed = true, killed = false, duration_minutes >= 0.8 * target`
- Server-side coin award only (Netlify function checks the DB record before writing to ledger)
- Daily caps enforced server-side (query coin_ledger for today's total per category)

#### 2B — Coin System Backend
- `coin_ledger` — append-only (id, user_id, amount, reason, action_ref, created_at)
- `user_coin_balance` — Postgres view: `SUM(amount) WHERE user_id = ?`
- `species_owned` — (user_id, species_id, purchased_at)
- Client never touches `coin_ledger` directly — RLS blocks INSERT for client
- Only Netlify functions with service role key can insert coins
- Client reads balance via `user_coin_balance` view (RLS: own row only)

#### 2C — Tree Shop
12 total species (6 unlocked by default from V1, 6 purchasable):

| Species | Price | Quranic Reference |
|---|---|---|
| Olive (Zaytoun) | Free | Surah An-Nur 24:35 |
| Palm (Nakhl) | Free | Surah Maryam 19:25 |
| Cedar (Arz) | Free | Surah Ibrahim 14:24 |
| Fig (Teen) | Free | Surah At-Teen 95:1 |
| Pomegranate (Rumman) | Free | Surah Al-An'am 6:141 |
| Lotus (Sidr) | Free | Surah An-Najm 53:14 |
| Ancient Olive (Zaytouna) | 100 coins | Surah Al-Mu'minun 23:20 |
| Lote Tree (Sidrat al-Muntaha) | 300 coins | Surah An-Najm 53:14 |
| Jasmine (Yasmeen) | 80 coins | — |
| Rose of Jericho | 200 coins | — |
| Tuba Tree (Paradise) | 500 coins | Hadith reference |
| Sacred Fig (Bodhi-variant) | 150 coins | — |

**Shop UI:**
- Grid of species cards: illustrated preview, name, Quranic reference, price or "Owned"
- Locked: card slightly dimmed, coin badge with price, "Purchase" button
- Owned but not active: "Select" button
- Active for next session: teal checkmark border
- Balance displayed in header of shop

#### 2D — Achievements (20 total)
| Achievement | Trigger | Coin Reward |
|---|---|---|
| First Tree | Plant first tree | 20 |
| Consistent | 7-day prayer streak | 50 |
| Scholar | 30 Quran sessions | 30 |
| Iron Focus | 50 completed sessions | 40 |
| Green Thumb | 50 trees planted | 50 |
| Never Quit | 30 sessions, 0 killed | 100 |
| Night Prayer | Log Tahajjud 10 times | 30 |
| Morning Person | Complete morning adhkar 21 days | 40 |
| Balanced | Log all 3: prayer + quran + focus in same day, 7 days | 75 |
| Challenger | Complete a 21-day challenge | 60 |
| Ramadan | Complete Ramadan challenge | 150 |
| Ancient Grove | Own an Ancient tree (stage 6) | 30 |
| Collector | Own all 12 species | 100 |
| Streak Master | Any single streak to 30 days | 100 |
| Centurion | 100 focus sessions total | 80 |
| ... | (5 more to define) | ... |

Achievement notification: slide-in toast with illustrated icon + coin amount earned.

---

### Phase 3 — Workouts, Study Rooms, Challenges & Analytics

#### 3A — Workouts (Full)
- Log workout: type picker (cardio, strength, flexibility, sport, walk, yoga, swim, other), duration, intensity (easy/moderate/hard), notes
- Weekly view: 7-day grid showing workout types + duration
- Monthly heatmap
- Personal records: for strength exercises, track max weight/reps
- Streak tracking
- Coin integration: 10 coins per session (server-side, via same Netlify function pattern)

#### 3B — Challenges (Rebuilt)
- Templates: 75 Hard, 21-Day Consistency, Ramadan (30-day), + Custom
- Ramadan template rules: fast, quran (1 page min), tahajjud (optional), charity (optional), dua
- Custom: user names challenge, sets duration (1–100 days), adds custom rules (required/optional)
- Daily check-in: check off each rule for today
- Calendar view of completion history (heatmap within challenge)
- Streak tracking per challenge
- Completion reward: coin payout at end of full challenge
- Active challenges listed on Dashboard

#### 3C — Study Rooms (Rebuilt)
- Room creation: name, description, focus duration, tree species for session
- Join by code (6-char alphanumeric) or deep link `/join/:roomId`
- Realtime via Supabase Realtime subscriptions
- Participants: list of avatars, ready/not-ready state
- Shared countdown timer — host starts it, all participants sync within 500ms
- Session in progress: participant list shows who's still in, who killed
- Chat: minimal — text messages + emoji reactions only, visible during session
- Session end: all completers get coin reward
- Room history per user
- Username prompt for nameless users before joining

#### 3D — Profile
- Avatar (upload to Supabase Storage or use initials fallback)
- Username, display name
- Coin balance with sparkline of last 7 days' earnings
- Achievement showcase: 3 pinned + all unlocked
- Stats: total focus hours, total prayers logged, total trees planted, longest streak
- Joined date

#### 3E — Settings
- Notifications: push on/off, morning brief time, streak alerts, quiet hours (start/end)
- Prayer times: configure each prayer time manually (no external API)
- Timer: default durations, long break interval, sound on/off
- Noor: communication style, TTS voice gender, TTS on/off, memory viewer
- Theme: light/dark/system
- Account: change email, change password, export data (JSON), delete account

#### 3F — Analytics
- Focus time: bar chart by day of week (last 4 weeks)
- Prayer consistency: heatmap last 90 days (each cell = % of prayers done that day)
- Quran progress: cumulative pages line chart
- Coin earning: bar chart by category
- All charts: custom SVG, no chart library dependency
- Export as PNG: canvas capture button

---

### Phase 4 — Testing, Security & Launch

#### 4A — Extended Tests
- All coin calculation: focus session → server function called → ledger entry created
- Daily cap enforcement: 11th task completion → no coin awarded
- Streak milestone bonus: exactly one milestone coin award per threshold
- Species purchase: deduct coins → species_owned row → species available in garden
- Achievement triggers: all 20 achievements have dedicated test
- Study room: 2 users complete session → both receive coins
- AI tools: each of 10 tools tested with mock Supabase + Claude mock
- AI memory extraction: conversation with memorable info → memory row saved

#### 4B — Security Audit
- Full RLS re-audit: every table, SELECT + INSERT + UPDATE + DELETE
- `coin_ledger`: verify client insert is blocked (test returns RLS error)
- `species_owned`: client can read, only server can insert
- All Netlify functions: validate JWT from `Authorization: Bearer <token>` header
- Rate limiting: per user_id, 60 requests/minute per function
- Input validation: all function inputs validated (no SQL injection via jsonb)
- Claude/Groq API key: never in client bundle (grep check in CI)
- CORS: Netlify `_headers` file limits to `salsabil.netlify.app`
- CSP: `Content-Security-Policy` header configured
- No PII in server logs (no logging of message content)

#### 4C — Load Testing (k6)
- 100 concurrent focus session completions (POST `/api/award-coins`)
- 100 concurrent prayer log upserts
- Study room: 20 participants subscribing to same Realtime channel
- Supabase connection pool: verify no pool exhaustion under load
- PixiJS garden: DOM test with 200 trees rendered simultaneously

#### 4D — E2E Tests (Full Suite)
V1 tests + all of the following:
- Earn coins from completed focus session → balance updates in shop
- Purchase tree species → species shows in garden selector
- Achievement triggered → toast notification → shows in profile
- Study room: User A creates → User B joins → session completes → both get coins
- AI V2: ask Claude to create task → action card shown → confirm → task in DB
- AI V2: ask for today's summary → correct data returned from DB
- AI memory: chat with goal statement → memory row exists in DB after conversation
- Challenges: complete Ramadan challenge day → day marked done → coin awarded

#### 4E — Observability
- Sentry (free tier): client + Netlify functions
- Sentry performance traces on all Netlify function calls
- Supabase dashboard: slow query monitor, alerts on queries > 1s
- Uptime: UptimeRobot on `salsabil.netlify.app` (free tier, 5-min interval)
- Self-hosted Umami: install on a $5/mo VPS or use Umami Cloud free tier

#### 4F — Launch Checklist
- [ ] `salsabil.netlify.app` deployed, HTTPS forced, redirects configured
- [ ] PWA: manifest.json + service worker, installable iOS + Android
- [ ] All `og:` meta tags (title, description, image) on every page
- [ ] `robots.txt` + sitemap
- [ ] Privacy policy page (required for Google OAuth)
- [ ] `netlify.toml`: security headers (CSP, HSTS, X-Frame-Options)
- [ ] Supabase: daily backups enabled, point-in-time recovery enabled
- [ ] Production Supabase project separate from dev project
- [ ] Environment variables: all set in Netlify dashboard (never in code)
- [ ] Umami analytics: tracking snippet in `index.html`
- [ ] PWA icons: all sizes from `salsabil-original.png` regenerated (existing sizes are already correct)

---

## File Structure (Target)

```
salsabil/
├── src/
│   ├── app/
│   │   ├── App.tsx               # Root — providers + router outlet
│   │   ├── router.tsx            # All routes
│   │   └── providers.tsx         # AuthProvider, ThemeProvider, QueryProvider
│   ├── components/
│   │   ├── ui/                   # shadcn/ui (owned — not a dependency)
│   │   ├── layout/
│   │   │   ├── Navigation.tsx    # The only navigation component
│   │   │   ├── Sidebar.tsx       # Desktop — used by Navigation
│   │   │   ├── BottomBar.tsx     # Mobile — used by Navigation
│   │   │   ├── PageShell.tsx     # Consistent page wrapper with title
│   │   │   └── NoorMiniOrb.tsx   # Floating orb — rendered inside Navigation
│   │   └── shared/               # Reusable: StreakBadge, CoinDisplay, etc.
│   ├── views/
│   │   ├── dashboard/
│   │   ├── prayer/
│   │   ├── quran/
│   │   ├── adhkar/
│   │   ├── garden/
│   │   │   ├── GardenView.tsx
│   │   │   ├── PixiGarden.tsx    # PixiJS canvas component
│   │   │   ├── TreeRenderer.ts   # Tree drawing logic
│   │   │   └── species/          # Per-species drawing config
│   │   ├── pomodoro/
│   │   ├── tasks/
│   │   ├── planner/
│   │   ├── calendar/
│   │   ├── workouts/
│   │   ├── challenges/
│   │   ├── study-rooms/
│   │   ├── ai/
│   │   │   ├── NoorView.tsx
│   │   │   ├── NoorMiniOrb.tsx
│   │   │   ├── NoorOnboarding.tsx
│   │   │   ├── ActionCard.tsx
│   │   │   └── MessageBubble.tsx
│   │   ├── profile/
│   │   ├── settings/
│   │   └── analytics/
│   ├── hooks/
│   │   ├── useTimer.ts
│   │   ├── useGarden.ts
│   │   ├── useStreak.ts
│   │   ├── useCoins.ts           # V2
│   │   ├── useAchievements.ts    # V2
│   │   ├── useTheme.ts
│   │   └── useNotifications.ts
│   ├── lib/
│   │   ├── supabase.ts           # Client singleton
│   │   └── supabase.types.ts     # Generated: `supabase gen types typescript`
│   ├── services/                 # One file per domain, pure data access
│   │   ├── prayers.ts
│   │   ├── quran.ts
│   │   ├── adhkar.ts
│   │   ├── tasks.ts
│   │   ├── sessions.ts
│   │   ├── garden.ts
│   │   ├── workouts.ts
│   │   ├── challenges.ts
│   │   ├── studyRooms.ts
│   │   ├── notifications.ts
│   │   ├── coins.ts              # V2
│   │   └── achievements.ts       # V2
│   ├── types/
│   │   └── index.ts              # All shared TypeScript types
│   └── utils/
│       ├── dates.ts
│       ├── streaks.ts
│       └── formatting.ts
├── netlify/
│   └── functions/
│       ├── groq-chat.ts          # V1 AI (Groq)
│       ├── claude-chat.ts        # V2 AI (Claude, replaces above)
│       ├── claude-actions.ts     # V2 AI tool execution
│       ├── award-coins.ts        # V2 server-side coin award
│       ├── push-notify.ts        # Web Push sender
│       └── ai-memory-extract.ts  # V2 background memory extraction
├── supabase/
│   ├── migrations/               # 001_initial.sql, 002_garden.sql, etc.
│   ├── seed.sql                  # Dev seed data
│   └── tests/                   # pgTAP RLS policy tests
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── public/
│   ├── salsabil-original.png     # Source logo (4096×4096) — carried over
│   ├── salsabil-icon-*.png       # All sizes — carried over unchanged
│   ├── favicon.ico               # Carried over
│   ├── favicon.png               # Carried over
│   └── manifest.json             # Rewritten content, same icon references
└── ...
```

---

## Garden Tree Rendering — Clarification

**What "tree assets" question meant:**  
In Forest app, the trees are hand-illustrated artwork (painted/drawn by a designer). To match that quality, you'd normally need someone to draw them. The question was: do we hire someone, or do we build them in code?

**Answer: We build them in code (procedural PixiJS rendering).**

This is actually how many polished games and apps do it. Each tree species is defined by a set of parameters (trunk curve, branch spread angle, leaf cluster shape, color palette) and drawn at runtime using PixiJS's Graphics API with bezier curves. Wind sway is a live animation, not a sprite sheet. Killed trees droop in real time.

This means:
- No illustrator cost
- Trees can be infinitely varied (no two Pomodoro sessions produce the identical tree)
- Growth stages are smooth transitions, not static images
- The whole thing is ~300 lines of drawing code per species
- Matches or exceeds Forest app quality because it's *alive*, not static sprites

---

## What We Are NOT Building

- Social feed / public profiles / leaderboards
- In-app purchases (free app)
- Native mobile app (PWA is the strategy)
- Third-party prayer time API (user-configured times, no dependency)
- Arabic-language UI (prayer/adhkar labels only)
- Offline-first (optimistic UI is sufficient)
- Leaderboards (all stats are personal, never competitive)
