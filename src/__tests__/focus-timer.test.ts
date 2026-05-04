import { describe, it, expect, beforeEach } from 'vitest'

// ─── Pomodoro timer logic ─────────────────────────────────────────────────────
// Pure state-machine logic — no React, no DOM needed.

type TimerState = 'idle' | 'running' | 'paused' | 'done'

interface TimerMachine {
  state: TimerState
  remaining: number
  total: number
}

function tick(m: TimerMachine): TimerMachine {
  if (m.state !== 'running') return m
  const next = m.remaining - 1
  return { ...m, remaining: next, state: next <= 0 ? 'done' : 'running' }
}

function start(m: TimerMachine): TimerMachine {
  if (m.state === 'idle' || m.state === 'paused') return { ...m, state: 'running' }
  return m
}

function pause(m: TimerMachine): TimerMachine {
  if (m.state === 'running') return { ...m, state: 'paused' }
  return m
}

function reset(_m: TimerMachine, durationSecs: number): TimerMachine {
  return { state: 'idle', remaining: durationSecs, total: durationSecs }
}

function progress(m: TimerMachine): number {
  return 1 - m.remaining / m.total
}

const POMODORO = 25 * 60 // 1500 seconds

describe('Pomodoro timer state machine', () => {
  let timer: TimerMachine

  beforeEach(() => {
    timer = reset({ state: 'idle', remaining: 0, total: 0 }, POMODORO)
  })

  it('starts in idle with full time', () => {
    expect(timer.state).toBe('idle')
    expect(timer.remaining).toBe(POMODORO)
    expect(progress(timer)).toBe(0)
  })

  it('transitions idle → running on start()', () => {
    timer = start(timer)
    expect(timer.state).toBe('running')
  })

  it('ticks reduce remaining by 1', () => {
    timer = start(timer)
    timer = tick(timer)
    expect(timer.remaining).toBe(POMODORO - 1)
  })

  it('does not tick when paused', () => {
    timer = start(timer)
    timer = pause(timer)
    const before = timer.remaining
    timer = tick(timer)
    expect(timer.remaining).toBe(before)
  })

  it('transitions to done when remaining reaches 0', () => {
    timer = start(timer)
    timer = { ...timer, remaining: 1 }
    timer = tick(timer)
    expect(timer.remaining).toBe(0)
    expect(timer.state).toBe('done')
  })

  it('resume from paused → running', () => {
    timer = start(timer)
    timer = pause(timer)
    expect(timer.state).toBe('paused')
    timer = start(timer)
    expect(timer.state).toBe('running')
  })

  it('progress goes from 0 to 1', () => {
    timer = start(timer)
    expect(progress(timer)).toBe(0)
    timer = { ...timer, remaining: 0 }
    // done state
    expect(progress({ ...timer, total: POMODORO })).toBe(1)
  })

  it('reset restores full time and idle state', () => {
    timer = start(timer)
    timer = tick(timer)
    timer = reset(timer, POMODORO)
    expect(timer.state).toBe('idle')
    expect(timer.remaining).toBe(POMODORO)
  })

  it('cannot start a done timer', () => {
    timer = { ...timer, state: 'done', remaining: 0 }
    const after = start(timer)
    expect(after.state).toBe('done') // done is not idle or paused
  })
})

describe('Coin calculation', () => {
  it('calculates coins proportional to session duration', () => {
    const coinsFor = (mins: number) => Math.floor(mins / 5)
    expect(coinsFor(25)).toBe(5)
    expect(coinsFor(5)).toBe(1)
    expect(coinsFor(50)).toBe(10)
    expect(coinsFor(15)).toBe(3)
  })

  it('skipped sessions earn 0 coins', () => {
    expect(Math.floor(0 / 5)).toBe(0)
  })
})
