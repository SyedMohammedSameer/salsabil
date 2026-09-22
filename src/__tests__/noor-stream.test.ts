import { describe, it, expect, vi, afterEach } from 'vitest'
import { streamNoor } from '@/lib/api/chat'

// streamNoor has two paths: an incremental reader on web, and a whole-response
// fallback on native, where React Native's fetch exposes no readable body.
// Only the web path is exercised by using the app, and neither is caught by a
// successful bundle, so both are pinned here.

function sse(...payloads: string[]): string {
  return (
    payloads
      .map((content) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}`)
      .join('\n') + '\ndata: [DONE]\n'
  )
}

/** A fetch Response with no `body`, which is what React Native returns. */
function nativeResponse(text: string) {
  return { ok: true, body: undefined, text: async () => text } as unknown as Response
}

/** A fetch Response that streams, which is what browsers return. */
function streamingResponse(text: string, chunkSize = 7) {
  const bytes = new TextEncoder().encode(text)
  let offset = 0
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: async () => {
          if (offset >= bytes.length) return { done: true, value: undefined }
          const value = bytes.slice(offset, offset + chunkSize)
          offset += chunkSize
          return { done: false, value }
        },
      }),
    },
  } as unknown as Response
}

async function collect(response: Response): Promise<{ text: string; heard: string[] }> {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => response),
  )
  let text = ''
  const heard: string[] = []
  await streamNoor('hi', [], undefined, undefined, undefined, {
    onToken: (t) => {
      text += t
    },
    onHeard: (h) => heard.push(h),
  })
  return { text, heard }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('streamNoor — native fallback (no readable body)', () => {
  it('reads the whole response when streaming is unavailable', async () => {
    const { text } = await collect(nativeResponse(sse('Assalamu ', 'alaikum.')))
    expect(text).toBe('Assalamu alaikum.')
  })

  it('flushes the final line even without a trailing newline', async () => {
    const body = `data: ${JSON.stringify({ choices: [{ delta: { content: 'done' } }] })}`
    const { text } = await collect(nativeResponse(body))
    expect(text).toBe('done')
  })

  it('strips <think> reasoning from the reply', async () => {
    const { text } = await collect(
      nativeResponse(sse('<think>', 'planning my answer', '</think>', 'Here it is.')),
    )
    expect(text).toBe('Here it is.')
  })

  it('surfaces <heard> transcription separately from the bubble', async () => {
    const { text, heard } = await collect(
      nativeResponse(sse('<heard>', 'what is my streak', '</heard>', 'Seven days.')),
    )
    expect(text).toBe('Seven days.')
    expect(heard).toEqual(['what is my streak'])
  })

  it('throws the server error message rather than a generic failure', async () => {
    const body = `data: ${JSON.stringify({ error: { message: 'Rate limited' } })}\n`
    await expect(collect(nativeResponse(body))).rejects.toThrow('Rate limited')
  })

  it('stops at [DONE] and ignores anything after it', async () => {
    const body =
      `data: ${JSON.stringify({ choices: [{ delta: { content: 'kept' } }] })}\n` +
      'data: [DONE]\n' +
      `data: ${JSON.stringify({ choices: [{ delta: { content: 'dropped' } }] })}\n`
    const { text } = await collect(nativeResponse(body))
    expect(text).toBe('kept')
  })
})

describe('streamNoor — web streaming path', () => {
  it('produces the same text as the fallback for the same payload', async () => {
    const payload = sse('Assalamu ', 'alaikum.')
    const streamed = await collect(streamingResponse(payload))
    vi.unstubAllGlobals()
    const whole = await collect(nativeResponse(payload))
    expect(streamed.text).toBe(whole.text)
  })

  it('does not leak partial tags when a chunk splits one', async () => {
    // Tiny chunks guarantee "<thi" / "nk>" land in separate reads.
    const payload = sse('<think>', 'hidden', '</think>', 'Visible.')
    const { text } = await collect(streamingResponse(payload, 3))
    expect(text).toBe('Visible.')
    expect(text).not.toContain('<')
  })

  it('reassembles content split across chunk boundaries', async () => {
    const { text } = await collect(streamingResponse(sse('Alhamdu', 'lillah'), 5))
    expect(text).toBe('Alhamdulillah')
  })
})

describe('streamNoor — failures', () => {
  it('raises the endpoint error when the request itself fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: 'Noor is offline' }),
      })) as unknown as typeof fetch,
    )
    await expect(
      streamNoor('hi', [], undefined, undefined, undefined, { onToken: () => {} }),
    ).rejects.toThrow('Noor is offline')
  })
})
