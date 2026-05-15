// Text-to-speech via Google Cloud Text-to-Speech.
// Free tier: 4M chars/month for Neural2 voices, 1M for Studio.
// REST API key auth (simplest — no service account needed).
//
// Env vars:
//   GOOGLE_TTS_KEY        — API key with TTS API enabled (required)
//   GOOGLE_TTS_VOICE      — voice name, defaults to "en-US-Neural2-F"
//                           See https://cloud.google.com/text-to-speech/docs/voices
//   GOOGLE_TTS_LANGUAGE   — language code, defaults to "en-US"

const DEFAULT_VOICE = 'en-US-Neural2-F'
const DEFAULT_LANG = 'en-US'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export default async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const apiKey = process.env.GOOGLE_TTS_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GOOGLE_TTS_KEY not set' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  let text: string
  let voiceOverride: string | undefined
  try {
    const body = (await req.json()) as { text?: string; voice?: string }
    text = (body.text ?? '').trim()
    voiceOverride = body.voice?.trim() || undefined
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (!text) {
    return new Response(JSON.stringify({ error: 'text is required' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Cap input to keep us under Google's 5000-byte cap and reduce free-tier burn
  const capped = text.slice(0, 1500)

  const voiceName = voiceOverride ?? process.env.GOOGLE_TTS_VOICE ?? DEFAULT_VOICE
  // Derive language from "xx-YY-..." voice naming convention
  const langFromVoice = voiceName.match(/^([a-z]{2}-[A-Z]{2})/)?.[1]
  const languageCode = process.env.GOOGLE_TTS_LANGUAGE ?? langFromVoice ?? DEFAULT_LANG

  const upstream = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: capped },
        voice: { languageCode, name: voiceName },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 1.05 },
      }),
    },
  )

  if (!upstream.ok) {
    const err = await upstream.text()
    console.error('[tts] Google HTTP error', upstream.status, err)
    return new Response(JSON.stringify({ error: `Google ${upstream.status}: ${err}` }), {
      status: upstream.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const data = (await upstream.json()) as { audioContent?: string }
  if (!data.audioContent) {
    return new Response(JSON.stringify({ error: 'No audio in Google response' }), {
      status: 502,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Decode the base64 MP3 and stream it back to the browser
  const bin = atob(data.audioContent)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)

  return new Response(bytes, {
    status: 200,
    headers: {
      ...cors,
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  })
}
