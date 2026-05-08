# Deployment Guide

## Prerequisites
- Node.js 20+
- [Netlify CLI](https://docs.netlify.com/cli/get-started/): `npm i -g netlify-cli`
- A [Supabase](https://supabase.com) account
- An [OpenRouter](https://openrouter.ai) account (free)

---

## 1. Get the code

```bash
git clone https://github.com/SyedMohammedSameer/salsabil.git
cd salsabil
git checkout claude/review-project-structure-gMdJd
npm install
```

---

## 2. Supabase — create project

1. Go to [supabase.com](https://supabase.com) → New project
2. Pick a name, region, and strong DB password → Create

---

## 3. Supabase — run migrations

Go to **SQL Editor** in your Supabase dashboard and run each file **in order**:

```
supabase/migrations/0001_initial_schema.sql
supabase/migrations/0002_study_rooms.sql
supabase/migrations/0003_coins_and_garden.sql
supabase/migrations/0004_push_subscriptions.sql
```

Paste each file's contents and click **Run**.

---

## 4. Supabase — enable Realtime

Run this in **SQL Editor** (more reliable than the UI):

```sql
alter publication supabase_realtime add table
  public.study_rooms,
  public.room_participants,
  public.room_messages,
  public.notifications;
```

---

## 5. Supabase — get your keys

**Settings → API**:

| Key | Where to find |
|---|---|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | `anon` / `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (keep secret) |

> **Common mistake**: `VITE_SUPABASE_URL` must be the **API URL**, not the dashboard URL.
> - Correct: `https://xqgfuhtnafuuugqigokr.supabase.co`
> - Wrong: `https://supabase.com/dashboard/project/xqgfuhtnafuuugqigokr`

---

## 6. OpenRouter key

1. Go to [openrouter.ai/keys](https://openrouter.ai/keys)
2. Create a key → copy it as `OPENROUTER_API_KEY`

---

## 7. Generate VAPID keys

```bash
npm run generate-vapid
```

Copy all three lines into your `.env` (step 8).

---

## 8. Set up local `.env`

```bash
cp .env.example .env
```

Fill in `.env`:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

OPENROUTER_API_KEY=sk-or-v1-...

VAPID_PUBLIC_KEY=<from step 7>
VAPID_PRIVATE_KEY=<from step 7>
VITE_VAPID_PUBLIC_KEY=<same as VAPID_PUBLIC_KEY>
```

---

## 9. Run locally

```bash
npm run dev
```

Opens at `http://localhost:8888` — frontend + Netlify functions together.

---

## 10. Deploy to Netlify

### Option A — Netlify UI (easiest)

1. Push your branch to GitHub (if not already)
2. [app.netlify.com](https://app.netlify.com) → **Add new site → Import from Git**
3. Connect GitHub → select the repo → set branch to `claude/review-project-structure-gMdJd`
4. Build settings are auto-detected from `netlify.toml`
5. Click **Deploy site**

### Option B — CLI

```bash
netlify login
netlify init          # follow prompts, link to your Netlify site
netlify deploy --prod
```

---

## 11. Set Netlify environment variables

**Site settings → Environment variables** → add all of these:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `OPENROUTER_API_KEY` | Your OpenRouter key |
| `VAPID_PUBLIC_KEY` | From step 7 |
| `VAPID_PRIVATE_KEY` | From step 7 |
| `VITE_VAPID_PUBLIC_KEY` | Same as `VAPID_PUBLIC_KEY` |

After adding variables → **Trigger deploy** for them to take effect.

---

## 12. Supabase Auth — add your site URL

**Authentication → URL Configuration**:

- **Site URL**: `https://your-site.netlify.app`
- **Redirect URLs**: `https://your-site.netlify.app/**`

Also add `http://localhost:8888/**` to **Redirect URLs** so local sign-in works.

---

## 13. Google OAuth (optional but recommended)

### Step 1 — Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → your project → **APIs & Services → Credentials**
2. **Create Credentials → OAuth 2.0 Client ID** → Web application
3. Under **Authorized redirect URIs** add:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
4. Copy the **Client ID** and **Client Secret**

### Step 2 — Supabase Dashboard

**Authentication → Providers → Google**:
- Toggle **Enable**
- Paste Client ID + Client Secret
- Save

### Step 3 — Local `.env` (optional, for local OAuth testing)

Add to **Redirect URLs** in Supabase:
```
http://localhost:8888/**
```

---

## Migrating users from Firebase

Supabase supports Firebase's scrypt hash variant, so **email/password users won't need to reset their passwords**.

### Step 1 — Export from Firebase

```bash
npm i -g firebase-tools
firebase login
firebase auth:export firebase-users.json --format=json
```

### Step 2 — Run the migration script

```bash
SUPABASE_URL=https://xxxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
npm run migrate-users firebase-users.json
```

### What happens per user type

| User type | Result |
|---|---|
| Email + password | Imported with hash — signs in with same password, no reset needed |
| Google / Apple OAuth | Just sign in with Google/Apple — Supabase auto-creates the account |
| Email only (no password) | Imported — send a password reset email after migration |

### Notes
- The script preserves Firebase UIDs as Supabase user IDs — deep links and existing data references stay valid
- Duplicate emails are skipped and reported (safe to re-run)
- The `profiles` row is auto-created by the `handle_new_user` trigger on first sign-in for OAuth users; for imported password users it fires on import

---

## Verification checklist

- [ ] Sign up creates a profile and triggers onboarding
- [ ] Prayers log correctly
- [ ] Focus session completes → coins increase
- [ ] Garden plants a tree and gains XP after focus
- [ ] Study room chat updates in real time (open two tabs)
- [ ] Noor AI responds with streaming text
- [ ] Push notifications prompt appears in Settings
