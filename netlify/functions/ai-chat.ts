const MODEL = 'liquid/lfm-2.5-1.2b-instruct:free'

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

DATA YOU CAN SEE:
Tasks, prayer logs, Quran reading, workouts, challenges, focus sessions, adhkar, and memories from past conversations.

ACTIONS YOU CAN TAKE:
When the user asks you to do something or it's clearly implied, include an action tag at the END of your response (after your message). Format exactly:
[ACTION:createTask|{"title":"Task name","priority":"medium","due_date":"YYYY-MM-DD"}]
[ACTION:logPrayer|{"prayer":"dhuhr","status":"prayed"}]
[ACTION:logQuranPages|{"pages":5}]
[ACTION:startPomodoro|{"duration":25}]

Only include an action when the user explicitly requests it or it's clearly implied. Do not include actions in general conversation. Always confirm what you're doing before the action tag.

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
- Sound like a customer service bot`

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface RequestBody {
  message: string
  history?: Message[]
  context?: string
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

  const { message, history = [], context } = body
  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: 'message is required' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
    {
      role: 'user',
      content: context ? `USER CONTEXT:\n${context}\n\nUSER MESSAGE:\n${message}` : message,
    },
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

  // Pipe OpenRouter's SSE stream straight to the client — no re-wrapping needed
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

export const config = { path: '/.netlify/functions/ai-chat' }
