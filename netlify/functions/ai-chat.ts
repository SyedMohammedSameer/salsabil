const MODEL = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'

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

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not set' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
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

  const contextBlocks: string[] = []
  if (memories) contextBlocks.push(`WHAT YOU REMEMBER ABOUT THIS USER:\n${memories}`)
  if (context) contextBlocks.push(`CURRENT DATA:\n${context}`)
  const preamble = contextBlocks.join('\n\n')

  // Build user message — multimodal if audio is present
  let userMessage: { role: string; content: string | unknown[] }
  if (audio) {
    const parts: unknown[] = []
    if (preamble || message) {
      const textBlock = [preamble, message ? `USER MESSAGE:\n${message}` : '']
        .filter(Boolean)
        .join('\n\n')
      parts.push({ type: 'text', text: textBlock })
    }
    parts.push({
      type: 'input_audio',
      input_audio: { data: audio.data, format: audio.format },
    })
    userMessage = { role: 'user', content: parts }
  } else {
    const text = preamble ? `${preamble}\n\nUSER MESSAGE:\n${message}` : message
    userMessage = { role: 'user', content: text }
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
    userMessage,
  ]

  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://salsabil.app',
      'X-Title': 'Salsabil',
    },
    body: JSON.stringify({ model: MODEL, messages, stream: true, max_tokens: 1500 }),
  })

  if (!upstream.ok) {
    const err = await upstream.text()
    console.error('[ai-chat] OpenRouter HTTP error', upstream.status, err)
    return new Response(JSON.stringify({ error: `OpenRouter ${upstream.status}: ${err}` }), {
      status: upstream.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      ...cors,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
