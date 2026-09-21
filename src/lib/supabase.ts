import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { env, assertEnv } from './platform/env'
import { storage } from './platform/storage'

assertEnv()

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    // Explicit storage rather than the default: on native there is no
    // localStorage, so without this the session is lost on every cold start.
    storage,
    autoRefreshToken: true,
    persistSession: true,
    // URL-based session detection is a browser concept. On native the OAuth
    // callback arrives as a deep link and is handled in mobile/lib/auth.ts.
    detectSessionInUrl: !env.isNative,
  },
})
