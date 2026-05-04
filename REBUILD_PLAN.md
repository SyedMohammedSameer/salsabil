# Salsabil — Full Rebuild Plan

> **Status:** Planning  
> **Goal:** SF Bay Area startup-grade production app  
> **Audience:** Muslim productivity users blending faith practice with focused work  

---

## Core Decisions

### Stack

| Layer | Choice | Reason |
|---|---|---|
| Build | Vite + React 19 + TypeScript | Keep — already correct |
| Styling | Tailwind v4 + shadcn/ui | shadcn gives owned, accessible primitives |
| Animation | Framer Motion | Meaningful transitions only, not decorative |
| Garden rendering | PixiJS | GPU-accelerated 2D, real illustrated tree quality, Forest-app tier |
| Auth + DB | Supabase | Postgres, row-level security, testable schema, real migrations |
| AI | Anthropic Claude API (claude-sonnet-4-5) | Context-aware, action-capable, far beyond Groq chat |
| Backend functions | Netlify Functions | Keep architecture, rewrite implementations |
| Notifications | Supabase Realtime + Web Push | Replace Firebase FCM |

### Why Supabase over Firebase

- Postgres gives proper relational schema — prayers, tasks, sessions all have real foreign keys
- Row-level security (RLS) is testable SQL, not Firestore rules DSL
- Migrations are versioned — schema changes are tracked, reviewable, rollback-safe
- Better local dev with `supabase start`
- **User migration:** Google/Apple OAuth users re-authenticate seamlessly (OAuth flow is identical). Email/password users receive a password reset email. Data starts fresh as agreed — no Firestore → Postgres migration of records.

### Design System Commitments

- **Colors:** Preserve existing brand palette (greens, earth tones, cream/dark)
- **Logo:** Unchanged
- **Dark + Light mode:** CSS variables + Tailwind's `dark:` classes, toggled via `<html class="dark">`, persisted in localStorage
- **Glassmorphism:** Used surgically — modals, cards, sidebar rail. Not full-app.
- **Typography:** Geist Sans (body) + Geist Mono (timers/stats)
- **Motion:** Reduced motion respected via `prefers-reduced-motion`

### Navigation — Locked Pattern (Do Not Deviate)

This is explicitly spec'd to avoid past mistakes:

```
Desktop (≥1024px):
  Left sidebar rail — 64px collapsed, 240px expanded
  Toggle button at bottom of rail
  Icons always visible; labels visible when expanded
  Active state: accent pill on left edge + icon fill
  Max 8 nav items

Mobile (<1024px):
  Bottom tab bar — fixed, 5 items max
  Active item: filled icon + label
  Overflow items in a "More" sheet
  NO hamburger menus, NO slide-out drawers on mobile
```

Both are a single `<Navigation>` component with responsive rendering. Zero duplicated nav logic.

---

## Version 1 — Foundation

**Goal:** Polished, tested, production-ready core. Prayer, Quran, Adhkar, Pomodoro, Garden.  
**Timeline estimate:** 8–10 weeks

---

### Phase 1 — Infrastructure & Design System

**Goal:** Zero features, but the bones are unbreakable.

#### 1A — Project Scaffold
- Fresh Vite + React 19 + TypeScript project on this branch
- ESLint + Prettier + Husky pre-commit hooks
- Absolute imports (`@/components`, `@/lib`, `@/hooks`, etc.)
- Tailwind v4 config with design tokens (colors, spacing, radius, shadows)
- shadcn/ui init — configure theme to match Salsabil palette
- Dark/light mode system (CSS variables, `useTheme` hook, toggle component)
- `ErrorBoundary` component at app root
- `<HelmetProvider>` for page titles

#### 1B — Supabase Setup
- Create Supabase project
- Define initial schema:
  - `profiles` (id, username, avatar_url, created_at, preferences jsonb)
  - `prayer_logs` (id, user_id, date, fajr, dhuhr, asr, maghrib, isha, recorded_at)
  - `quran_logs` (id, user_id, date, surah, ayah_start, ayah_end, pages, minutes, notes)
  - `adhkar_logs` (id, user_id, date, type, count, completed_at)
  - `focus_sessions` (id, user_id, started_at, ended_at, duration_minutes, mode, completed, task_id)
  - `tasks` (id, user_id, title, description, due_date, completed_at, priority, category, created_at)
  - `garden_trees` (id, user_id, session_id, species_id, planted_at, growth_stage, killed)
- Row-level security policies on every table — users can only read/write their own rows
- Supabase Auth configured: Google OAuth + Email/Password
- `lib/supabase.ts` client singleton

#### 1C — Auth Flow
- `<AuthProvider>` context with session, user, loading states
- `<AuthModal>` — sign in / sign up with Google OAuth button + email form
- Route guards — protected routes redirect to auth
- `<UsernamePromptModal>` for new users
- Profile creation on first sign-in (Supabase trigger)

#### 1D — Navigation Component
- `<Navigation>` built exactly to spec above
- Desktop: collapsible sidebar rail with smooth width transition
- Mobile: bottom tab bar, sticky, safe-area aware
- `useNavigation` hook manages active route
- Animated active indicators (Framer Motion layoutId)
- No feature content yet — navigation shell only

---

### Phase 2 — Core Productivity Views

**Goal:** Prayer, Quran, Adhkar, Tasks — fully functional and beautiful.

#### 2A — Dashboard
- Today's summary card — prayers completed, focus time, Quran pages, tasks done
- Streak counters for each habit
- Motivational quote (rotated from curated Islamic quotes, no API call)
- Quick-action buttons: Start Focus, Log Prayer, Log Quran
- Animated stat cards with Framer Motion entrance
- Responsive grid — 1col mobile, 2col tablet, 4col desktop

#### 2B — Prayer Tracker
- Full-week view with scroll — each day is a column
- Five prayers per day as pill toggles (tap to mark complete)
- Today's prayers highlighted
- Prayer times display (static times, configurable by user in settings — no external API dependency in v1)
- Monthly streak heatmap at bottom
- Offline-capable — logs to Supabase, optimistic UI updates

#### 2C — Quran Log
- Log reading session: surah picker, ayah range or page count, duration
- Today's progress card
- Total pages/ayahs by week/month chart (recharts-free — pure CSS/SVG bar chart)
- Reading streak counter
- Recent sessions list

#### 2D — Adhkar
- Morning adhkar set, Evening adhkar set, After-prayer adhkar
- Each dhikr card: Arabic text, transliteration, translation, count target
- Tap to increment counter, satisfying micro-animation on completion
- Set completion celebration (confetti burst via canvas, not a library)
- Daily completion persisted

#### 2E — Task Manager
- List view with priority grouping (Urgent, Today, This Week, Someday)
- Add task modal: title, due date, priority, category (Work, Study, Personal, Deen)
- Swipe-to-complete on mobile
- Filter by category
- Completed tasks collapse into "Done today" section

---

### Phase 3 — Garden & Pomodoro (The Core Loop)

**Goal:** Forest-app quality garden. This phase gets the most design attention.

#### 3A — Pomodoro Timer
- Clean, minimal timer view — large time display, start/pause/reset
- Session modes: Focus (25min default), Short Break (5min), Long Break (15min)
- Configurable durations in settings
- Session persisted to `focus_sessions` on completion
- Completion triggers a tree planting in the garden
- Kill confirmation if user tries to leave mid-session ("Your tree will die")

#### 3B — Tree Rendering System (PixiJS)

This is the product differentiator. Implementation requirements:

**Tree species (v1 — 6 species):**
- Olive tree (default, unlocked)
- Palm tree (unlocked)
- Cedar tree (unlocked)
- Fig tree (v1 unlocked)
- Pomegranate tree (v1 unlocked)
- Lotus (v1 unlocked)

All species are plants/trees with Quranic/Islamic significance.

**Growth stages per tree (6 stages):**
1. Seed (session just planted)
2. Sprout (session complete, 5min elapsed)
3. Sapling (1 day old)
4. Young tree (3 days old)
5. Full tree (7 days old)
6. Ancient tree (30 days old)

**Rendering:**
- Each tree is a PixiJS `Container` with layered `Sprite` assets
- Tree assets: illustrated SVG exported to PNG sprite sheets (designed offline, committed to repo)
- Idle animation: gentle wind sway via `gsap.to` on trunk/canopy pivot points
- Killed tree: grayscale filter + wilted pose, stays in garden as reminder
- Tap on tree: tooltip card shows — session date, duration, species name, growth stage

**Garden layout:**
- Isometric grid (pseudo-3D, like a mobile game garden)
- Trees planted left-to-right, oldest first
- Garden canvas fills the viewport, PixiJS renderer
- Pinch-to-zoom + pan on mobile
- Dark mode: night sky background, subtle moonlight on trees
- Light mode: daytime sky, soft sunlight

**Garden view sections:**
- My Garden (main canvas)
- Species Library (shows all species, locked/unlocked)
- Session History (list of past sessions with mini tree icon)

#### 3C — Pomodoro ↔ Garden Integration
- Starting a timer shows the seed being planted in the garden (live)
- Completing grows it to sprout immediately
- Killing a session wilts it in real time
- Garden is the emotional core — it should feel alive

---

### Phase 4 — Testing & Hardening

**Goal:** Ship nothing that isn't tested. This phase has no new features.

#### 4A — Unit Tests (Vitest)
- All utility functions (`dateUtils`, `streakCalculator`, etc.)
- All custom hooks (`useTimer`, `useGarden`, `useStreak`, etc.)
- Supabase query functions (mocked client)
- Auth context state transitions
- Coverage target: 80%+

#### 4B — Integration Tests (Vitest + Testing Library)
- Prayer log: mark prayer → Supabase write → UI updates
- Pomodoro: start → complete → session saved → tree planted
- Task CRUD: create, complete, delete
- Auth: sign in → profile created → redirected to dashboard
- Quran log: submit form → appears in session list

#### 4C — E2E Tests (Playwright)
- Critical paths only:
  1. Sign up → username set → dashboard loads
  2. Start focus session → complete → garden shows new tree
  3. Log all 5 prayers → streak updates
  4. Log Quran session → appears in log
  5. Create task → mark complete → moves to done
- Tests run against a Supabase local instance (`supabase start`)
- CI: GitHub Actions runs E2E on every PR to main

#### 4D — Database & Security Testing
- Every RLS policy tested: authenticated user can only access their own rows
- Test unauthenticated access returns 0 rows on all tables
- Test cross-user access is blocked
- Schema migration dry-run tests
- Supabase function (trigger) tests: profile creation on signup works

#### 4E — Performance & Accessibility
- Lighthouse CI: target 95+ performance, 100 accessibility
- PixiJS garden: 60fps on mid-range Android (Samsung Galaxy A series)
- Bundle analysis: no chunk > 300KB
- All interactive elements keyboard navigable
- Screen reader labels on all icon buttons
- Color contrast AA compliant in both dark and light mode

#### 4F — Cross-browser & Responsive QA
- Chrome, Firefox, Safari (desktop)
- Chrome Android, Safari iOS
- Breakpoints tested: 375px, 768px, 1024px, 1440px
- Bottom tab bar safe-area tested on iPhone with notch

---

## Version 2 — AI, Gamification & Growth

**Goal:** The app becomes intelligent, rewarding, and social. Users want to open it daily.  
**Prerequisite:** Version 1 shipped, stable, tested.  
**Timeline estimate:** 10–12 weeks

---

### Phase 1 — AI Upgrade (Noor)

**Goal:** The AI goes from chat widget to genuine productivity partner.

#### 1A — Backend: AI Service Layer
- Replace Groq with Anthropic Claude API (`claude-sonnet-4-5` default, `claude-haiku-4-5` for fast ops)
- Prompt caching enabled — system prompt cached to reduce latency and cost
- Context injection pipeline:
  - Current date/time + timezone + day of week
  - Today's prayer completion status
  - Current task list (due today + overdue)
  - Last 7 days' focus session history
  - Current streak data (prayer, Quran, focus)
  - Any active Pomodoro session
  - User preferences (working hours, prayer times)
- All context assembled server-side in Netlify function before Claude call
- Response streaming — no waiting for full response

#### 1B — AI Actions (Tool Use)
Noor can take real actions via Claude's tool use API:

```
Tools available to Noor:
- create_task(title, due_date, priority, category)
- complete_task(task_id)
- start_focus_session(duration_minutes, task_id?)
- log_prayer(prayer_name, date?)
- log_quran(surah, pages, minutes)
- log_adhkar(set_name)
- get_todays_summary()
- get_streak_report()
- schedule_reminder(message, time)
```

Noor confirms destructive or ambiguous actions before executing. Read-only actions (get summaries, streaks) execute silently.

#### 1C — Proactive Intelligence
- **Daily Morning Brief:** At a user-configured time, Noor sends a push notification with a personalized plan — prayers for today, tasks due, suggested focus blocks around prayer times
- **Smart suggestions:** After logging Fajr, Noor might suggest "Good morning. You have 2 hours before your next meeting — want to start a focus session?"
- **Pattern recognition:** Noor notices "You've missed Asr 3 times this week around 4pm — that's when your longest focus sessions are. Want to set a prayer break reminder?"
- **Streak protection alerts:** "You're at a 12-day Quran streak. You haven't logged today — want to log a quick session now?"

#### 1D — Noor UI
- Redesigned AI panel — not a chat bubble, a proper side panel or modal
- Voice input via Web Speech API (transcribed locally, sent as text)
- Streaming responses rendered in real-time
- Action cards for confirmations (not raw text)
- Conversation memory within a session (last 20 messages as context)
- "Clear conversation" resets to fresh context

---

### Phase 2 — Gamification System

**Goal:** Earn coins. Spend on trees. Build your garden intentionally.

#### 2A — Coin Economy Design

| Action | Coins Earned |
|---|---|
| Complete a focus session (25min) | 10 coins |
| Complete a focus session (50min+) | 25 coins |
| Log all 5 prayers in a day | 20 coins |
| Log each individual prayer | 2 coins |
| Log Quran session (any) | 5 coins |
| Log Quran session (30min+) | 15 coins |
| Complete adhkar set (morning or evening) | 8 coins |
| Complete a task | 3 coins |
| Complete a workout | 10 coins |
| 7-day prayer streak bonus | 50 coins |
| 7-day focus streak bonus | 50 coins |
| 30-day any-habit streak | 200 coins |
| Study group session (30min+) | 20 coins |

**Anti-gaming measures:**
- Daily coin caps per category (max 50 coins/day from tasks, 60 from prayers, etc.)
- Minimum session duration for focus coins (must complete ≥ 80% of timer)
- Streak bonuses only awarded once per streak milestone

#### 2B — Tree Shop
- 12 total species (6 from v1 unlocked, 6 new requiring coins)

**New v2 species:**
- Zaytouna (Ancient Olive) — 100 coins
- Sidr (Lote Tree, Quranic) — 150 coins
- Yasmeen (Jasmine) — 80 coins
- Rumman (Pomegranate, ancient variant) — 120 coins
- Tuba (Paradise tree concept) — 500 coins, rarest
- Rose of Jericho (Resurrection plant) — 200 coins

**Shop UI:**
- Grid of species cards with illustration, name, Quranic reference, price
- Locked species show silhouette + coin requirement
- Owned species show "Select" button
- Active species used for next focus session shown with checkmark

#### 2C — Coin System Backend
- `coin_ledger` table: (id, user_id, amount, reason, created_at) — append-only, no updates
- `user_balances` view: sum of coin_ledger per user
- Server-side coin awarding only (Netlify function validates completion before writing to ledger)
- Client never writes directly to coin_ledger
- `species_ownership` table: (user_id, species_id, purchased_at)
- RLS: users can only read their own ledger and balances

#### 2D — Achievements & Streaks
- Achievement system: 20 achievements in v2
- Examples: "First Tree" (plant first tree), "7 Pillars" (log all prayers 7 days straight), "Scholar" (30 Quran sessions), "Iron Focus" (50 completed focus sessions), "Generous Garden" (50 trees planted)
- Achievement notification: modal with illustration + coin reward
- Achievement showcase on profile page
- Streaks: longest streak badge displayed on profile

---

### Phase 3 — Workouts, Study Rooms & Advanced Features

**Goal:** Complete the feature set properly, not as an afterthought.

#### 3A — Workouts
- Log workout: type (cardio, strength, flexibility, sport, walk), duration, intensity
- Weekly workout calendar view
- Personal records tracking for strength exercises
- Integration with coin system
- Simple streak tracking

#### 3B — Study Rooms (Rebuilt)
- Real-time collaborative focus rooms via Supabase Realtime
- Room: name, host, participant list, shared timer, tree species for the session
- Join code (6-char alphanumeric)
- Participants see each other's timer state in sync
- Chat (text only, minimal) — reactions during session
- Session ends → everyone gets coin reward
- Room history

#### 3C — Adhkar Upgrade
- Add custom dhikr (user-defined text, target count)
- Weekly/monthly adhkar completion charts
- Tasbeeh counter mode (full screen, haptic feedback on mobile)
- Integration with coin system

#### 3D — Profile & Settings
- Profile page: avatar, username, join date, coin balance, achievement showcase
- Stats overview: total focus hours, total prayers logged, total trees planted, longest streaks
- Settings: notification preferences, prayer time configuration, timer defaults, theme, language preference (Arabic/English labels for prayers/adhkar)
- Account: change email, change password, delete account (with data export)

#### 3E — Analytics Dashboard
- Personal analytics: focus time by day of week, prayer consistency heatmap, Quran progress over time, coin earning rate
- Charts built with custom SVG — no chart library dependency
- Exportable as PNG (canvas capture)

---

### Phase 4 — Full Testing, Security Audit & Launch

**Goal:** Production hardening. Nothing ships broken.

#### 4A — Extended Unit & Integration Tests
- All gamification logic: coin calculation, daily caps, streak bonus triggers
- AI action tools: each tool tested with mock Supabase client
- Study room real-time sync: tested with mock Supabase Realtime
- Species unlock/purchase flow
- Achievement trigger conditions

#### 4B — Security Audit
- Full RLS policy audit: every table, every operation
- Coin ledger: verify server-side-only writes (no direct client insert possible)
- Claude API key never exposed to client
- All Netlify functions: input validation, rate limiting (by user_id)
- Auth token validation on every protected function
- CORS configured correctly
- No PII logged in server logs
- CSP headers configured in netlify.toml

#### 4C — Load & Stress Testing
- k6 scripts for:
  - 100 concurrent users completing focus sessions simultaneously
  - 100 concurrent users writing prayer logs
  - Study room with 20 participants
- Supabase connection pool limits verified
- PixiJS garden with 200 trees — performance maintained at 60fps

#### 4D — E2E Tests (Playwright — Full Suite)
All V1 tests +
- Complete focus session → coins awarded → balance updates
- Purchase tree species → species available in garden
- Achievement unlocked on milestone
- Study room: create → join → complete session → both users get coins
- AI: ask Noor to create a task → task appears in task list
- AI: ask for today's summary → correct data returned

#### 4E — Observability
- Error tracking: Sentry (free tier, client + server)
- Performance monitoring: Sentry performance traces
- Supabase Dashboard: slow query alerts configured
- Uptime monitoring: Better Uptime or UptimeRobot on production URL

#### 4F — Launch Checklist
- [ ] Custom domain configured, HTTPS forced
- [ ] PWA manifest + service worker — installable on iOS and Android
- [ ] All og: meta tags for social sharing
- [ ] Sitemap + robots.txt
- [ ] Privacy policy page (required for OAuth)
- [ ] Cookie/storage disclosure
- [ ] Analytics (Plausible — privacy-first, no cookie banner needed)
- [ ] Supabase backups enabled (daily)
- [ ] Production Supabase project separate from dev

---

## File Structure (Target)

```
salsabil/
├── src/
│   ├── app/
│   │   ├── App.tsx                    # Root, providers, router
│   │   ├── router.tsx                 # All routes defined here
│   │   └── providers.tsx              # Auth, Theme, Query providers
│   ├── components/
│   │   ├── ui/                        # shadcn/ui components (owned)
│   │   ├── layout/
│   │   │   ├── Navigation.tsx         # THE navigation component
│   │   │   ├── Sidebar.tsx            # Desktop sidebar (used by Navigation)
│   │   │   ├── BottomBar.tsx          # Mobile bottom bar (used by Navigation)
│   │   │   └── PageShell.tsx          # Consistent page wrapper
│   │   └── shared/                    # Reusable across views
│   ├── views/                         # One folder per feature
│   │   ├── dashboard/
│   │   ├── prayer/
│   │   ├── quran/
│   │   ├── adhkar/
│   │   ├── garden/
│   │   ├── pomodoro/
│   │   ├── tasks/
│   │   ├── workouts/
│   │   ├── study-rooms/
│   │   ├── ai/
│   │   ├── profile/
│   │   └── analytics/
│   ├── hooks/                         # Custom hooks
│   ├── lib/
│   │   ├── supabase.ts                # Client singleton
│   │   ├── supabase.types.ts          # Generated types from schema
│   │   └── claude.ts                  # Claude API client (server-side only)
│   ├── services/                      # Data access layer
│   │   ├── prayers.ts
│   │   ├── sessions.ts
│   │   ├── garden.ts
│   │   ├── coins.ts
│   │   └── achievements.ts
│   ├── store/                         # Zustand stores (if needed)
│   ├── types/                         # Shared TypeScript types
│   └── utils/
├── netlify/
│   └── functions/
│       ├── ai-chat.ts                 # Claude API proxy
│       ├── ai-actions.ts              # Tool execution
│       ├── award-coins.ts             # Server-side coin award
│       └── study-room-events.ts
├── supabase/
│   ├── migrations/                    # Versioned SQL migrations
│   ├── seed.sql                       # Dev seed data
│   └── tests/                        # pgTAP RLS tests
├── tests/
│   ├── unit/                          # Vitest unit tests
│   ├── integration/                   # Vitest + Testing Library
│   └── e2e/                          # Playwright tests
├── public/
│   ├── assets/
│   │   └── trees/                     # PixiJS tree sprite PNGs
│   └── ...
└── ...
```

---

## Garden Asset Plan

Tree assets need to be designed and committed before Phase 3 starts. Each species needs:
- 6 growth stage illustrations (PNG, transparent background, 512x512px)
- 1 "dead/killed" state illustration
- 1 "thumbnail" for the shop (256x256px)

Total: 7 illustrations × 6 v1 species = 42 assets  
v2 adds 6 more species = 42 additional assets

Style direction: stylized flat illustration, slightly warm, consistent light source (top-left), Islamic garden aesthetic. Not pixel art, not photorealistic. Think: Ghibli-adjacent but minimal.

If assets aren't designed in-house, use a commissioned illustrator or a tool like Adobe Illustrator with a template system. This is non-negotiable — placeholder rectangles are not acceptable for launch.

---

## What We Are NOT Building (v1 or v2)

- No social feed / posting / public profiles
- No leaderboards (coins and trees are personal, not competitive)
- No in-app purchases / paid features (v1 and v2 are free)
- No native mobile app (PWA is sufficient)
- No third-party prayer time API (user configures their own times)
- No Arabic UI (labels only, existing plan)
- No offline-first architecture (optimistic UI is sufficient)

---

## Open Questions (Decide Before Phase 1 Starts)

1. **Tree assets:** Commission illustrator now, or use SVG illustrations built in code (slower but free)?
2. **Claude API billing:** Which account/org does the API key go under?
3. **Supabase org:** New org or existing?
4. **Domain:** `salsabil.app` — who manages DNS?
5. **Analytics:** Plausible ($9/mo) or self-hosted (Umami)?
