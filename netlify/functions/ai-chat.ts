// ─── Models ───────────────────────────────────────────────────────────────
// Noor runs on free tiers, which rate-limit hard and retire models without
// notice, so no single model is trusted. Each reply walks a chain, Groq first
// (fastest) and then OpenRouter, moving on whenever a model is rate-limited,
// missing, slow or returns nothing. Either list can be replaced from the
// Netlify environment without a code change, comma-separated:
//
//   GROQ_MODELS        defaults to GROQ_DEFAULT below
//   OPENROUTER_MODELS  defaults to OPENROUTER_DEFAULT below
//
// A provider is used only when its key is set (GROQ_API_KEY,
// OPENROUTER_API_KEY). If every listed model fails, the provider's live model
// list is searched for free chat models not yet tried, so a retired default
// cannot take Noor down on its own.
//
// Non-reasoning models come first: they answer in about a second and follow
// the action-tag format reliably. Reasoning models are a last resort.
const GROQ_DEFAULT = ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'llama-3.1-8b-instant']
const OPENROUTER_DEFAULT = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-3-27b-it:free',
  'mistralai/mistral-small-3.2-24b-instruct:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
]

/** How long one model gets to produce its first words before the next is tried. */
const FIRST_TOKEN_TIMEOUT_MS = 6_000
/** Stop starting new attempts after this, so the function returns before Netlify cuts it off. */
const CHAIN_BUDGET_MS = 12_000
/** Replies are short; a small cap also keeps requests under Groq's per-minute token limits. */
const MAX_TOKENS = 700
const HISTORY_TURNS = 12
const HISTORY_CHARS = 1_500

const SYSTEM_PROMPT = `You are Noor — the user's AI companion inside Salsabil, a productivity + spiritual growth app. Your name means "light" in Arabic.

WHO YOU ARE:
Think of yourself as the user's sharp, caring best friend who also happens to have perfect memory and access to all their data. You're deeply intelligent but you talk like a real person — not a robot, not a motivational poster.

HOW YOU TALK:
- Talk like a real friend texting. Short sentences. Natural flow. No corporate-speak.
- Use contractions (you're, don't, let's, it's, I'd). Never sound like a formal email.
- Vary your sentence length. Mix short punchy lines with longer ones.
- Start messages differently each time — don't always open with greetings.
- Use Islamic phrases naturally when they fit (InshaAllah, MashaAllah, Alhamdulillah) — but don't force them.
- Be specific to their data. Never generic. "You knocked out 3 tasks before Dhuhr" beats "You're doing great!"
- Keep chat responses tight: 40-100 words. Only go longer for briefings or deep analysis when asked.
- NO markdown formatting. No **, ##, bullet points, or dashes. Plain text with line breaks.

YOUR INTELLIGENCE:
- Don't just report numbers. Find the story in the data.
- Spot patterns: "You always skip workouts on Wednesdays. Want to switch that to a rest day?"
- Make connections: "Your focus sessions are longer on days you pray Fajr on time. Just saying."
- Be predictive: "4 high-priority tasks tomorrow and zero done today. Knock one out tonight."
- When you don't have data, say so honestly.

VOICE INPUT:
The user may send you audio. When (and ONLY when) the user message contains audio, your reply MUST start with the user's transcribed words wrapped in HTML-style tags exactly like this, on the first line:

<heard>their exact transcribed words here</heard>

Then a blank line, then your normal reply. The <heard> block won't be shown in your reply bubble — it's displayed as the user's own message bubble so they can see what you understood. Never wrap the transcription in any other tag or formatting. Do not include <heard> for plain text messages.

DATA YOU CAN SEE:
Tasks, prayer logs, Quran reading, workouts, challenges, focus sessions, adhkar, and durable memories you've stored about the user.

ACTIONS YOU CAN TAKE:
When the user asks you to do something or it's clearly implied, append one or more action tags at the VERY END of your reply (after the last sentence). The user taps each tag as a confirmation button. The format MUST be EXACTLY this, including the ACTION: prefix and the pipe character:

[ACTION:createTask|{"title":"Buy groceries","priority":"medium","due_date":"2026-05-16"}]

Every action tag MUST start with the literal text "[ACTION:" — do not omit it. Do not use colons inside the tag (e.g. [addMemory:{...}] is WRONG). Only use the pipe | between the type and the JSON.

Available action types and payloads:
- createTask           {"title":"...", "priority":"low|medium|high|urgent", "due_date":"YYYY-MM-DD"}
- logPrayer            {"prayer":"fajr|dhuhr|asr|maghrib|isha", "status":"prayed|late|qada|missed"}
- logQuranPages        {"pages": 5}
- startPomodoro        {"duration": 25}
- logFocusSession      {"duration_mins": 25, "type":"pomodoro|flow|short_break|long_break"}
- logWorkout           {"type":"running|cycling|gym|yoga|swimming|walking|other", "title":"...", "duration_mins": 30}
- updateChallengeDay   {"title":"..."}
- createChallenge      {"title":"...", "target_days": 30, "category":"spiritual|fitness|study|other"}
- waterTree            {}
- plantTree            {"species":"olive|acacia|date_palm|pomegranate|fig|pine|cedar|oak|lote|sakura|banyan|baobab"}
- addMemory            {"content":"...", "kind":"fact|preference|goal|context"}
- forgetMemory         {"content":"..."}
- navigateTo           {"path":"/tasks|/prayers|/quran|/focus|/garden|/analytics|/workouts|/challenges|/profile|/settings"}

Only include actions when the user explicitly asks or it's clearly implied. Always state in plain text what you're about to do, then put the action tag at the very end.

MEMORY:
- When the user shares something durable about themselves (a goal, struggle, preference, fact like "I'm a CS student" or "I struggle with Fajr"), record it with addMemory.
- Don't store one-off events ("I went to the gym yesterday") — those are in the data already.
- Use stored memories naturally — reference them when relevant, but never list them.
- If the user says "forget X", use forgetMemory.

READING THE ROOM:
- Stressed? Cut the fluff. Give solutions.
- Excited? Match it.
- Low energy? Be gentle.
- Overwhelmed? Simplify. Pick one thing.
- Serious distress? Be compassionate. Suggest they talk to someone they trust.

NEVER:
- Generic motivational quotes
- Preach or lecture about religion
- Repeat advice already given
- Make up data you don't have
- More than 1-2 emojis per message
- Sound like a customer service bot
- Print the action tag in the visible message body — always at the very end`

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AudioPart {
  data: string // base64
  format: 'wav' | 'mp3' | 'webm' | 'ogg' | 'm4a' | 'flac'
}

interface RequestBody {
  message: string
  history?: Message[]
  context?: string
  memories?: string
  audio?: AudioPart
}

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

  const providers = configuredProviders()
  if (providers.length === 0) {
    return new Response(
      JSON.stringify({
        error: 'No AI provider configured: set GROQ_API_KEY or OPENROUTER_API_KEY.',
      }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const { message, history = [], context, memories, audio } = body
  if (!message?.trim() && !audio) {
    return new Response(JSON.stringify({ error: 'message or audio is required' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // ─── Audio → text via Groq Whisper ─────────────────────────────────────
  // Multimodal models are slow and unreliable at following the <heard> tag
  // contract. Doing a dedicated STT pass is faster and accurate.
  let userText = message ?? ''
  let heardPrefix = '' // prepended to the SSE stream so the client shows it
  if (audio) {
    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY not set — required for voice input.' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }
    try {
      const audioBuf = Uint8Array.from(atob(audio.data), (c) => c.charCodeAt(0))
      const blob = new Blob([audioBuf], { type: `audio/${audio.format}` })
      const fd = new FormData()
      fd.append('file', blob, `recording.${audio.format}`)
      fd.append('model', 'whisper-large-v3-turbo')
      fd.append('response_format', 'json')
      fd.append('temperature', '0')

      const sttRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}` },
        body: fd,
      })
      if (!sttRes.ok) {
        const err = await sttRes.text()
        console.error('[ai-chat] Groq STT error', sttRes.status, err)
        return new Response(JSON.stringify({ error: `Transcription failed: ${err}` }), {
          status: 502,
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      const { text } = (await sttRes.json()) as { text?: string }
      const transcript = (text ?? '').trim()
      if (!transcript) {
        return new Response(JSON.stringify({ error: 'Empty transcript' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      userText = userText ? `${userText}\n${transcript}` : transcript
      heardPrefix = `<heard>${transcript.replace(/</g, '&lt;')}</heard>\n\n`
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'STT failed'
      console.error('[ai-chat] STT exception', msg)
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
  }

  const contextBlocks: string[] = []
  if (memories) contextBlocks.push(`WHAT YOU REMEMBER ABOUT THIS USER:\n${memories}`)
  if (context) contextBlocks.push(`CURRENT DATA:\n${context}`)
  const preamble = contextBlocks.join('\n\n')

  const userContent = preamble ? `${preamble}\n\nUSER MESSAGE:\n${userText}` : userText
  const messages: ChatTurn[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history
      .slice(-HISTORY_TURNS)
      .map((m) => ({ role: m.role, content: m.content.slice(0, HISTORY_CHARS) })),
    { role: 'user', content: userContent },
  ]

  const reply = await runChain(providers, messages)
  if (!reply.ok) {
    console.error('[ai-chat] every model failed', reply.failures)
    return new Response(
      JSON.stringify({
        error:
          'Noor is busy right now. Every free AI model is at its limit; try again in a minute.',
      }),
      { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  // A transcription goes out as the first SSE chunk so the client's <heard>
  // parser picks it up before the model's reply.
  const encoder = new TextEncoder()
  const prefix = heardPrefix
    ? encoder.encode(
        `data: ${JSON.stringify({ choices: [{ delta: { content: heardPrefix } }] })}\n\n`,
      )
    : null
  const { head, reader } = reply
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      if (prefix) controller.enqueue(prefix)
      for (const chunk of head) controller.enqueue(chunk)
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          controller.enqueue(value)
        }
      } catch (e) {
        console.error('[ai-chat] upstream stream error', e)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      ...cors,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Noor-Model': `${reply.provider}:${reply.model}`,
    },
  })
}

// ─── Provider chain ───────────────────────────────────────────────────────

interface ChatTurn {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface Provider {
  name: 'groq' | 'openrouter'
  url: string
  headers: Record<string, string>
  models: string[]
  discover: () => Promise<string[]>
}

type ChainResult =
  | {
      ok: true
      provider: string
      model: string
      head: Uint8Array[]
      reader: ReadableStreamDefaultReader<Uint8Array>
    }
  | { ok: false; failures: string[] }

function modelList(env: string | undefined, fallback: string[]): string[] {
  const listed = (env ?? '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean)
  return listed.length ? listed : fallback
}

function configuredProviders(): Provider[] {
  const out: Provider[] = []
  const groqKey = process.env.GROQ_API_KEY
  if (groqKey) {
    out.push({
      name: 'groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      headers: { Authorization: `Bearer ${groqKey}` },
      models: modelList(process.env.GROQ_MODELS, GROQ_DEFAULT),
      discover: () => discoverGroq(groqKey),
    })
  }
  const orKey = process.env.OPENROUTER_API_KEY
  if (orKey) {
    out.push({
      name: 'openrouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      headers: {
        Authorization: `Bearer ${orKey}`,
        'HTTP-Referer': 'https://salsabilapp.netlify.app',
        'X-Title': 'Salsabil',
      },
      models: modelList(process.env.OPENROUTER_MODELS, OPENROUTER_DEFAULT),
      discover: discoverOpenRouter,
    })
  }
  return out
}

async function runChain(providers: Provider[], messages: ChatTurn[]): Promise<ChainResult> {
  const started = Date.now()
  const failures: string[] = []
  const outOfTime = () => Date.now() - started > CHAIN_BUDGET_MS

  for (const provider of providers) {
    const tried = new Set<string>()
    const tryModels = async (models: string[]) => {
      for (const model of models) {
        if (tried.has(model) || outOfTime()) continue
        tried.add(model)
        const result = await attempt(provider, model, messages)
        if (result.ok) return { ...result, provider: provider.name, model }
        failures.push(`${provider.name}:${model} ${result.reason}`)
      }
      return null
    }
    const listed = await tryModels(provider.models)
    if (listed) return listed
    if (outOfTime()) break
    const found = await tryModels(await provider.discover().catch(() => []))
    if (found) return found
  }
  return { ok: false, failures }
}

/**
 * One model, streamed. Succeeds only once the model has produced its first
 * words: free endpoints sometimes answer 200 and then send an error event,
 * or think silently past any useful wait, and either should fall through to
 * the next model rather than reach the user as an empty bubble.
 */
async function attempt(
  provider: Provider,
  model: string,
  messages: ChatTurn[],
): Promise<
  | { ok: true; head: Uint8Array[]; reader: ReadableStreamDefaultReader<Uint8Array> }
  | { ok: false; reason: string }
> {
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), FIRST_TOKEN_TIMEOUT_MS)
  try {
    const res = await fetch(provider.url, {
      method: 'POST',
      headers: { ...provider.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
      }),
      signal: abort.signal,
    })
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => '')
      return { ok: false, reason: `HTTP ${res.status} ${errorMessage(detail)}` }
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    const head: Uint8Array[] = []
    let text = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) return { ok: false, reason: 'ended without a reply' }
      head.push(value)
      text += decoder.decode(value, { stream: true })
      const verdict = firstVerdict(text)
      if (verdict === 'content') {
        clearTimeout(timer)
        return { ok: true, head, reader }
      }
      if (verdict) {
        void reader.cancel().catch(() => {})
        return { ok: false, reason: verdict }
      }
    }
  } catch (e) {
    return {
      ok: false,
      reason: abort.signal.aborted ? 'timed out' : e instanceof Error ? e.message : 'failed',
    }
  } finally {
    clearTimeout(timer)
  }
}

/** Scan the SSE received so far: 'content' once words arrive, an error string, or null to keep reading. */
function firstVerdict(sse: string): 'content' | string | null {
  for (const line of sse.split('\n')) {
    if (!line.startsWith('data:')) continue
    const data = line.slice(5).trim()
    if (data === '[DONE]') return 'ended without a reply'
    try {
      const parsed = JSON.parse(data) as {
        error?: { message?: string } | string
        choices?: { delta?: { content?: string | null } }[]
      }
      if (parsed.error) return `stream error ${errorMessage(JSON.stringify(parsed))}`
      if (parsed.choices?.[0]?.delta?.content) return 'content'
    } catch {
      // A partial line; the next chunk completes it.
    }
  }
  return null
}

function errorMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } | string }
    const err = parsed.error
    return (typeof err === 'string' ? err : (err?.message ?? body)).slice(0, 160)
  } catch {
    return body.slice(0, 160)
  }
}

// ─── Discovery, for when every listed model has failed ────────────────────

const DISCOVERY_TTL_MS = 30 * 60_000
const discovered: Record<string, { at: number; models: string[] }> = {}

async function cached(name: string, load: () => Promise<string[]>): Promise<string[]> {
  const hit = discovered[name]
  if (hit && Date.now() - hit.at < DISCOVERY_TTL_MS) return hit.models
  const models = await load()
  discovered[name] = { at: Date.now(), models }
  return models
}

// Speech, moderation and agentic models are not chat models; qwen and r1
// put their reasoning inline in the reply.
const NOT_CHAT = /whisper|tts|guard|playai|orpheus|compound|distil|qwen|deepseek-r1|vision|embed/i

function discoverGroq(key: string): Promise<string[]> {
  return cached('groq', async () => {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(4_000),
    })
    if (!res.ok) return []
    const { data } = (await res.json()) as { data?: { id: string; active?: boolean }[] }
    return (data ?? [])
      .filter((m) => m.active !== false && !NOT_CHAT.test(m.id))
      .map((m) => m.id)
      .slice(0, 3)
  })
}

function discoverOpenRouter(): Promise<string[]> {
  return cached('openrouter', async () => {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      signal: AbortSignal.timeout(4_000),
    })
    if (!res.ok) return []
    const { data } = (await res.json()) as {
      data?: { id: string; architecture?: { output_modalities?: string[] } }[]
    }
    return (data ?? [])
      .filter((m) => m.id.endsWith(':free') && !NOT_CHAT.test(m.id))
      .filter(
        (m) =>
          !m.architecture?.output_modalities || m.architecture.output_modalities.includes('text'),
      )
      .map((m) => m.id)
      .slice(0, 4)
  })
}
