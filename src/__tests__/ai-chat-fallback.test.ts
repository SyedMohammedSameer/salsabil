// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import handler from '../../netlify/functions/ai-chat'

// The ai-chat function walks a chain of free models. These tests stand in for
// Groq and OpenRouter with a fake fetch and check that each kind of failure
// moves on to the next model, and that the reply that does arrive streams
// through intact.

const enc = new TextEncoder()

function sse(...events: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      for (const e of events) c.enqueue(enc.encode(`data: ${e}\n\n`))
      c.close()
    },
  })
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

const word = (t: string) => JSON.stringify({ choices: [{ delta: { content: t } }] })

type Route = (model: string) => Response | Promise<Response>

function fakeFetch(routes: {
  groq?: Route
  openrouter?: Route
  groqModels?: string[]
  orModels?: string[]
}) {
  const calls: string[] = []
  const fn = vi.fn(async (url: string, init?: Parameters<typeof fetch>[1]) => {
    if (url.endsWith('/models')) {
      const ids = url.includes('groq') ? routes.groqModels : routes.orModels
      return new Response(JSON.stringify({ data: (ids ?? []).map((id) => ({ id })) }))
    }
    const { model } = JSON.parse(String(init?.body)) as { model: string }
    const name = url.includes('groq') ? 'groq' : 'openrouter'
    calls.push(`${name}:${model}`)
    const route = routes[name]
    if (!route) throw new Error(`unexpected ${name}`)
    return route(model)
  })
  return { fn, calls }
}

async function ask(): Promise<Response> {
  return handler(
    new Request('https://x/.netlify/functions/ai-chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'salaam' }),
    }),
  )
}

async function replyText(res: Response): Promise<string> {
  const raw = await res.text()
  return raw
    .split('\n')
    .filter((l) => l.startsWith('data: ') && l !== 'data: [DONE]')
    .map(
      (l) =>
        (JSON.parse(l.slice(6)) as { choices: { delta: { content?: string } }[] }).choices[0].delta
          .content ?? '',
    )
    .join('')
}

describe('ai-chat model chain', () => {
  beforeEach(() => {
    vi.stubEnv('GROQ_API_KEY', 'g')
    vi.stubEnv('OPENROUTER_API_KEY', 'o')
    vi.stubEnv('GROQ_MODELS', 'g1,g2')
    vi.stubEnv('OPENROUTER_MODELS', 'o1')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('answers from the first model when it works', async () => {
    const { fn, calls } = fakeFetch({ groq: () => sse(word('Wa '), word('alaykum'), '[DONE]') })
    vi.stubGlobal('fetch', fn)
    const res = await ask()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Noor-Model')).toBe('groq:g1')
    expect(await replyText(res)).toBe('Wa alaykum')
    expect(calls).toEqual(['groq:g1'])
  })

  it('moves past a rate limit, a 200 that turns into an error, and a silent model', async () => {
    const { fn, calls } = fakeFetch({
      groq: (m) =>
        m === 'g1'
          ? new Response(JSON.stringify({ error: { message: 'Rate limit reached' } }), {
              status: 429,
            })
          : sse(JSON.stringify({ error: { message: 'overloaded' } })),
      openrouter: () => sse(word('Hello'), '[DONE]'),
      groqModels: [],
      orModels: [],
    })
    vi.stubGlobal('fetch', fn)
    const res = await ask()
    expect(res.status).toBe(200)
    expect(await replyText(res)).toBe('Hello')
    expect(calls).toEqual(['groq:g1', 'groq:g2', 'openrouter:o1'])
  })

  it('falls back to discovered free models when every listed one is gone', async () => {
    const { fn, calls } = fakeFetch({
      groq: () => new Response('{"error":{"message":"model decommissioned"}}', { status: 400 }),
      openrouter: (m) => (m === 'fresh:free' ? sse(word('Found one'), '[DONE]') : sse('[DONE]')),
      groqModels: ['whisper-large-v3', 'g1'],
      orModels: ['paid/model', 'fresh:free'],
    })
    vi.stubGlobal('fetch', fn)
    const res = await ask()
    expect(await replyText(res)).toBe('Found one')
    // whisper is not a chat model, g1 was already tried, paid models are skipped.
    expect(calls).toEqual(['groq:g1', 'groq:g2', 'openrouter:o1', 'openrouter:fresh:free'])
  })

  it('gives a clear 503 when every model fails', async () => {
    const { fn } = fakeFetch({
      groq: () => new Response('{}', { status: 429 }),
      openrouter: () => new Response('{}', { status: 429 }),
    })
    vi.stubGlobal('fetch', fn)
    const res = await ask()
    expect(res.status).toBe(503)
    expect(((await res.json()) as { error: string }).error).toMatch(/busy/)
  })

  it('times out a model that never starts answering', async () => {
    vi.useFakeTimers()
    const { fn, calls } = fakeFetch({
      groq: (m) =>
        m === 'g1'
          ? new Promise<Response>(() => {}) // hangs until the abort below
          : sse(word('Quick'), '[DONE]'),
    })
    // The hanging request must reject when its signal aborts, as real fetch does.
    const wrapped = vi.fn((url: string, init?: Parameters<typeof fetch>[1]) => {
      const p = fn(url, init)
      return new Promise<Response>((resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
        p.then(resolve, reject)
      })
    })
    vi.stubGlobal('fetch', wrapped)
    const pending = ask()
    await vi.advanceTimersByTimeAsync(10_000)
    const res = await pending
    vi.useRealTimers()
    expect(await replyText(res)).toBe('Quick')
    expect(calls).toEqual(['groq:g1', 'groq:g2'])
  })

  it('needs at least one provider key', async () => {
    vi.stubEnv('GROQ_API_KEY', '')
    vi.stubEnv('OPENROUTER_API_KEY', '')
    const res = await ask()
    expect(res.status).toBe(500)
  })
})
