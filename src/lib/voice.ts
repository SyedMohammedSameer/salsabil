// Voice helpers.
//
// STT: browser records audio via MediaRecorder, the bytes go to our /ai-chat
// endpoint as base64 — the OpenRouter Nemotron Omni model both transcribes
// and responds. No separate Whisper step.
//
// TTS: the /tts Netlify function calls Hugging Face's MMS-TTS model and
// streams audio back, which we play via a single shared <audio> element.

export interface AudioCapture {
  data: string // base64 (no data: prefix)
  format: 'webm' | 'wav' | 'mp3' | 'ogg'
}

export function isAudioRecordingSupported(): boolean {
  if (typeof window === 'undefined') return false
  return !!(navigator.mediaDevices && typeof MediaRecorder !== 'undefined')
}

// Pick a MediaRecorder mime type the browser actually supports, preferring
// the formats the OpenRouter audio input field accepts.
function pickMimeType(): { mime: string; format: AudioCapture['format'] } {
  const candidates: Array<{ mime: string; format: AudioCapture['format'] }> = [
    { mime: 'audio/webm;codecs=opus', format: 'webm' },
    { mime: 'audio/webm', format: 'webm' },
    { mime: 'audio/ogg;codecs=opus', format: 'ogg' },
    { mime: 'audio/mp4', format: 'mp3' },
    { mime: 'audio/wav', format: 'wav' },
  ]
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mime)) return c
  }
  // Fallback — most browsers default to webm
  return { mime: '', format: 'webm' }
}

export interface RecordingHandle {
  stop: () => Promise<AudioCapture | null>
  cancel: () => void
}

export async function startRecording(): Promise<RecordingHandle> {
  if (!isAudioRecordingSupported()) {
    throw new Error('Audio recording not supported in this browser.')
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const { mime, format } = pickMimeType()
  const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
  const chunks: Blob[] = []
  let resolved = false

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }

  recorder.start()

  const finish = (): Promise<AudioCapture | null> =>
    new Promise((resolve, reject) => {
      recorder.onstop = async () => {
        if (resolved) return
        resolved = true
        stream.getTracks().forEach((t) => t.stop())
        if (chunks.length === 0) {
          resolve(null)
          return
        }
        try {
          const blob = new Blob(chunks, { type: mime || 'audio/webm' })
          const buf = await blob.arrayBuffer()
          const data = bufferToBase64(buf)
          resolve({ data, format })
        } catch (e) {
          reject(e)
        }
      }
    })

  return {
    stop: async () => {
      if (recorder.state === 'inactive') return null
      const promise = finish()
      recorder.stop()
      return promise
    },
    cancel: () => {
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop()
        } catch {
          // ignore
        }
      }
      stream.getTracks().forEach((t) => t.stop())
      resolved = true
    },
  }
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  // Chunk to avoid `apply` argument-count limits on large blobs
  const chunkSize = 0x8000
  const parts: string[] = []
  for (let i = 0; i < bytes.length; i += chunkSize) {
    parts.push(String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize))))
  }
  return btoa(parts.join(''))
}

// ─── TTS — fetch audio from /tts and play it ────────────────────────────────

let currentAudio: HTMLAudioElement | null = null
let currentObjectUrl: string | null = null

export async function speak(text: string, signal?: AbortSignal): Promise<void> {
  stopSpeaking()
  if (!text.trim()) return
  const res = await fetch('/.netlify/functions/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? 'TTS unavailable.')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  currentObjectUrl = url
  const audio = new Audio(url)
  currentAudio = audio
  audio.onended = () => {
    if (currentObjectUrl === url) {
      URL.revokeObjectURL(url)
      currentObjectUrl = null
    }
    if (currentAudio === audio) currentAudio = null
  }
  await audio.play().catch((e) => {
    // Autoplay can be blocked until user interaction; surface but don't crash
    console.warn('[voice] audio.play() rejected', e)
  })
}

export function stopSpeaking(): void {
  if (currentAudio) {
    try {
      currentAudio.pause()
    } catch {
      // ignore
    }
    currentAudio = null
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = null
  }
}
