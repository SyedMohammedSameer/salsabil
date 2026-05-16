// Text-to-speech via Microsoft Edge's TTS endpoint (msedge-tts).
//
// Uses the same Azure neural voices that Microsoft Edge's Read Aloud uses.
// Free, no API key, no signup, no card. The endpoint is undocumented (used
// internally by Edge browser), but it's been stable for years and the
// `msedge-tts` package wraps it.
//
// Env vars (all optional):
//   EDGE_TTS_VOICE   — voice short-name, defaults to "en-US-AriaNeural"
//                      See https://learn.microsoft.com/azure/ai-services/speech-service/language-support
//   EDGE_TTS_PITCH   — e.g. "+0Hz", "+5Hz", "-2st"
//   EDGE_TTS_RATE    — e.g. "+0%", "+13%", "-10%"

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'

const DEFAULT_VOICE = 'en-US-AriaNeural'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ReqBody {
  text?: string
  voice?: string
  pitch?: string
  rate?: string
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

  let body: ReqBody
  try {
    body = (await req.json()) as ReqBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const text = (body.text ?? '').trim()
  if (!text) {
    return new Response(JSON.stringify({ error: 'text is required' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // The Edge endpoint supports SSML payloads that go quite large but to stay
  // snappy and predictable we cap input length per call.
  const capped = text.slice(0, 1500)

  const voice = body.voice?.trim() || process.env.EDGE_TTS_VOICE || DEFAULT_VOICE
  const pitch = body.pitch?.trim() || process.env.EDGE_TTS_PITCH || undefined
  const rate = body.rate?.trim() || process.env.EDGE_TTS_RATE || undefined

  const tts = new MsEdgeTTS()
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3)

    const prosody: { pitch?: string; rate?: string } = {}
    if (pitch) prosody.pitch = pitch
    if (rate) prosody.rate = rate

    const { audioStream } = tts.toStream(capped, prosody)

    // Collect the stream into a single Buffer so we can return a clean
    // Content-Length response to the browser's <audio> element.
    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      audioStream.on('data', (chunk: Buffer) => chunks.push(chunk))
      audioStream.on('end', () => resolve())
      audioStream.on('error', (err: Error) => reject(err))
    })

    const audio = Buffer.concat(chunks)
    return new Response(audio, {
      status: 200,
      headers: {
        ...cors,
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audio.byteLength),
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'TTS synthesis failed'
    console.error('[tts] edge-tts error', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } finally {
    try {
      tts.close()
    } catch {
      // ignore
    }
  }
}
