// Noor's actions on the phone.
//
// The ai-chat function streams plain text; the model asks the app to do
// something by ending its reply with tags like
//
//   [ACTION:createTask|{"title":"Call mum","due_date":"2026-09-23"}]
//
// The server's own prompt lists the actions the web app understands. The
// phone understands more, so it sends its own list with every message (see
// ACTION_MANIFEST) and runs the tags automatically when the reply arrives,
// except the destructive ones, which wait for a tap.

export type NoorActionName =
  | 'createTask'
  | 'completeTask'
  | 'reopenTask'
  | 'updateTask'
  | 'deleteTask'
  | 'logPrayer'
  | 'logQuranPages'
  | 'logAdhkar'
  | 'startTimer'
  | 'startPomodoro'
  | 'pauseTimer'
  | 'resumeTimer'
  | 'stopTimer'
  | 'cancelTimer'
  | 'setFocusTree'
  | 'logFocusSession'
  | 'logWorkout'
  | 'createChallenge'
  | 'updateChallengeDay'
  | 'plantTree'
  | 'waterTree'
  | 'addMemory'
  | 'forgetMemory'
  | 'setReminders'
  | 'navigateTo'

export interface NoorAction {
  name: NoorActionName
  args: Record<string, unknown>
  /** The raw tag, for keying results. */
  raw: string
}

const KNOWN = new Set<NoorActionName>([
  'createTask',
  'completeTask',
  'reopenTask',
  'updateTask',
  'deleteTask',
  'logPrayer',
  'logQuranPages',
  'logAdhkar',
  'startTimer',
  'startPomodoro',
  'pauseTimer',
  'resumeTimer',
  'stopTimer',
  'cancelTimer',
  'setFocusTree',
  'logFocusSession',
  'logWorkout',
  'createChallenge',
  'updateChallengeDay',
  'plantTree',
  'waterTree',
  'addMemory',
  'forgetMemory',
  'setReminders',
  'navigateTo',
])

/** Actions that remove something; these wait for the user to confirm. */
export const NEEDS_CONFIRMATION = new Set<NoorActionName>(['deleteTask', 'forgetMemory', 'cancelTimer'])

/**
 * Pull every action tag out of a reply.
 *
 * A small scanner rather than a regex, so JSON with nested braces or a "]"
 * inside a string survives. It accepts the variants models actually produce:
 * `[ACTION:name|{...}]`, `[ACTION|name|{...}]`, `[name:{...}]`, and a tag with
 * no arguments. Every tag is removed from the visible text, including ones
 * the app does not know, so raw tags never show up in a bubble.
 */
export function parseActions(text: string): { clean: string; actions: NoorAction[] } {
  const actions: NoorAction[] = []
  let clean = ''
  let i = 0
  while (i < text.length) {
    const open = text.indexOf('[', i)
    if (open === -1) {
      clean += text.slice(i)
      break
    }
    const m = /^\[(?:ACTION\s*[:|]\s*)?([A-Za-z]+)\s*(?:[:|]\s*)?/.exec(text.slice(open, open + 60))
    const isTag = m && (text.slice(open, open + 8).toUpperCase().startsWith('[ACTION') || KNOWN.has(m[1] as NoorActionName))
    if (!m || !isTag) {
      clean += text.slice(i, open + 1)
      i = open + 1
      continue
    }
    const name = m[1]
    let j = open + m[0].length
    let args: Record<string, unknown> = {}
    if (text[j] === '{') {
      // Balanced-brace scan that respects strings.
      let depth = 0
      let inStr = false
      let k = j
      for (; k < text.length; k++) {
        const ch = text[k]
        if (inStr) {
          if (ch === '\\') k++
          else if (ch === '"') inStr = false
          continue
        }
        if (ch === '"') inStr = true
        else if (ch === '{') depth++
        else if (ch === '}') {
          depth--
          if (depth === 0) break
        }
      }
      try {
        args = JSON.parse(text.slice(j, k + 1)) as Record<string, unknown>
      } catch {
        args = {}
      }
      j = k + 1
    }
    const close = text.indexOf(']', j)
    const end = close === -1 ? text.length : close + 1
    const raw = text.slice(open, end)
    if (KNOWN.has(name as NoorActionName)) actions.push({ name: name as NoorActionName, args, raw })
    clean += text.slice(i, open)
    i = end
  }
  return { clean: clean.replace(/ {2,}/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim(), actions }
}

/**
 * The instructions the phone sends with every message. The server prepends
 * them to the user's message as data, which is how the phone can offer more
 * than the server's prompt lists without a server change.
 */
export const ACTION_MANIFEST = `PHONE APP ACTIONS (these replace the ACTIONS list in your instructions; use exactly these names):
You are running inside the Salsabil phone app. It runs your action tags automatically as soon as your reply arrives, so you really can do things: add and edit tasks, log worship, run the focus timer, grow the garden. Use a tag whenever the user asks you to do something, or clearly implies it ("I just prayed Asr" means log it). Never claim you did something without its tag. You may use several tags in one reply. Put them at the very end, one per line, and say in plain words what you are doing. Dates are YYYY-MM-DD and times are 24-hour HH:MM, resolved from TODAY below.

Format: [ACTION:name|{json}]

Tasks
[ACTION:createTask|{"title":"...","priority":"low|medium|high|urgent","due_date":"YYYY-MM-DD","due_time":"HH:MM"}]  (due_date and due_time optional; a time sets a reminder)
[ACTION:completeTask|{"title":"words from the task title"}]
[ACTION:reopenTask|{"title":"..."}]
[ACTION:updateTask|{"title":"current title","new_title":"...","due_date":"YYYY-MM-DD","due_time":"HH:MM","priority":"..."}]  (only the fields that change)
[ACTION:deleteTask|{"title":"..."}]  (the user confirms with a tap)

Worship
[ACTION:logPrayer|{"prayer":"fajr|dhuhr|asr|maghrib|isha|tahajjud","status":"prayed|late|qada|missed","date":"YYYY-MM-DD"}]  (date optional, default today)
[ACTION:logQuranPages|{"pages":2,"surah_from":2,"ayah_from":1,"surah_to":2,"ayah_to":20}]  (surah and ayah optional)
[ACTION:logAdhkar|{"time":"morning|evening|after_prayer"}]

Focus timer
[ACTION:startTimer|{"minutes":25,"tree":"tree name"}]  (any length 1 to 180; tree optional, chooses which tree the session grows)
[ACTION:pauseTimer|{}]   [ACTION:resumeTimer|{}]
[ACTION:stopTimer|{}]  (ends now and keeps the minutes done)
[ACTION:cancelTimer|{}]  (throws the session away; the user confirms)
[ACTION:setFocusTree|{"tree":"tree name"}]

Health and habits
[ACTION:logWorkout|{"type":"strength|cardio|flexibility|sports|walk|other","title":"...","duration_mins":30}]
[ACTION:createChallenge|{"title":"...","target_days":30,"category":"spiritual|fitness|study|other"}]
[ACTION:updateChallengeDay|{"title":"words from the challenge title"}]  (marks today done)

Garden
[ACTION:plantTree|{"species":"olive|acacia|date_palm|pomegranate|fig|pine|cedar|oak|lote|sakura|banyan|baobab"}]  (costs coins)
[ACTION:waterTree|{"tree":"tree name"}]  (costs coins; tree optional)

Memory
[ACTION:addMemory|{"content":"...","kind":"fact|preference|goal|context"}]
[ACTION:forgetMemory|{"content":"..."}]

App
[ACTION:setReminders|{"prayers":true,"adhkar":false,"tasks":true,"focus":true}]  (only the ones that change)
[ACTION:navigateTo|{"screen":"home|prayers|quran|adhkar|timer|tasks|rooms|garden|challenges|workouts|analytics|profile|settings|notifications|reminders"}]

Answer questions about the user's day, stats, streaks, tasks and garden from the DATA below; it is live. If something is not in it, say so rather than guessing.`

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)
const q = (v: unknown) => (typeof v === 'string' && v.trim() ? `"${v.trim()}"` : '')

/** A plain description of an action, for chips before or without a result. */
export function actionSummary(a: NoorAction): string {
  const g = a.args
  switch (a.name) {
    case 'createTask':
      return `Add task ${q(g.title)}`
    case 'completeTask':
      return `Complete ${q(g.title)}`
    case 'reopenTask':
      return `Reopen ${q(g.title)}`
    case 'updateTask':
      return `Update ${q(g.title)}`
    case 'deleteTask':
      return `Delete task ${q(g.title)}`
    case 'logPrayer':
      return `Log ${cap(String(g.prayer ?? 'prayer'))} as ${String(g.status ?? 'prayed')}`
    case 'logQuranPages':
      return `Log ${String(g.pages ?? '')} Quran pages`
    case 'logAdhkar':
      return `Log ${String(g.time ?? 'morning').replace('_', ' ')} adhkar`
    case 'startTimer':
    case 'startPomodoro':
      return `Start a ${String(g.minutes ?? g.duration ?? 25)} min focus session`
    case 'pauseTimer':
      return 'Pause the session'
    case 'resumeTimer':
      return 'Resume the session'
    case 'stopTimer':
      return 'End the session now'
    case 'cancelTimer':
      return 'Discard the session'
    case 'setFocusTree':
      return `Grow ${q(g.tree)} with focus`
    case 'logFocusSession':
      return 'Log a past focus session'
    case 'logWorkout':
      return `Log workout ${q(g.title)}`
    case 'createChallenge':
      return `Start challenge ${q(g.title)}`
    case 'updateChallengeDay':
      return `Mark ${q(g.title)} done today`
    case 'plantTree':
      return `Plant a ${String(g.species ?? 'tree').replace('_', ' ')}`
    case 'waterTree':
      return `Water ${q(g.tree) || 'a tree'}`
    case 'addMemory':
      return 'Remember this'
    case 'forgetMemory':
      return `Forget ${q(g.content)}`
    case 'setReminders':
      return 'Change reminders'
    case 'navigateTo':
      return `Open ${String(g.screen ?? g.path ?? '')}`
  }
}
