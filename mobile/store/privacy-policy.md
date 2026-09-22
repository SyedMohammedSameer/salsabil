# Salsabil — Privacy Policy

**Effective date:** _TODO — set this to the date you first publish._
**Contact:** hello@salsabil.app _(confirm this mailbox is monitored; both stores
require a working privacy contact and will reject a bounce.)_

This policy describes what Salsabil collects, why, and who else sees it. It was
written from the application source rather than from a template — every item
below corresponds to a real call in the code.

## What we collect

**Account information.** Your email address, and a display name and username if
you set one. Held in our Supabase database to sign you in and to label you in
shared study rooms.

**The things you log.** Prayers, Quran readings, adhkar, tasks, focus sessions,
workouts, challenges, garden trees, coins and streaks. This is the substance of
the app; without it there is nothing to show you.

**Approximate location — only if you allow it.** Prayer times are astronomical,
so they need coordinates. Your latitude and longitude are sent to the Aladhan
prayer-time API to calculate them, and cached on your device so times still work
offline. We do not store your location on our servers, and we do not track your
movement. Declining means the rest of the app works and prayer times do not.

**Messages you send to Noor.** Your conversation with the in-app assistant is
stored in your account so the thread persists, and is sent to the model provider
to generate a reply.

**Study room messages.** Visible to everyone in that room, as you would expect
of a chat.

## What we do not collect

We do not use advertising identifiers, run third-party analytics or advertising
SDKs, sell or rent your data, or build advertising profiles. We do not collect
contacts, photos, calendar, or precise background location.

## Who else processes your data

| Service | What it receives | Why |
|---|---|---|
| **Supabase** | Your account and everything you log | Database and authentication |
| **Netlify** | Requests to our serverless functions | Hosting |
| **Aladhan** | Latitude and longitude, if you grant location | Prayer time calculation |
| **OpenRouter** | Messages you send to Noor | Generating replies |
| **Groq** | Voice recordings, if you use voice input (web only) | Transcription |
| **Microsoft Azure Speech** | Text that Noor reads aloud | Text-to-speech |

Each processes data under its own terms. We send them the minimum the feature
requires and nothing further.

## Notifications

Prayer and focus reminders are scheduled **on your device**. Nothing is sent to
a server to deliver them, and they work with no network connection. Turning them
off in system settings stops them entirely.

## Your rights

Your data belongs to your account. You can edit your profile and delete
individual entries in the app, and you can request full export or deletion of
your account by emailing the address above. Deleting your account removes your
profile and everything linked to it.

Row-level security is enforced in the database, so one account cannot read
another's data.

## Children

Salsabil is not directed at children under 13, and we do not knowingly collect
data from them.

## Changes

Material changes will be announced in the app and reflected in the effective
date above.
