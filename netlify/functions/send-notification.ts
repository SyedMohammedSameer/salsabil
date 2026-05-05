import type { Handler } from '@netlify/functions'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/database.types'

const supabase = createClient<Database>(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

webpush.setVapidDetails(
  'mailto:hello@salsabil.app',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

interface SendPayload {
  user_id: string
  title: string
  body?: string
  url?: string
  type?: string
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  // Only callable with service role key (internal use)
  const authHeader = event.headers['authorization'] ?? ''
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return { statusCode: 401, body: 'Unauthorized' }
  }

  let payload: SendPayload
  try {
    payload = JSON.parse(event.body ?? '{}')
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' }
  }

  if (!payload.user_id || !payload.title) {
    return { statusCode: 400, body: 'Missing user_id or title' }
  }

  // Fetch all push subscriptions for this user
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', payload.user_id)

  if (error) {
    return { statusCode: 500, body: error.message }
  }

  if (!subs || subs.length === 0) {
    return { statusCode: 200, body: JSON.stringify({ sent: 0 }) }
  }

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body ?? '',
    url: payload.url ?? '/',
  })

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        message,
      ).catch(async (err: { statusCode?: number }) => {
        // 410 Gone = subscription expired, remove it
        if (err.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', payload.user_id)
            .eq('endpoint', sub.endpoint)
        }
        throw err
      }),
    ),
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length

  return {
    statusCode: 200,
    body: JSON.stringify({ sent, total: subs.length }),
  }
}
