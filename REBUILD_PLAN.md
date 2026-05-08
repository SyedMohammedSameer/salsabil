# Salsabil — Full Rebuild Plan (Final)

> **Status:** Ready to build  
> **Goal:** Peak-level fullstack product. SF Bay Area startup quality.  
> **Principle:** Every view looks like it came from the same designer on the same day.

---

## Confirmed Decisions

| Decision | Choice |
|---|---|
| AI (V1) | OpenRouter — `meta-llama/llama-3.3-70b-instruct:free` via Netlify function (strictly free) |
| AI (V2) | Anthropic Claude API — `claude-sonnet-4-6` |
| Database | Supabase — new org |
| Hosting | Netlify (`salsabil.netlify.app`, .com later) |
| Analytics | Self-hosted Umami |
| Logo + icons | Carry over (`salsabil-original.png` 4096×4096 + all icon sizes) |
| Brand primary | Teal `#14b8a6` — not blue (correcting original mistake) |
| Themes | Dark + Light, both first-class, system preference on first load |

---

## Final Stack

| Layer | Package | Why |
|---|---|---|
| Build | Vite 6 + React 19 + TypeScript (strict) | Already correct |
| Styling | Tailwind v4 + shadcn/ui | Owned primitives, no fighting a library |
| Variants | class-variance-authority (CVA) | Replaces string-concat designSystem.ts |
| Server state | TanStack Query v5 | Caching, background refetch, optimistic updates — this is what makes it feel instant |
| Client state | Zustand v5 | Lightweight, no boilerplate |
| Forms | React Hook Form + Zod | Type-safe validation, zero re-renders |
| Animation | Framer Motion v12 | Page transitions, micro-interactions |
| Garden | PixiJS v8 + GSAP v3 | GPU 2D canvas, GSAP for wind physics |
| Router | React Router v7 | Lazy routes, deep link support |
| Toasts | Sonner | Best-in-class, accessible |
| Bottom sheets | Vaul | Native-feel mobile drawers |
| Command palette | cmdk | Cmd+K power user layer |
| Virtual lists | @tanstack/react-virtual | Long task/session lists at 60fps |
| Auth + DB | Supabase | Postgres, RLS, realtime, storage |
| AI V1 | OpenRouter (openai-compat SDK) via Netlify function | Free tier, `llama-3.3-70b-instruct:free` |
| AI V2 | Anthropic SDK via Netlify function | Claude tool use, streaming, caching |
| Testing (unit) | Vitest + Testing Library | Fast, Vite-native |
| Testing (e2e) | Playwright | Full browser automation |
| DB tests | pgTAP | SQL-level RLS testing |
| Linting | ESLint + eslint-plugin-tailwindcss | Enforces no arbitrary values in components |
| Git hooks | Husky + lint-staged | Type-check + lint on every commit |

### What makes this peak vs just good

- **TanStack Query** — every Supabase query is cached. Navigate away and back = instant load from cache, background refetch silently updates. No spinner on repeat visits.
- **CVA** — every component has typed variants. `<Button variant="primary" size="lg">` — zero string guessing, zero one-off styles in view files.
- **Skeleton loaders everywhere** — no spinners. Skeletons match the exact shape of the content loading. Feels fast even on slow connections.
- **Vaul bottom sheets** — on mobile, "Add task", "Log prayer", "Log Quran" all open as native-feel bottom sheets, not centred modals.
- **cmdk command palette** — Cmd+K opens a global search/action palette. Type "add task", "start focus", "log prayer" — power users never touch the nav.
- **View Transitions API** — page changes have a smooth crossfade. Not Framer Motion — the browser's native transition API, zero JS cost.
- **eslint-plugin-tailwindcss** — CI fails if any component file uses an arbitrary Tailwind value (`text-[#abc]`, `p-[13px]`). Forces everything through the token system. This is what enforces uniformity.

---

## Design System (Definitive)

### Brand Tokens (Tailwind config)

```
noor-50:   #f0fdfa     noor-500:  #14b8a6  ← primary brand
noor-100:  #ccfbf1     noor-600:  #0d9488
noor-200:  #99f6e4     noor-700:  #0f766e
noor-300:  #5eead4     noor-800:  #115e59
noor-400:  #2dd4bf     noor-900:  #134e4a

accent-500: #10b981    ← emerald, success, streaks
warn-500:   #f59e0b    ← amber, reminders
danger-500: #ef4444    ← red, errors, kills
gold-500:   #f59e0b    ← Islamic gold accents

PWA theme-color: #14b8a6
```

### 8-Point Grid
All spacing is multiples of 8px. Tailwind units: `2=8px, 4=16px, 6=24px, 8=32px, 12=48px, 16=64px`. No `p-5`, no `p-3` except for tight inline text padding. This is what makes spacing feel intentional.

### Typography Scale
- Display: `text-4xl font-bold tracking-tight` — hero stats, timer
- H1: `text-3xl font-bold`
- H2: `text-2xl font-semibold`
- H3: `text-xl font-semibold`
- Body: `text-base` — 16px, line-height 1.6
- Small: `text-sm` — 14px
- Mono: `font-mono` — timers, counts, coin amounts
- Font: Geist Sans + Geist Mono (loaded via CDN, preconnect)

### Component Anatomy Rules
These apply to every component, no exceptions:
- Cards: `rounded-2xl bg-card border border-border shadow-sm p-6`
- Modals: `rounded-3xl` on desktop, bottom sheet (Vaul) on mobile
- Inputs: `rounded-xl border-input bg-background h-12 px-4` (min 44px touch target)
- Buttons: `rounded-xl font-medium` — primary uses teal, sizes: sm/md/lg
- All interactive elements: `min-h-[44px] min-w-[44px]` (WCAG touch target)
- Focus rings: `focus-visible:ring-2 focus-visible:ring-noor-500 focus-visible:ring-offset-2`

### Glassmorphism — Surgical Only
```css
.glass { backdrop-blur: 20px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); }
.glass-dark { backdrop-blur: 20px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.08); }
```
Used on: sidebar rail, floating orb, modal backdrops, notification cards.
Never on: list items, table rows, full-page backgrounds.

### Uniformity Enforcement
- `eslint-plugin-tailwindcss` — blocks arbitrary values in source files
- `PageShell` component wraps every view — consistent max-width, padding, header slot
- `SectionHeader` component — consistent h2 + subtitle + optional action button
- `EmptyState` component — consistent illustrated empty states, not raw text
- `SkeletonLoader` variants — match exact layout of each view's loaded state
- Zero inline styles anywhere. Zero `style={{}}` in JSX.

---

## Navigation (Final Spec — Do Not Change During Build)

```
Desktop ≥1024px:
  Left rail, fixed
  Collapsed (default): 64px — icon only, tooltip on hover
  Expanded: 240px — icon + label, toggle with chevron at bottom
  Active: teal left-edge bar (4px) + filled icon + teal label
  Hover: subtle bg-noor-50/10 pill
  Groups: Core / Spiritual / Growth / (bottom) AI + Settings

Mobile <1024px:
  Bottom tab bar, fixed, z-50
  Height: 64px + safe-area-inset-bottom
  5 slots: Dashboard | Focus | Noor | Prayers | More
  "More" opens Vaul bottom sheet with remaining nav items
  Active: filled icon + teal label
  NO hamburger. NO slide drawer. NO top navbar on mobile.

Both rendered by one <Navigation> component.
useNavigation() hook owns active route.
Framer Motion layoutId="nav-pill" for active transition.
NoorMiniOrb rendered inside Navigation, hidden on /ai route.
```

---

## Version 1 — Foundation

**Goal:** Polished, tested, production-ready core.  
**Scope:** Auth, Dashboard, Prayer, Quran, Adhkar, Tasks, Calendar/Planner, Pomodoro, Garden, Noor (OpenRouter free), Notifications, Challenges.  
**Non-negotiable:** Every view uses the same design system. No exceptions.

---

### Phase 1 — Scaffold, Design System & Navigation

**Parts:** 1A through 1F  
**Output:** Zero features, but the skeleton of the app is flawless.

#### 1A — Project Scaffold
- Wipe existing `src/`. Keep `public/` assets (icons, logo, favicon).
- Vite 6 + React 19 + TypeScript — `strict: true` in tsconfig
- ESLint (airbnb-typescript) + eslint-plugin-tailwindcss + Prettier
- Husky: pre-commit runs `tsc --noEmit` + `eslint --fix` + `prettier --write`
- Absolute imports: `@/components`, `@/views`, `@/hooks`, `@/lib`, `@/services`, `@/utils`, `@/types`
- Path aliases in `vite.config.ts` + `tsconfig.json`
- `src/types/index.ts` — all shared TypeScript types defined here first (migrate from existing `types.ts`)
- Environment: `.env.example` with all required keys documented

#### 1B — Tailwind v4 + shadcn/ui + CVA
- Tailwind v4 config with full brand token set (all noor-, accent-, warn-, danger-, gold- shades)
- CSS variables on `:root` and `.dark` for all semantic colors
- shadcn/ui init — theme configured to Salsabil brand tokens
- Install CVA (`class-variance-authority`) + `tailwind-merge` + `clsx`
- `src/lib/cn.ts` — `cn()` utility (clsx + tailwind-merge)
- All shadcn components installed: Button, Input, Dialog, Sheet, Drawer, Select, Checkbox, Badge, Avatar, Tooltip, Popover, Command, Separator, Skeleton, Tabs, DropdownMenu, ScrollArea
- Every installed shadcn component customised to brand tokens — no default blue anywhere

#### 1C — Dark/Light Mode System
- `useTheme` hook: reads `localStorage`, falls back to `prefers-color-scheme`
- `ThemeProvider` wraps app, sets `<html class="dark|light">`
- `ThemeToggle` component — animated sun/moon icon swap (Framer Motion)
- Both themes tested for WCAG AA contrast before moving on
- CSS variables verified: every color works in both modes

#### 1D — Global Layout + PageShell
- `src/app/App.tsx` — providers stack: `ThemeProvider > AuthProvider > QueryProvider > RouterProvider`
- `src/app/router.tsx` — all routes defined with `React.lazy()`, wrapped in `<Suspense>`
- `<PageShell>` component: consistent max-width (1280px), horizontal padding (16px mobile / 32px desktop / 48px wide), top padding clears nav
- `<SectionHeader>` component: h2 + optional subtitle + optional right-side action
- `<EmptyState>` component: icon slot + title + description + optional CTA button
- `<SkeletonPage>` variants: one per view, matches loaded layout exactly
- Skip-to-content link at top of DOM (visible on focus)
- `<ErrorBoundary>` at router level with friendly recovery UI

#### 1E — Supabase: Schema + Auth + RLS
Full schema in `supabase/migrations/001_initial.sql`:

```
profiles            id, username, display_name, avatar_url, preferences jsonb,
                    ai_onboarding_done bool, created_at
                    → auto-created by trigger on auth.users insert

prayer_logs         id, user_id, date (UNIQUE with user_id),
                    fajr_fardh, fajr_sunnah, dhuhr_fardh, dhuhr_sunnah,
                    asr_fardh, asr_sunnah, maghrib_fardh, maghrib_sunnah,
                    isha_fardh, isha_sunnah, tahajjud, notes

quran_logs          id, user_id, date, surah_number, ayah_start, ayah_end,
                    pages numeric, duration_minutes, notes, created_at

adhkar_logs         id, user_id, date, set_id, completed_at

tasks               id, user_id, title, description, due_date, start_time,
                    end_time, priority, category, completed, completed_at,
                    sort_order int, created_at, updated_at

subtasks            id, task_id, user_id, text, completed, sort_order

focus_sessions      id, user_id, started_at, ended_at, duration_minutes,
                    mode, completed, killed, task_id→tasks, tree_id→garden_trees

garden_trees        id, user_id, session_id, species_id, planted_at,
                    growth_stage int (1–6), is_alive bool, updated_at

notifications       id, user_id, type, title, body, read, read_at, link, created_at

push_tokens         id, user_id, token, platform, created_at, last_seen_at

workouts            id, user_id, date, type, duration_minutes, intensity,
                    notes, created_at

challenges          id, user_id, name, template_id, start_date,
                    duration_days, active, created_at

challenge_rules     id, challenge_id, label, required, sort_order

challenge_days      id, challenge_id, user_id, date (UNIQUE with challenge_id),
                    completed, rule_status jsonb, updated_at
```

- RLS on every table: `auth.uid() = user_id`
- Supabase Auth: Google OAuth + Email/Password
- `lib/supabase.ts` — typed client singleton
- `supabase gen types typescript` → `lib/database.types.ts` (run after every migration)
- TanStack Query client in `lib/query.ts` — `staleTime: 60_000`, `gcTime: 300_000`

#### 1F — Navigation + NoorMiniOrb Shell
- `<Navigation>` built to exact spec above
- Desktop sidebar: Framer Motion `width` animation 64px ↔ 240px, `200ms ease`
- Mobile bottom bar: `pb-[env(safe-area-inset-bottom)]`, 5 primary slots, Vaul sheet for More
- `useNavigation` hook: current route, `navigate()`, `isActive()`
- All nav icons: custom SVG components (not emoji, not icon library) — consistent stroke weight
- Active pill: `layoutId="nav-active"` Framer Motion spring
- `<NoorMiniOrb>` — floating `fixed bottom-20 right-4 md:bottom-6 md:right-6`, pulsing teal, badge dot for unread notifications, hidden on `/ai` route
- Theme toggle in sidebar footer
- Full keyboard navigation (Tab, Enter, arrow keys)

---

### Phase 2 — Dashboard, Auth & Onboarding

#### 2A — Auth Pages
- `/auth` — full-page, centred, not a modal overlay
- Google OAuth button (primary, with Google logo SVG)
- Email/password form with React Hook Form + Zod validation
- "Sign up" / "Sign in" toggle in same page
- Loading states on both buttons (spinner inline with text)
- Error messages below each field, not alert boxes
- `<UsernamePromptModal>` — required after first sign-in, blocks app until set

#### 2B — App Onboarding Flow (First-time users)
- After username is set, show a 4-step onboarding (stored in `profiles.onboarding_step`)
- Step 1: "Welcome to Salsabil" — what the app is, app screenshot/illustration
- Step 2: "Your Garden" — brief garden explanation with animated tree growing
- Step 3: "Track Your Deen" — prayer + quran + adhkar preview
- Step 4: "Meet Noor" — the Noor 4-step intro (already designed in original)
- Skip button on every step
- Progress dots at bottom
- Dismissible, never shows again

#### 2C — Dashboard
- Responsive grid: 1col (mobile) → 2col (tablet) → 4col (desktop)
- Today's stat cards: Prayers (x/5), Focus (xmin), Quran (x pages), Tasks (x/y)
- Each stat card: large number, label, progress ring, tap → navigate to that view
- Streak row: prayer streak + quran streak + focus streak — horizontal scroll on mobile
- Active challenge card (if any): today's rules checklist, inline check-off
- Garden preview: mini PixiJS canvas showing last 7 trees — tap → go to /focus
- Today's tasks: top 3 due today, "View all" link
- Motivational quote: curated local JSON (50 Islamic quotes), rotates daily by day-of-year
- Noor suggestion card: if Noor has a proactive suggestion (from localStorage), shows at top
- All data via TanStack Query: `useQuery` with `staleTime`, instant on revisit
- Skeleton: exact layout matches, shown on first load and during background refetch

---

### Phase 3 — Spiritual Views

#### 3A — Prayer Tracker
- Week tab header: Mon–Sun, tap to select day, today highlighted
- 6 prayer cards per day: Fajr, Dhuhr, Asr, Maghrib, Isha, Tahajjud
- Each card: prayer name + icon, Fardh toggle (large, primary), Sunnah toggle (smaller, secondary)
- Prayer-specific gradients (Fajr=orange-pink, Dhuhr=golden, Asr=amber, Maghrib=rose-purple, Isha=indigo, Tahajjud=deep slate)
- Completion state: card background shifts to gradient, checkmark animates in
- Haptic feedback on toggle (Vibration API: `navigator.vibrate(8)`)
- Monthly heatmap below weekly: each cell = % of fardh prayers that day, tap to jump to that week
- Streak counter with milestone badges (7, 30, 100 days)
- Data: TanStack Query, optimistic update on toggle (updates cache instantly, Supabase write in background)
- Empty state for days with no logs: "No prayers logged yet" with add prompt

#### 3B — Quran Log
- Log session FAB → Vaul bottom sheet (mobile) / Dialog (desktop)
- Form: surah picker (114 surahs with names), from/to ayah, pages (auto-calc or manual), duration
- React Hook Form + Zod validation
- Today card: pages + minutes + streak
- Weekly bar chart: pages per day, pure SVG (no chart library), animated on mount
- Session list: grouped by date, shows surah range + pages + duration
- Empty state: illustrated open Quran, "Log your first reading session"

#### 3C — Adhkar
- Three tabs: Morning | Evening | After Prayer (tab bar at top)
- Cards with authentic Arabic text (large, right-aligned, correct font rendering), transliteration, translation, count target
- Tap anywhere on card to increment counter
- Count badge on card shows `x / target`
- On reach target: card pulses green, counter locks, check appears
- Full set completion: canvas confetti burst (pure JS, no library, ~60 particles)
- Haptic: `navigator.vibrate([8, 50, 8])` on completion
- Tab completion ring: shows 0–100% of set completed
- `adhkar_logs` written on set completion (not per-dhikr)
- Daily reset at midnight local time

---

### Phase 4 — Tasks & Calendar

**This is the unified Calendar/Planner. One view, three modes.**

#### 4A — Task Data Layer
- TanStack Query: `useTasks()`, `useTasksByDate(date)`, `useTasksByWeek(weekStart)`
- Mutations: `useCreateTask()`, `useUpdateTask()`, `useCompleteTask()`, `useDeleteTask()`
- All mutations optimistic — cache updated before server write
- `subtasks` table queried alongside tasks
- Zod schema for task creation/update — validated before any DB write

#### 4B — Calendar View (Month | Week | Day)
Single `/calendar` route with view toggle at top right: **Month | Week | Day**

**Month view:**
- 7-col grid, 5–6 rows
- Each cell: date number, up to 3 task dots (coloured by priority), "+N more" overflow
- Tap cell → Vaul bottom sheet: day's tasks list + "Add task for this day" button
- Today: teal ring on cell
- Prev/next month navigation

**Week view:**
- 7 columns (Mon–Sun), date headers
- Each column: tasks for that day as cards, timed tasks shown at relative vertical position
- Add task FAB per column header ("+")
- Today column: teal header highlight
- Mobile: single day visible, swipe left/right to change day, day picker strip at top
- Week navigation: chevron buttons

**Day view:**
- Single day, 24 hourly slots
- Timed tasks render as blocks spanning their duration
- All-day tasks at top
- Tap empty slot → add task pre-filled with that time
- Current time indicator line (auto-scrolls to now on load)

**All three modes share:**
- Same FAB → `<TaskModal>` (React Hook Form + Zod)
- `<TaskModal>` fields: title (required), due date+time (optional), priority (Low/Medium/High), category (Work/Study/Personal/Deen), description, subtasks (add inline)
- Swipe right to complete (mobile), checkbox on desktop
- Swipe left → delete confirmation
- Long press → context menu: Edit, Complete, Delete, Duplicate
- Task cards show: title, priority dot, time (if set), subtask progress pill
- Completed tasks: strikethrough, muted, collapse to "Done" section

#### 4C — Command Palette (Cmd+K)
- `cmdk` package, opens globally with Cmd+K (Mac) / Ctrl+K (Windows)
- Fuzzy search across: tasks, nav views, quick actions
- Quick actions available: "Add task", "Start 25min focus", "Log Fajr", "Log Quran session", "Open garden", "Open prayers"
- Tasks shown with due date + priority colour
- Nav items shown with icon
- Keyboard: arrow keys to navigate, Enter to select, Esc to close
- Renders as centred overlay with glass backdrop

---

### Phase 5 — Pomodoro & Garden

#### 5A — Pomodoro Timer
- Full-screen view, distraction-free
- Large countdown display: `font-mono text-8xl` — clear, commanding
- Mode chips: Focus | Short Break | Long Break
- Start/Pause: large teal circle button, Framer Motion scale animation on press
- Reset: small ghost button, requires confirmation if session in progress
- Progress ring: SVG circle around the countdown, fills as time passes
- Session indicators: dots showing current position in the work/break cycle
- Settings gear: opens right-side panel with duration inputs
- **Kill flow:** browser navigation or FAB click mid-session → `<AlertDialog>`: "Your tree will die. Are you sure?" — Framer Motion entrance, two buttons: Stay / Kill Session
- Sound: completion chime + haptic `navigator.vibrate([100, 50, 100])`
- Session written to `focus_sessions` on completion (not during)

#### 5B — PixiJS Garden

**Architecture:**
```
GardenView.tsx          React shell, handles tabs and overlays
  PixiGarden.tsx        PixiJS Application, manages scene
    GardenScene.ts      Isometric grid, tree layout, camera
    TreeRenderer.ts     Per-tree drawing, growth, wind animation
    species/            Config per species (trunk curves, colors, leaf shapes)
      olive.ts
      palm.ts
      cedar.ts
      fig.ts
      pomegranate.ts
      lotus.ts
```

**Tree Rendering (PixiJS Graphics API):**
- Trunk: cubic bezier curves, tapers from base to crown
- Branches: recursive generation, 2–4 levels deep depending on species and growth stage
- Leaves: clusters of filled ellipses, slight random offset per cluster for organic feel
- Colors: HSL with ±5° random hue variation per tree — no two identical
- Wind: GSAP `gsap.to()` on trunk pivot, 0.3s ease-in-out, oscillating, staggered per tree
- Growth stages animate: scale + alpha tween when stage advances
- Dead trees: PixiJS ColorMatrixFilter (greyscale) + 15° lean + drooped branches
- Night mode (dark theme): PixiJS viewport tint, stars rendered as small white circles

**Garden layout:**
- Isometric grid (2:1 ratio tile projection)
- Trees placed in rows, left-to-right, oldest first
- Camera: PixiJS viewport plugin — pinch-zoom + drag on mobile, scroll + drag on desktop
- Tap tree: React overlay tooltip (not PixiJS) — species, date, session duration, growth stage

**Garden View tabs:**
- My Garden — PixiJS canvas
- Species Library — grid cards (React), locked species silhouetted
- Sessions — virtual list (`@tanstack/react-virtual`) of past sessions with mini tree SVG

**Performance:**
- PixiJS loaded via `React.lazy` — only bundled when /focus route is visited
- Target: 60fps with 200 trees on mid-range Android
- `requestAnimationFrame` budget monitored, GSAP animations paused when tab hidden

#### 5C — Pomodoro ↔ Garden Live Connection
- Timer start → `garden_trees` row created with `growth_stage: 1` → seed appears in PixiJS scene
- Timer complete → `growth_stage` updated to 2 → tree grows to sprout with 500ms tween
- Timer killed → `is_alive: false` → tree wilts in real time
- Garden subscribes to `focus_sessions` via Supabase Realtime — no polling

#### 5D — Noor AI V1 (OpenRouter)
- `/ai` route: full-screen panel
- OpenRouter via Netlify function (openai-compat SDK) — `meta-llama/llama-3.3-70b-instruct:free`
- Full context injected server-side: prayers, tasks, sessions, streaks, time of day
- Streaming response — chunk by chunk rendering as tokens arrive
- Voice input: Web Speech API → transcript → auto-send
- Text-to-speech: Web Speech Synthesis, gender-selectable in settings, mutable
- Noor onboarding: 4-step "Meet Noor" flow on first visit (stored in `profiles.ai_onboarding_done`)
- NoorMiniOrb: floating, visible on all non-AI routes, tap → navigate to /ai
- Conversation stored in `localStorage` — cleared on session end (Supabase persistence is V2)

---

### Phase 6 — Workouts, Challenges & Notifications

#### 6A — Workouts
- Log workout: type (Cardio / Strength / Flexibility / Sport / Walk / Yoga / Swim / Other), duration, intensity (Easy / Moderate / Hard), date, notes
- Form: Vaul sheet (mobile) / Dialog (desktop), React Hook Form + Zod
- View: weekly grid (7 columns, each showing workout icon + duration), monthly heatmap
- Workout list: chronological, grouped by week
- Streak + total hours stat at top

#### 6B — Challenges
Templates: 75 Hard | 21-Day Consistency | Ramadan | Custom

- 75 Hard rules: 2×45min workouts (one outdoor), diet, 1 gallon water, 10 pages non-fiction, progress photo
- Ramadan rules: fast, Quran (≥1 page), Tahajjud (optional), charity (optional), dua
- Custom: user names challenge, sets duration (1–100 days), adds rules (required/optional toggle)
- Challenge detail: daily check-in with each rule as a toggle row
- Calendar heatmap of completion history within challenge
- Streak counter per challenge
- Active challenge shown on Dashboard

#### 6C — Notification Center
- Bell icon in Navigation header (desktop) / in More sheet (mobile)
- Unread badge count on bell
- Panel: list of notifications (type icon + title + body + time ago)
- Types: AI suggestion (teal), streak alert (amber), challenge update (purple), system (grey)
- Tap notification → navigate to linked view, mark as read
- "Mark all read" button
- Notifications written by Netlify functions (AI scheduler, streak monitor)

#### 6D — Push Notifications
- Service Worker registered on app load (`public/sw.js`)
- Permission requested after first successful login (not on landing page)
- `push_tokens` table stores VAPID subscription per user
- Netlify function sends Web Push for: morning brief (user-configured time), streak at-risk alerts, AI check-ins
- Notification click → deep links to relevant view

---

### Phase 7 — Testing & Hardening

#### 7A — Unit Tests (Vitest)
- All utility functions: date formatting, streak calculation, prayer completion scoring
- All hooks: `useTimer`, `useGarden`, `useStreak`, `useTheme`, `useCoins` (V2)
- All service functions: tested with mocked Supabase client
- Auth context: all state transitions
- Prayer log upsert: same-day upsert doesn't duplicate
- Coin calculation (V2): all earn rules, daily caps, streak bonuses
- Coverage target: 80%+ on `services/` and `hooks/`

#### 7B — Integration Tests (Vitest + Testing Library)
- Prayer: toggle Fajr fardh → optimistic UI → Supabase upsert called with correct params
- Pomodoro: reach 0 → session written → garden tree count +1
- Task: create → appears in today → swipe-complete → moves to done section
- Adhkar: complete morning set → log saved → confetti fires
- Calendar: add task from day sheet → appears in week view same date
- Quran: submit log form → appears in session list

#### 7C — E2E (Playwright — runs against `supabase start`)
1. Sign up → username → onboarding → dashboard
2. Start 25min focus → complete → garden tree appears
3. Start focus → kill mid-session → tree is dead in garden
4. Log all 5 fardh prayers → streak = 1
5. Log Quran session → appears in log
6. Create task → complete it → done section
7. Complete morning adhkar set → confetti + log saved
8. Calendar: month view → tap day → add task → week view shows it
9. Cmd+K: open palette → type "add task" → modal opens
10. Theme toggle: dark → light → dark

CI: GitHub Actions — unit+integration on every push, E2E on PR to main.

#### 7D — Database & Security (pgTAP)
- User A cannot SELECT `prayer_logs` where `user_id = User B`
- Unauthenticated returns 0 rows on all tables
- `UNIQUE(user_id, date)` on `prayer_logs` — duplicate throws, upsert succeeds
- Profile trigger fires on new auth user
- `garden_trees`: client cannot write `is_alive = false` directly — only via server function (V2 coin system)

#### 7E — Performance & Accessibility
- Lighthouse CI in GitHub Actions: ≥95 performance, 100 accessibility, 100 best practices
- Web Vitals targets: LCP <2.5s, FID <100ms, CLS <0.1
- Bundle audit: `vite-bundle-visualizer` — initial JS <200KB (PixiJS excluded from initial bundle)
- PixiJS chunk: loads only on `/focus` route
- 60fps garden: profiled on Chrome DevTools, Galaxy A52 target
- All buttons/inputs: `min-h-[44px]` verified in tests
- All icon buttons: `aria-label` verified in accessibility tests
- `prefers-reduced-motion`: all Framer Motion wrapped in `useReducedMotion()` check

#### 7F — Cross-Browser & Responsive QA
- Chrome 124+, Firefox 124+, Safari 17+
- Chrome Android, Safari iOS 16+
- Breakpoints: 375px, 390px, 430px, 768px, 1024px, 1280px, 1440px
- Bottom tab bar: safe-area-inset tested on iPhone 15 Pro (home indicator clearance)
- Web Speech API: mic button hidden if `!('webkitSpeechRecognition' in window)`
- Vaul sheets: tested on iOS Safari (no rubber-band scroll bleed)


---

## Version 2 — AI Upgrade, Gamification & Growth

**Prerequisite:** V1 shipped, all tests green.  
**Timeline estimate:** 10–12 weeks

---

### Phase 1 — Claude API + Noor V2

#### 1A — Claude Migration
- Replace OpenRouter free model with Anthropic Claude API (`claude-sonnet-4-6`)
- `claude-haiku-4-5` for fast ops (action confirmations, quick summaries)
- Prompt caching on system prompt — `cache_control: {type: "ephemeral"}` on first 2 turns
- Streaming: `stream: true` — chunks rendered token by token in UI
- Netlify function `claude-chat.ts` replaces `ai-chat.ts`
- All existing prompt structure migrated and improved

#### 1B — Full Context Injection (Server-Side Only)
Assembled in Netlify function before every Claude call:
```
- ISO datetime + timezone + hijri date approximation
- Today's prayer log (per-prayer fardh + sunnah status)
- Tasks: due today, overdue, upcoming 3 days
- Focus sessions: last 7 days (completed vs killed ratio)
- Quran: last 7 days sessions + total pages this week
- Streaks: prayer, quran, focus, workout (current + longest)
- User ai_profile: communication_style, most_productive_time, prayer_consistency_score
- Top 5 memories by relevance_score from ai_memories table
- Last 20 messages of current conversation
```
Client sends only the user message. Zero context assembled client-side.

#### 1C — AI Tool Use (Claude)
```
Tools Noor can call:
  create_task(title, due_date?, priority?, category?)
  complete_task(task_id)
  log_prayer(prayer_name, include_sunnah?, date?)
  log_quran(pages?, surah_number?, duration_minutes?)
  log_adhkar(set_id)
  start_focus_session(duration_minutes?, task_id?)
  log_workout(type, duration_minutes, intensity?)
  get_todays_summary()          ← read-only, silent
  get_streak_report()           ← read-only, silent
  get_tasks(filter?)            ← read-only, silent
  schedule_reminder(message, iso_datetime)
```
- Read-only tools: execute immediately, result injected into Noor's next response
- Write tools: show `<ActionCard>` in chat — user confirms or dismisses before execution
- `ActionCard`: shows what Noor intends to do, confirm (teal) + cancel (ghost) buttons
- Failed actions: reported back to Claude in next turn for recovery

#### 1D — AI Memory (Persistent, Supabase)
- `ai_memories` table: `id, user_id, category, content, relevance_score, created_at, source_conversation_id`
- After each conversation (background Netlify function call): Claude extracts memories worth storing
- Categories: goal / struggle / preference / milestone / spiritual / insight
- Relevance decay: weekly Netlify scheduled function reduces `relevance_score` by 0.1 for entries older than 30 days
- Memory viewer in Settings: list of all memories, delete individual memory, "Clear all" option

#### 1E — AI Personality Profile
- `user_ai_profiles` table: `communication_style, preferred_notification_times[], engagement_rate, most_productive_time, prayer_consistency_score, focus_sessions_per_week`
- Updated by background analysis after each session
- Noor adapts tone: `encouraging` | `direct` | `casual` | `formal`
- User can override style in Settings

#### 1F — Proactive Intelligence + Push
- Morning brief: Claude-generated push notification at user's configured time — personalised based on today's tasks, prayer schedule, active streaks
- Prayer break: if mid-focus-session and prayer time is within 15 minutes → gentle notification
- Streak protection: if streak at risk and <2 hours left in day → "Your [x]-day streak is at risk"
- All notification text Claude-generated per user (not templated strings)
- Netlify scheduled functions (every 15 minutes) check conditions, send if triggered

#### 1G — Noor UI V2
- Full-height side panel on desktop, full-screen on mobile
- Streaming text: word-by-word rendering, cursor blink while generating
- Action cards inline in message thread
- Voice input with live transcript shown as user speaks
- Conversation history: last 10 conversations stored in Supabase, browsable in sidebar
- Memory viewer accessible from Noor header
- Settings shortcut in Noor panel

---

### Phase 2 — Gamification

#### 2A — Coin Economy

| Action | Coins | Daily Cap |
|---|---|---|
| Complete focus session (25min) | 10 | — |
| Complete focus session (50min+) | 25 | — |
| Log all 5 fardh prayers | 20 | 20 |
| Log each fardh prayer | 2 | 10 |
| Log all sunnah (any day) | 10 | 10 |
| Log Tahajjud | 5 | 5 |
| Log Quran (any) | 5 | — |
| Log Quran (30min+) | 15 | 15 |
| Complete Morning adhkar set | 8 | 8 |
| Complete Evening adhkar set | 8 | 8 |
| Complete a task | 3 | 30 |
| Log a workout | 10 | 10 |
| Complete challenge day | 15 | 15 |
| Study group session (30min+) | 20 | 20 |
| 7-day prayer streak bonus | 50 | once per milestone |
| 7-day focus streak bonus | 50 | once per milestone |
| 30-day any streak | 200 | once per milestone |

**Anti-gaming (server-side only):**
- Focus coins: `completed = true AND killed = false AND duration_minutes >= 0.8 * target_minutes`
- Daily caps enforced via SQL: `SUM(amount) WHERE user_id = ? AND reason_category = ? AND created_at >= today`
- Streak milestones: boolean flag per milestone in `streak_milestones` table — can't double-claim

#### 2B — Coin Backend
- `coin_ledger` — append-only: `id, user_id, amount, reason, reason_category, action_ref, created_at`
- `user_coin_balance` — Postgres view: `SUM(amount) WHERE user_id = auth.uid()`
- RLS on `coin_ledger`: `SELECT` allowed for own rows, `INSERT` blocked for all (service role only)
- Netlify function `award-coins.ts` — validates action, checks daily cap, inserts ledger row
- Client reads balance from `user_coin_balance` view
- `species_owned` table: `user_id, species_id, purchased_at`

#### 2C — Tree Species Shop

| Species | Cost | Reference |
|---|---|---|
| Olive (Zaytoun) | Free | Surah An-Nur 24:35 |
| Palm (Nakhl) | Free | Surah Maryam 19:25 |
| Cedar (Arz) | Free | Surah Ibrahim 14:24 |
| Fig (Teen) | Free | Surah At-Teen 95:1 |
| Pomegranate (Rumman) | Free | Surah Al-An'am 6:141 |
| Lotus (Sidr) | Free | Surah An-Najm 53:14 |
| Ancient Olive (Zaytouna) | 100 | Surah Al-Mu'minun 23:20 |
| Sidrat al-Muntaha | 300 | Surah An-Najm 53:14 |
| Jasmine (Yasmeen) | 80 | — |
| Rose of Jericho | 200 | — |
| Tuba Tree | 500 | Hadith — rarest |
| Sacred Fig | 150 | — |

- Shop UI: grid of species cards with procedural tree preview (mini PixiJS render), name, Quranic reference, price
- Locked: silhouetted preview, coin badge
- Owned: "Select" button
- Active: teal border
- Coin balance in shop header, live-updating via TanStack Query

#### 2D — Achievements (20)

| # | Name | Trigger | Reward |
|---|---|---|---|
| 1 | First Tree | Plant first tree | 20 coins |
| 2 | Consistent | 7-day prayer streak | 50 coins |
| 3 | Scholar | 30 Quran sessions | 30 coins |
| 4 | Iron Focus | 50 completed sessions | 40 coins |
| 5 | Green Thumb | 50 trees planted | 50 coins |
| 6 | Never Quit | 30 sessions, 0 killed | 100 coins |
| 7 | Night Prayer | Log Tahajjud 10× | 30 coins |
| 8 | Morning Person | Morning adhkar 21 days | 40 coins |
| 9 | Balanced | Prayer + Quran + Focus same day, 7 days | 75 coins |
| 10 | Challenger | Complete a 21-day challenge | 60 coins |
| 11 | Ramadan Ready | Complete Ramadan challenge | 150 coins |
| 12 | Ancient Grove | Own a stage-6 ancient tree | 30 coins |
| 13 | Collector | Own all 12 species | 100 coins |
| 14 | Streak Master | Any streak to 30 days | 100 coins |
| 15 | Centurion | 100 focus sessions total | 80 coins |
| 16 | Devoted | Log all 6 prayers (inc. Tahajjud) in one day | 25 coins |
| 17 | Word Keeper | 365 days using the app (any activity) | 500 coins |
| 18 | Garden of Eden | 100 trees in garden | 200 coins |
| 19 | The Early Bird | Complete Fajr 30 days in a row | 75 coins |
| 20 | Noor's Favourite | Use Noor AI 50 times | 40 coins |

- Achievement check runs server-side on each coin award event
- Notification: slide-in Sonner toast with achievement name + coin reward
- Achievement showcase on profile: 3 pinned, full list on profile page

---

### Phase 3 — Study Rooms, Profile & Analytics

#### 3A — Study Rooms (Rebuilt)
- Room creation: name, description, max participants, focus duration, tree species
- Supabase Realtime subscriptions for presence and timer sync
- Join by 6-char code or deep link `/join/:roomId`
- Room state: `rooms` table with `status: waiting | active | ended`
- Presence: `room_participants` — joins + leaves via Supabase Realtime
- Shared timer: host starts, all clients sync via Realtime broadcast
- Session: timer runs, participants see each other's status (active/idle/left)
- Text chat: minimal — `room_messages` table, max 200 chars, Realtime subscription
- Emoji reactions: 6 reactions, float up and fade (Framer Motion)
- Session end: all completers → `award-coins.ts` called per user
- Deep link handling: `/join/:roomId` stores roomId in `sessionStorage`, resolves post-auth

#### 3B — Profile Page
- Avatar: upload to Supabase Storage (image resize via Edge Function), or initials fallback
- Username + display name (editable)
- Coin balance with 7-day sparkline
- Achievement showcase: 3 pinned (user-selectable) + "View all" grid
- Stats: total focus hours, prayers logged, trees planted, longest streak, Quran pages
- Join date + days active
- Garden thumbnail: mini PixiJS render of user's garden

#### 3C — Settings Page
**Sections:**
- Notifications: push on/off, morning brief time, streak alerts on/off, quiet hours
- Prayer times: configure each of 6 prayer times manually
- Focus timer: work duration, short break, long break, sessions before long break, sound on/off
- Noor AI: communication style, TTS voice gender, TTS on/off, memory viewer, clear conversation
- Theme: Light | Dark | System
- Language: English (labels for prayers/adhkar — not full i18n in V2)
- Account: change display name, change email, change password, export data (JSON download), delete account (requires typing "DELETE" to confirm)

#### 3D — Analytics
- Focus time: grouped bar chart by day-of-week (last 4 weeks) — pure SVG
- Prayer consistency: 90-day heatmap grid — cell colour = fardh % that day
- Quran: cumulative pages line chart over last 30 days
- Coins earned: bar chart by category over last 30 days
- All charts: custom SVG components, animated on mount with `requestAnimationFrame` counter
- Export: "Save as PNG" — `canvas.toBlob()` from chart SVG rasterised via canvas

---

### Phase 4 — Testing, Security & Launch

#### 4A — Extended Unit + Integration Tests
- All coin rules: every earn condition, every daily cap, every milestone
- AI tools: all 10 tools with mock Supabase + mock Claude response
- Study room sync: Realtime broadcast mock — timer start propagates to 3 clients
- Species purchase: deduct coins → `species_owned` row created
- Achievement triggers: all 20 achievements have dedicated test
- Memory extraction: conversation input → memory row inserted

#### 4B — Security Audit
- Full RLS re-audit: every table, every operation (SELECT/INSERT/UPDATE/DELETE)
- `coin_ledger`: confirm client INSERT returns RLS violation (Playwright test against live Supabase)
- `species_owned`: client read allowed, client insert blocked
- All Netlify functions: validate `Authorization: Bearer <supabase_jwt>` header
- Rate limiting: 60 req/min per user_id per function (Redis or in-memory with TTL)
- Input validation: Zod schemas on all function inputs
- API keys: `grep -r "sk-ant\|gsk_\|supabase_service_role" src/` fails CI if any match found
- CORS: `_headers` file restricts to `salsabil.netlify.app`
- CSP header in `netlify.toml`
- No message content in server logs (only metadata: user_id, function_name, duration_ms)

#### 4C — Load Testing (k6)
- 100 concurrent focus session completions → `award-coins.ts`
- 100 concurrent prayer log upserts
- Study room: 20 participants subscribing to same Realtime channel
- Garden: 200 trees rendered, FPS profiled at 60fps floor
- Supabase: verify no connection pool exhaustion, no slow queries (>500ms)

#### 4D — E2E Full Suite (Playwright)
All V1 tests +
- Complete focus session → coins awarded → balance in shop increases
- Purchase species → species available in garden selector
- Achievement unlocked → Sonner toast fires → shown in profile
- Study room: User A creates → User B joins via link → session completes → both get coins
- AI: ask Claude to create task → ActionCard shown → confirm → task in DB
- AI: ask for summary → correct data from Supabase returned
- Memory: chat with goal → memory row in `ai_memories` DB after convo ends
- Challenge: complete day → check-off all rules → coins awarded

#### 4E — Observability
- Sentry (free tier): client errors + Netlify function errors
- Sentry performance traces on all Netlify function calls > 500ms
- Supabase: slow query monitor, alerts on p95 > 1s
- UptimeRobot: `salsabil.netlify.app` every 5 minutes
- Self-hosted Umami: page views, session duration, top views — no cookies, no GDPR banner needed

#### 4F — Launch Checklist
- [ ] Netlify deploy live, HTTPS forced, www redirect
- [ ] All env vars in Netlify dashboard (zero in code)
- [ ] PWA: `manifest.json` + service worker, installable iOS + Android
- [ ] All `og:` meta tags (title, description, image) on every route
- [ ] `robots.txt` — allow all (no private routes indexed)
- [ ] Privacy policy page (required for Google OAuth)
- [ ] `netlify.toml` security headers: CSP, HSTS, X-Frame-Options, Referrer-Policy
- [ ] Supabase: daily automated backups + PITR enabled
- [ ] Separate prod Supabase project from dev
- [ ] Umami tracking snippet in `index.html`
- [ ] All PWA icons verified (existing sizes from `salsabil-original.png` are correct — carry over as-is)
- [ ] Sentry DSN configured in both client and Netlify functions
- [ ] Load test results pass before go-live


---

## File Structure (Final)

```
salsabil/
├── src/
│   ├── app/
│   │   ├── App.tsx               # Providers stack + RouterProvider
│   │   ├── router.tsx            # All routes, all lazy-loaded
│   │   └── providers.tsx         # ThemeProvider, AuthProvider, QueryProvider
│   ├── components/
│   │   ├── ui/                   # shadcn/ui — owned, not a dep
│   │   ├── layout/
│   │   │   ├── Navigation.tsx    # THE only nav component
│   │   │   ├── Sidebar.tsx       # Desktop rail (used by Navigation)
│   │   │   ├── BottomBar.tsx     # Mobile tab bar (used by Navigation)
│   │   │   ├── MoreSheet.tsx     # Vaul sheet for overflow nav items
│   │   │   ├── PageShell.tsx     # Every view's outer wrapper
│   │   │   ├── SectionHeader.tsx # Consistent h2 + subtitle + action
│   │   │   └── NoorMiniOrb.tsx   # Floating orb, rendered in Navigation
│   │   └── shared/
│   │       ├── EmptyState.tsx    # Consistent illustrated empty states
│   │       ├── SkeletonLoader.tsx # Per-view skeleton variants
│   │       ├── CommandPalette.tsx # Cmd+K — cmdk wrapper
│   │       ├── ConfirmDialog.tsx  # Reusable destructive action confirm
│   │       ├── CoinDisplay.tsx   # Coin badge (V2)
│   │       └── StreakBadge.tsx   # Streak counter badge
│   ├── views/
│   │   ├── auth/                 # /auth
│   │   ├── dashboard/            # /
│   │   ├── prayer/               # /prayers
│   │   ├── quran/                # /quran
│   │   ├── adhkar/               # /adhkar
│   │   ├── focus/                # /focus — Pomodoro + Garden combined
│   │   │   ├── FocusView.tsx     # Tab shell: Timer | Garden | Shop(V2)
│   │   │   ├── PomodoroTimer.tsx
│   │   │   ├── GardenCanvas.tsx  # PixiJS wrapper
│   │   │   ├── PixiGarden.ts     # PixiJS scene manager
│   │   │   ├── TreeRenderer.ts   # Drawing logic
│   │   │   └── species/          # Per-species config
│   │   ├── tasks/                # /tasks
│   │   ├── calendar/             # /calendar — Month|Week|Day views
│   │   ├── workouts/             # /workouts
│   │   ├── challenges/           # /challenges
│   │   ├── study-rooms/          # /rooms, /rooms/:id, /join/:roomId
│   │   ├── ai/                   # /ai
│   │   │   ├── NoorView.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── ActionCard.tsx    # Tool use confirmation (V2)
│   │   │   └── NoorOnboarding.tsx
│   │   ├── profile/              # /profile
│   │   ├── settings/             # /settings
│   │   └── analytics/            # /analytics (V2)
│   ├── hooks/
│   │   ├── useTimer.ts           # Pomodoro countdown logic
│   │   ├── useGarden.ts          # Garden trees query + mutations
│   │   ├── useStreak.ts          # Streak calculations
│   │   ├── useTheme.ts           # Dark/light toggle
│   │   ├── useNotifications.ts   # In-app notification query
│   │   ├── useCommandPalette.ts  # Cmd+K state
│   │   └── useCoins.ts           # Coin balance query (V2)
│   ├── lib/
│   │   ├── supabase.ts           # Typed client singleton
│   │   ├── database.types.ts     # Generated: supabase gen types
│   │   ├── query.ts              # TanStack Query client
│   │   └── cn.ts                 # clsx + tailwind-merge utility
│   ├── services/                 # Pure data access, one file per domain
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
│   │   ├── profile.ts
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
│       ├── ai-chat.ts            # V1 AI (OpenRouter free)
│       ├── claude-chat.ts        # V2 AI (replaces ai-chat)
│       ├── claude-actions.ts     # V2 tool execution
│       ├── award-coins.ts        # V2 server-side coin award
│       ├── push-notify.ts        # Web Push sender
│       └── memory-extract.ts     # V2 background memory extraction
├── supabase/
│   ├── migrations/               # 001_initial.sql, 002_v2_coins.sql, etc.
│   ├── seed.sql                  # Dev seed: 1 user, 30 days of data
│   └── tests/                   # pgTAP RLS tests
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── public/
│   ├── salsabil-original.png     # Source logo — carry over unchanged
│   ├── salsabil-icon-*.png       # All sizes — carry over unchanged
│   ├── favicon.ico               # Carry over
│   ├── favicon.png               # Carry over
│   ├── manifest.json             # Rewrite content, same icon refs
│   └── sw.js                     # Service Worker (generated by build)
├── .github/
│   └── workflows/
│       ├── ci.yml                # Unit + integration on push
│       └── e2e.yml               # Playwright on PR to main
└── ...
```

---

## What We Are NOT Building

- Social feed, public profiles, leaderboards — stats are private
- In-app purchases — free app
- Native mobile app — PWA is the strategy
- Third-party prayer time API — user-configured times only
- Full Arabic UI — Arabic text for prayers/adhkar only
- Offline-first — optimistic UI is sufficient
- Competitive features — no comparing users to each other

---

## Summary: Why This Will Be Peak Quality

1. **Uniformity** — CVA + design tokens + eslint enforcement means every component looks the same. No more "stacked branches" aesthetic.
2. **Speed** — TanStack Query caching makes every revisited view instant. PixiJS lazy-loaded. Code split on every route. <200KB initial bundle.
3. **Feel** — Vaul bottom sheets, View Transitions API, Framer Motion layouts, haptic feedback — the app feels native on mobile.
4. **Garden** — Procedural PixiJS trees with GSAP wind physics. Real-time growth. Forest-app quality, not SVG clip-art.
5. **AI** — In V2, Noor has full context, memory, and can actually take actions. Not a chatbot bolted on.
6. **Trust** — pgTAP RLS tests, Playwright E2E, Vitest unit tests, Lighthouse CI. Nothing ships broken.

