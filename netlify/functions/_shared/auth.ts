// Shared auth helper for Netlify functions.
//
// Verifies the caller's Supabase access token (JWT) so that quota-consuming
// endpoints (ai-chat, tts) can't be hit anonymously. The browser attaches its
// session token as `Authorization: Bearer <access_token>`; we validate it
// server-side with the service-role client.
//
// Files inside this `_shared/` subdirectory are NOT deployed as their own
// functions by Netlify — only top-level files in netlify/functions are.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Validate a Supabase access token pulled from an Authorization header.
 * Returns the authenticated user's id, or null if the token is missing,
 * malformed, expired, or the server isn't configured for auth.
 */
export async function verifyUser(
  authHeader: string | null | undefined,
): Promise<string | null> {
  if (!supabaseUrl || !serviceKey) return null

  const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}
