import type { Handler, HandlerEvent } from '@netlify/functions'
import OpenAI from 'openai'

// Fast free model on OpenRouter (8B — ~3x faster than 70B, still great quality)
const MODEL = 'meta-llama/llama-3.1-8b-instruct:free'

const NOOR_SYSTEM_PROMPT = `You are Noor — the user's AI companion inside Salsabil, a productivity + spiritual growth app. Your name means "light" in Arabic.

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

ACTIONS YOU CAN TAKE (include in your response when implied):
[ACTION:createTask|{"title":"Task name","priority":"medium","date":"YYYY-MM-DD"}]
[ACTION:logPrayer|{"prayer":"dhuhr","status":"prayed"}]
[ACTION:logQuranPages|{"pages":5}]
[ACTION:startPomodoro|{"duration":25}]
Always confirm what you're doing when executing an action.

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

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Server misconfiguration' }) }
  }

  let body: RequestBody
  try {
    body = JSON.parse(event.body ?? '{}')
  } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { message, history = [], context } = body
  if (!message?.trim()) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'message is required' }) }
  }

  try {
    const client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://salsabil.app',
        'X-Title': 'Salsabil',
      },
    })

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: NOOR_SYSTEM_PROMPT },
    ]

    for (const msg of history.slice(-20)) {
      messages.push({ role: msg.role, content: msg.content })
    }

    const userContent = context
      ? `USER CONTEXT:\n${context}\n\nUSER MESSAGE:\n${message}`
      : message

    messages.push({ role: 'user', content: userContent })

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.75,
      max_tokens: 1500,
      top_p: 0.9,
    })

    const reply = completion.choices[0]?.message?.content ?? ''
    const usage = completion.usage

    return {
      statusCode: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reply,
        usage: {
          promptTokens: usage?.prompt_tokens,
          completionTokens: usage?.completion_tokens,
        },
      }),
    }
  } catch (err) {
    console.error('OpenRouter error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    const status = msg.includes('401') ? 401 : msg.includes('429') ? 429 : 500
    return {
      statusCode: status,
      headers: cors,
      body: JSON.stringify({ error: "Noor's unavailable right now. Try again in a moment." }),
    }
  }
}
