import type { ExpoConfig } from 'expo/config'

// Expo app configuration.
//
// `extra` is the bridge between build-time environment variables and the
// runtime env adapter in ../src/lib/platform/env.native.ts. EXPO_PUBLIC_*
// variables are inlined at build time, so these must be set wherever the
// build runs (locally in .env, on EAS via `eas secret:create`).

const SCHEME = 'salsabil'

// Sampled from the brand artwork (public/salsabil-original.png). The splash
// and adaptive-icon backgrounds must match it exactly, or a seam shows where
// the generated mark's canvas meets the screen. See scripts/generate-assets.mjs.
const BRAND_BG = '#023728'
// One step darker, for the dark-mode splash.
const BRAND_BG_DARK = '#011f16'

// EAS project id. A public identifier, not a secret.
//
// This must be a literal rather than only an env var: .env is gitignored, so it
// is never uploaded to the EAS Build servers, where app.config.ts is
// re-evaluated. Reading it solely from process.env works locally and then fails
// the cloud build with a missing project id.
//
// `eas init` prints the value — paste it here. The env var stays as an override
// for CI or a second Expo account.
//
// Note the `||` rather than `??`: .env.example ships EAS_PROJECT_ID with an
// empty value, so a copied .env sets it to '', which `??` would accept as a
// real override and resolve the project id to nothing.
const EAS_PROJECT_ID =
  process.env.EAS_PROJECT_ID || '85744519-5af5-4cda-99a3-325bc0485e10'

const config: ExpoConfig = {
  name: 'Salsabil',
  slug: 'salsabil',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  // Deep-link scheme. Supabase OAuth redirects back to salsabil://auth-callback,
  // so this value must also be registered as a redirect URL in the Supabase
  // dashboard under Authentication -> URL Configuration.
  scheme: SCHEME,
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'app.salsabil.mobile',
    infoPlist: {
      // Deliberately NOT declared yet:
      //
      //   UIBackgroundModes: ['audio'] — for background Quran recitation and
      //   Noor's text-to-speech. Apple verifies that a declared background mode
      //   is actually exercised, and rejects apps that reserve one they never
      //   use. Restore it in the same change that ships audio playback.
      //
      //   NSMicrophoneUsageDescription — for voice input to Noor. The native
      //   app has no recording path yet (src/lib/voice.ts is MediaRecorder,
      //   web-only), and a usage description for a capability the app never
      //   invokes invites review questions. Restore it with voice input.
      NSLocationWhenInUseUsageDescription:
        'Salsabil uses your location to calculate accurate prayer times for where you are.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'app.salsabil.mobile',
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: BRAND_BG,
    },
    permissions: [
      // RECORD_AUDIO is omitted for the same reason as the microphone usage
      // description above: Play asks you to justify every permission, and one
      // with no in-app path is a rejection risk.
      //
      // Prayer reminders are scheduled on-device and must fire at the exact
      // adhan time, not whenever Android next decides to wake the app.
      'SCHEDULE_EXACT_ALARM',
      'POST_NOTIFICATIONS',
      'VIBRATE',
      // Location permissions are contributed by the expo-location plugin
      // below; listing them here too produced duplicate manifest entries.
    ],
  },
  plugins: [
    'expo-router',
    'expo-localization',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Salsabil uses your location to calculate accurate prayer times for where you are.',
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: BRAND_BG,
        dark: { backgroundColor: BRAND_BG_DARK },
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#14b8a6',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    // Absolute origin of the deployed Netlify site. Native builds have no
    // same-origin server, so serverless function calls must be addressed in
    // full. See ../src/lib/api/functions.ts.
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    authCallbackUrl: `${SCHEME}://auth-callback`,
    eas: {
      projectId: EAS_PROJECT_ID,
    },
  },
}

export default config
