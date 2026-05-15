// Browser-native voice helpers: SpeechRecognition + SpeechSynthesis.
// No dependencies, no API keys, no cost. Works in Chrome/Edge/Safari.

// ─── TypeScript shims for the Web Speech API (not in lib.dom yet) ────────────

interface SRAlternative {
  transcript: string
  confidence: number
}
interface SRResult {
  isFinal: boolean
  0: SRAlternative
  length: number
}
interface SREvent {
  results: { [k: number]: SRResult; length: number }
  resultIndex: number
}
interface SRErrorEvent {
  error: string
  message?: string
}
interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: SREvent) => void) | null
  onerror: ((e: SRErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

interface SRConstructor {
  new (): SpeechRecognitionInstance
}

function getSRClass(): SRConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SRConstructor
    webkitSpeechRecognition?: SRConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isSpeechRecognitionSupported(): boolean {
  return getSRClass() !== null
}

export interface VoiceListenerHandlers {
  onPartial?: (text: string) => void
  onFinal: (text: string) => void
  onError?: (err: string) => void
  onEnd?: () => void
  lang?: string
}

export interface VoiceListener {
  start: () => void
  stop: () => void
  abort: () => void
}

export function createVoiceListener(handlers: VoiceListenerHandlers): VoiceListener | null {
  const SR = getSRClass()
  if (!SR) return null
  const rec = new SR()
  rec.continuous = false
  rec.interimResults = true
  rec.lang = handlers.lang ?? 'en-US'

  let finalText = ''
  rec.onresult = (e) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      const t = r[0].transcript
      if (r.isFinal) finalText += t
      else interim += t
    }
    handlers.onPartial?.((finalText + interim).trim())
  }
  rec.onerror = (e) => {
    handlers.onError?.(e.error)
  }
  rec.onend = () => {
    const out = finalText.trim()
    if (out) handlers.onFinal(out)
    handlers.onEnd?.()
  }

  return {
    start: () => {
      finalText = ''
      try {
        rec.start()
      } catch {
        // Already started — ignore
      }
    },
    stop: () => rec.stop(),
    abort: () => rec.abort(),
  }
}

// ─── Text-to-speech ──────────────────────────────────────────────────────────

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// Best-effort: pick a natural-sounding English voice if available.
function pickVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | undefined {
  const voices = synth.getVoices()
  if (voices.length === 0) return undefined
  // Prefer Google/Apple natural voices, English, female-first
  const prefs = [
    /Samantha/i,
    /Google US English/i,
    /Google UK English Female/i,
    /Microsoft Aria/i,
    /Microsoft Jenny/i,
    /Karen/i,
    /Moira/i,
  ]
  for (const re of prefs) {
    const v = voices.find((vo) => re.test(vo.name))
    if (v) return v
  }
  return voices.find((v) => v.lang.startsWith('en')) ?? voices[0]
}

export function speak(text: string, opts?: { rate?: number; pitch?: number }): void {
  if (!isSpeechSynthesisSupported()) return
  const synth = window.speechSynthesis
  synth.cancel() // stop anything in progress
  const utter = new SpeechSynthesisUtterance(text)
  const v = pickVoice(synth)
  if (v) utter.voice = v
  utter.rate = opts?.rate ?? 1.05
  utter.pitch = opts?.pitch ?? 1.0
  synth.speak(utter)
}

export function stopSpeaking(): void {
  if (!isSpeechSynthesisSupported()) return
  window.speechSynthesis.cancel()
}

// Some browsers populate voices async. Call once on app boot to warm them up.
export function primeVoices(): void {
  if (!isSpeechSynthesisSupported()) return
  const synth = window.speechSynthesis
  synth.getVoices()
  // Some browsers fire `voiceschanged` after init
  synth.onvoiceschanged = () => {
    synth.getVoices()
  }
}
