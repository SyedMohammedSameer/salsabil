# Data safety declarations

Both stores ask these questions before review, and both treat a wrong answer as
a compliance issue rather than a typo. The answers below are derived from the
source; the "where" column is what to re-check if the app changes.

## Apple — App Privacy (App Store Connect)

| Data type | Collected | Linked to identity | Used for tracking | Purpose | Where |
|---|---|---|---|---|---|
| Email address | Yes | Yes | No | App functionality (account) | Supabase auth |
| Name | Yes, if provided | Yes | No | App functionality | `profiles.display_name` |
| User ID | Yes | Yes | No | App functionality | `profiles.id` |
| Coarse location | Yes, optional | **No** | No | App functionality (prayer times) | `mobile/lib/location.ts` |
| Other user content | Yes | Yes | No | App functionality | Prayer/Quran/task logs, Noor chat, room messages |

**Tracking:** No. The app has no advertising SDK, no ad identifier and no
third-party analytics, so App Tracking Transparency does not apply.

**Location is not linked to identity** because coordinates are sent to the
prayer-time API and cached on the device — they are never written to a row that
identifies the user. Keep that true or change this answer.

**Encryption:** `ITSAppUsesNonExemptEncryption: false` is set in
`app.config.ts`. That is correct while the app only uses HTTPS; adding custom
cryptography would require an export compliance filing.

## Google Play — Data safety

**Collected and shared:**

| Category | Type | Collected | Shared | Optional | Purpose |
|---|---|---|---|---|---|
| Personal info | Email address | Yes | No | No | Account management |
| Personal info | Name | Yes | No | Yes | Account management |
| Location | Approximate location | Yes | **Yes** (Aladhan) | Yes | App functionality |
| Messages | Other in-app messages | Yes | **Yes** (OpenRouter) | No | App functionality |
| App activity | Other user-generated content | Yes | No | No | App functionality |

Location and Noor messages are declared as **shared** because they leave our
infrastructure for a third-party API. That is what Play means by shared, and
under-declaring it is the most common data-safety rejection.

**Security practices to declare:**

- Data is encrypted in transit — yes (HTTPS throughout).
- Users can request deletion — yes (email request; state the address).
- Committed to the Play Families policy — not applicable, not a children's app.

**Permissions to justify in the listing:**

| Permission | Justification |
|---|---|
| `ACCESS_COARSE_LOCATION` / `ACCESS_FINE_LOCATION` | Calculating prayer times for the user's position |
| `POST_NOTIFICATIONS` | Prayer and focus session reminders |
| `SCHEDULE_EXACT_ALARM` | Prayer reminders must fire at the exact adhan time, not on a batched wake |
| `VIBRATE` | Haptic feedback |

## Capabilities deliberately not declared

Three declarations were removed from `app.config.ts` because the native build
does not yet exercise them, and each is a real review risk when unused:

1. **`RECORD_AUDIO`** and **`NSMicrophoneUsageDescription`** — voice input to
   Noor is web-only for now (`src/lib/voice.ts` uses MediaRecorder). Play asks
   you to justify every permission, and Apple questions usage descriptions for
   capabilities an app never invokes.
2. **`UIBackgroundModes: ['audio']`** — reserved for background Quran
   recitation and text-to-speech. Apple actively verifies that a declared
   background mode is used and rejects apps that reserve one they do not; this
   is a common rejection, not a theoretical one.

Restore each in the same change that ships the feature behind it, and update
the tables above at the same time.
