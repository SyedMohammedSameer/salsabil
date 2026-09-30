# 🌿 Salsabil — A Spring of Productivity & Spiritual Growth

**Salsabil** is a productivity app for mindful living and spiritual growth. Named
after the spring in Paradise mentioned in Islamic tradition, it helps users build
productive habits while nurturing their deen.

It ships as a **web app** (React + Vite, deployed on Netlify) and a **native
Android/iOS app** (Expo, in [`mobile/`](mobile/README.md)). Both run on the same
Supabase backend and share their business logic.

![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![React](https://img.shields.io/badge/React-19-blue.svg)
![Expo](https://img.shields.io/badge/Expo-SDK%2057-black.svg)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ecf8e.svg)

> **Android beta:** download the latest APK from
> [Releases](https://github.com/SyedMohammedSameer/salsabil/releases) and report
> anything odd in [Issues](https://github.com/SyedMohammedSameer/salsabil/issues).

## ✨ Features

### 🕌 Deen
- **Prayers** — accurate prayer times for your location, on-device adhan reminders, logging for today and past days
- **Quran** — reading log by surah and ayah, pages, streaks, editing and backdating
- **Adhkar** — morning, evening and after-prayer remembrance with counters

### 🎯 Focus
- **Focus timer** — preset or custom lengths, background-safe, with a tree of your choice growing each session
- **Tasks** — priorities, due times with reminders, descriptions, tags and repeating tasks
- **Study rooms** — public or private rooms with invite links, a shared timer, realtime chat and host moderation

### 🌳 Grow
- **Garden** — every completed session plants a tree; twelve species, six growth stages, nameable trees
- **Challenges** — templates or your own, with daily check-ins, pause and progress
- **Workouts** — log, edit and track training
- **Analytics** — focus, prayer, Quran and workout trends

### ✨ Noor
An AI companion that knows your day and can act on it: log prayers and Quran,
add and complete tasks, start or stop a focus session, report your stats, and
remember what you tell it (memories you can review and delete).

### 🪙 Rewards
Coins for consistent effort, paid once per action by a server-side ledger, so
toggling or re-logging never pays twice.

## 🛠 Architecture

| Layer | Technology |
|---|---|
| Web app | React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/ui |
| Native app | Expo SDK 57, React Native, expo-router, NativeWind — see [`mobile/README.md`](mobile/README.md) |
| Shared logic | `src/lib/api`, `src/hooks`, `src/lib/rewards.ts` — imported by both apps, never duplicated |
| Backend | Supabase: Postgres with row-level security, Auth, Realtime, Storage |
| Serverless | Netlify Functions: `ai-chat` (Noor, via OpenRouter), `prayer-times`, `tts`, `send-notification` |

## 🚀 Getting started

### Web app

```bash
git clone https://github.com/SyedMohammedSameer/salsabil.git
cd salsabil
npm install
cp .env.example .env   # fill in Supabase, OpenRouter and VAPID values
npm run dev            # netlify dev: Vite plus the functions
```

[`DEPLOYMENT.md`](DEPLOYMENT.md) covers creating the Supabase project, running the
migrations in `supabase/migrations/` in order, keys, and deploying to Netlify.

### Native app

```bash
cd mobile
npm install
cp .env.example .env   # Supabase URL and anon key, plus the deployed web app's URL
npm start
```

Builds, beta APKs for testers and the Play Store path are in
[`mobile/README.md`](mobile/README.md) and
[`mobile/store/RELEASE.md`](mobile/store/RELEASE.md).

### Checks

```bash
npm run type-check && npm run lint && npm test   # web and shared code
cd mobile && npm run type-check                  # native app
```

## 🌿 Branches

- **`main`** — the default branch.
- **`app`** — native app development. It carries the native app and the shared
  logic it relies on, and is merged into `main` for release.

## 🛣️ Roadmap

- [x] Native Android/iOS app
- [ ] Android beta feedback round, then Play Store (internal → production)
- [ ] App Store release
- [ ] Voice for Noor on native
- [ ] Crash reporting

### 🤖 Noor — planned upgrades
- [ ] **Quran / Hadith retrieval as a first-class tool** — cite real ayat and graded hadith instead of paraphrasing
- [ ] **Reflection journal** — a guided end-of-day flow that surfaces patterns over time
- [ ] **Time-aware adhkar suggestions** based on prayer times
- [ ] **Named conversation threads**
- [ ] **Daily check-in card** on the dashboard
- [ ] **Persona modes** — spiritual companion, productivity coach, study buddy

## 🤝 Contributing

1. Fork and clone the repository.
2. Create a feature branch: `git checkout -b feature/my-change`.
3. Run the checks above, commit, and open a pull request.

## 📄 License

MIT — see [LICENSE](LICENSE).

---

*"And they will be given to drink a cup [of wine] whose mixture is of ginger, [from] a fountain within Paradise named Salsabil."* — Quran 76:17–18
