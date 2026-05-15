// Text-to-speech via Hugging Face Inference API.
// Uses `facebook/mms-tts-eng` — small, fast, decent quality, free serverless.
// Returns audio bytes (flac/wav) that the browser plays via Audio element.

const TTS_MODEL = 'facebook/mms-tts-eng'

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

  const token = process.env.HF_TOKEN
  if (!token) {
    return new Response(JSON.stringify({ error: 'HF_TOKEN not set' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  let text: string
  try {
    const body = (await req.json()) as { text?: string }
    text = (body.text ?? '').trim()
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

  // Cap input length — TTS models choke on very long inputs
  const capped = text.slice(0, 800)

  const upstream = await fetch(`https://api-inference.huggingface.co/models/${TTS_MODEL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'audio/flac',
    },
    body: JSON.stringify({ inputs: capped }),
  })

  if (!upstream.ok) {
    const err = await upstream.text()
    console.error('[tts] HF HTTP error', upstream.status, err)
    return new Response(JSON.stringify({ error: `HF ${upstream.status}: ${err}` }), {
      status: upstream.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Stream the audio bytes straight back
  return new Response(upstream.body, {
    status: 200,
    headers: {
      ...cors,
      'Content-Type': upstream.headers.get('content-type') ?? 'audio/flac',
      'Cache-Control': 'no-store',
    },
  })
}
