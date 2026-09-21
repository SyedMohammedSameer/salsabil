import type { ExpoConfig } from 'expo/config'

// Expo app configuration.
//
// `extra` is the bridge between build-time environment variables and the
// runtime env adapter in ../src/lib/platform/env.native.ts. EXPO_PUBLIC_*
// variables are inlined at build time, so these must be set wherever the
// build runs (locally in .env, on EAS via `eas secret:create`).

const SCHEME = 'salsabil'

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
      // Quran recitation and Noor's text-to-speech must keep playing when the
      // screen locks — the main reason this is a native app and not a PWA.
      UIBackgroundModes: ['audio'],
      NSMicrophoneUsageDescription:
        'Salsabil uses the microphone so you can speak to Noor instead of typing.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'app.salsabil.mobile',
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: '#0a1a19',
    },
    permissions: [
      'RECORD_AUDIO',
      // Prayer reminders are scheduled on-device and must fire at the exact
      // adhan time, not whenever Android next decides to wake the app.
      'SCHEDULE_EXACT_ALARM',
      'POST_NOTIFICATIONS',
      'VIBRATE',
    ],
  },
  plugins: [
    'expo-router',
    'expo-localization',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#0a1a19',
        dark: { backgroundColor: '#030505' },
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
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
}

export default config
