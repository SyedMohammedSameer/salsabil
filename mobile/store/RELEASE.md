# Release runbook

Everything the code can do is done. What remains needs accounts, payment and
signing credentials, which cannot be created from a build environment — these
are the steps for you.

Work top to bottom; each section assumes the previous one is finished.

---

## 0. Before anything else — two Supabase settings

These have been outstanding since the economy rebuild, and nothing works
properly without them.

1. **Run the migrations.** Open the Supabase SQL editor and run, in order, any
   of these not yet applied (each is safe to run again):

   - `supabase/migrations/0006_economy_rebuild.sql` — until you do, every coin
     award fails silently. The `award_coins_once` RPC does not exist, and the
     client deliberately swallows payout errors so they never break a user's
     action, so nobody earns anything on either platform and nothing looks broken.
     If the editor truncates the paste, use the three files in `0006_parts/`.
   - `supabase/migrations/0007_account_deletion.sql` — the in-app account
     deletion App Store review requires.
   - `supabase/migrations/0008_private_rooms.sql` — private study rooms
     joinable by invite code.
   - `supabase/migrations/0009_room_moderation.sql` — hosts removing someone
     from their room.

2. **Register the deep link.** Supabase → Authentication → URL Configuration →
   Redirect URLs, add `salsabil://auth-callback`. Without it OAuth sign-in
   completes in the browser and never returns to the app.

Verify both before building anything: sign in, log a prayer, and check your coin
balance moves.

---

## 1. Accounts

| | Cost | Notes |
|---|---|---|
| **Apple Developer Program** | $99/year | Enrolment can take 24–48 hours, longer for an organisation. Start here — it is the long pole. |
| **Google Play Console** | $25 once | Usually same-day. |
| **Expo account** | Free tier is enough to start | Needed for EAS builds. |

For an organisation account Apple requires a D-U-N-S number, which can itself
take days. An individual account is immediate but publishes under your own name.

---

## 2. Connect the project to EAS

```bash
cd mobile
npm install -g eas-cli
eas login
eas init            # creates the project and writes its id
```

Then store the environment in EAS, so builds do not depend on your local
`.env` (which is never uploaded). Each build profile reads the EAS environment
of the same name:

```bash
for e in preview production; do
  eas env:create --environment $e --visibility plaintext --name EXPO_PUBLIC_SUPABASE_URL      --value "https://YOUR-PROJECT.supabase.co"
  eas env:create --environment $e --visibility plaintext --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR-ANON-KEY"
  eas env:create --environment $e --visibility plaintext --name EXPO_PUBLIC_API_BASE_URL      --value "https://salsabilapp.netlify.app"
done
```

The anon key is safe to ship — row-level security is what protects the data, not
the key's secrecy. **Never** put the service role key here; it bypasses RLS
entirely and would be readable inside the app bundle.

`EXPO_PUBLIC_API_BASE_URL` must be your real Netlify deployment. A native
build has no origin of its own, so a wrong value means the AI chat, prayer
times and text-to-speech all fail with no obvious cause. A preview or
production build refuses to start if any of the three is missing.

---

## 3. Beta test on real phones

Hand an APK to testers before touching the stores. `README.md` → *Beta
testing* has both routes: the GitHub workflow (repository secrets plus a
`beta-N` tag, no Expo account) or `npm run build:beta` on EAS.

Check specifically:

- **Prayer reminders actually fire.** Grant notifications, let a prayer time
  pass, confirm the notification arrives at the right minute. Try it in
  airplane mode — that is the whole point of scheduling on-device.
- **The focus timer survives backgrounding.** Start a session, leave the app for
  a few minutes, come back. The count should be right, and the end-of-session
  notification should arrive even if you never reopened it.
- **OAuth returns to the app**, rather than stranding you in the browser.
- **Coins move** when you log a prayer — the end-to-end proof that step 0 worked.
- **The garden renders.** Tree species are drawn natively rather than ported
  from the web's CSS filters, so this is the one screen where native and web
  legitimately differ.

---

## 4. Store setup

### Apple

1. App Store Connect → **My Apps** → **+** → New App.
   - Platform iOS, bundle ID `app.salsabil.mobile`, SKU anything stable.
2. Fill the listing from `store/listing.md`.
3. Fill **App Privacy** from `store/data-safety.md` (Apple table).
4. Host `store/privacy-policy.md` at a public URL and link it. A repository file
   will not be accepted.
5. Copy the App Store Connect app ID into `eas.json` → `submit.production.ios.ascAppId`,
   along with your Apple ID and team ID.

### Google

1. Play Console → **Create app**.
2. Fill the listing from `store/listing.md`.
3. Complete **Data safety** from `store/data-safety.md` (Play table). Note that
   location and Noor messages are declared as *shared*, because they reach
   third-party APIs — under-declaring this is the most common rejection.
4. Complete the content rating questionnaire.
5. Create a service account with Play Developer API access, download the JSON
   key to `mobile/play-service-account.json` (already gitignored), and set the
   path in `eas.json`.

---

## 5. Build and submit

```bash
eas build --profile production --platform all
eas submit --platform ios
eas submit --platform android
```

EAS generates and stores the signing credentials on first build — accept the
prompts. **Keep the Android upload keystore.** Losing it means you cannot ship
an update to an existing listing without a key reset from Google.

Start Android on the `internal` track (already configured), promote when happy.

---

## 6. Likely review snags for this app specifically

- **Screenshots are mandatory and cannot be generated from here.** Capture them
  on a device or simulator. If you keep `supportsTablet: true`, Apple will
  expect iPad screenshots too — capture them or set it to `false`.
- **Sign-in on a fresh account.** Apple reviews with a clean install and rejects
  apps that appear broken. Give them a demo account in App Review notes, or make
  sure sign-up works flawlessly.
- **Location must be refusable.** Reviewers deliberately decline permissions. The
  Prayers screen handles this — it shows a location prompt and the rest of the
  app keeps working — but verify it yourself before submitting.
- **Religious content** is fine on both stores; no special category applies.
- **Third-party AI.** If asked, Noor's replies come from a model provider
  (OpenRouter) and this is disclosed in the privacy policy.
- **Account deletion** is implemented (Settings → Delete account, behind a
  two-step confirmation). It needs migration `0007_account_deletion.sql` to have
  been run, or the button fails. Run it with `0006` in step 0.

---

## 7. Known gaps before a public launch

Honest list of what is not done, so nothing surprises you in review:

1. **Voice input and background audio are web-only.** The related capability
   declarations were removed from `app.config.ts` so the build does not claim
   what it cannot do; restore them alongside the features.
2. **No crash reporting.** Consider Sentry before a public launch; without it a
   store-only crash is invisible to you.
