// Serverless function endpoints.
//
// On web these are same-origin paths that Netlify serves alongside the SPA.
// A native build has no origin of its own — fetch('/.netlify/functions/tts')
// resolves against the bundle URL and fails — so the mobile app supplies an
// absolute base via EXPO_PUBLIC_API_BASE_URL and every caller routes through
// here instead of hardcoding the path.

import { env } from '@/lib/platform/env'

export type FunctionName = 'tts' | 'ai-chat' | 'prayer-times' | 'send-notification'

export function functionUrl(name: FunctionName): string {
  return `${env.apiBaseUrl}/.netlify/functions/${name}`
}
