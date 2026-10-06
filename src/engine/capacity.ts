// Load control. Pure functions, no React imports.
// Routing and the output checks are stateless and cheap, so they scale by running more copies.
// What does not scale is anything with a per-call cost (a future LLM) and the humans. So under load:
//  - the priority lane (critical results, emergency wording) is never shed or delayed,
//  - standard explanations degrade first to scripted-only, then to "we will message you later",
//  - a patient cannot flood the system, and the same upload twice never opens two cases.
import type { Route } from './classify'

export type LoadLevel = 'normal' | 'busy' | 'overloaded'
export type Lane = 'priority' | 'standard'

export const LOAD_LABEL: Record<LoadLevel, string> = {
  normal: 'Normal',
  busy: 'Busy: scripted templates only, no model calls',
  overloaded: 'Overloaded: explanations deferred, critical unaffected',
}

export const laneFor = (route: Route): Lane => (route === 'CRITICAL' ? 'priority' : 'standard')

export interface Admission {
  admit: boolean
  lane: Lane
  modelAllowed: boolean
  reason: string
}

export function admit(load: LoadLevel, route: Route): Admission {
  const lane = laneFor(route)
  if (lane === 'priority') return { admit: true, lane, modelAllowed: false, reason: 'Priority lane: never shed' }
  // Only the two explanation routes can be deferred. HUMAN routes already wait for a person.
  const explains = route === 'NORMAL' || route === 'ABNORMAL'
  if (load === 'overloaded' && explains) return { admit: false, lane, modelAllowed: false, reason: 'Standard lane deferred under load' }
  return { admit: true, lane, modelAllowed: load === 'normal', reason: load === 'normal' ? 'Standard lane' : 'Standard lane, model calls off' }
}

// Sliding-window limiter: at most `max` messages from one patient in `windowMs`.
export const RATE_MAX = 6
export const RATE_WINDOW_MS = 10_000

export function rateCheck(stamps: number[], now: number, max = RATE_MAX, windowMs = RATE_WINDOW_MS) {
  const recent = stamps.filter((s) => now - s < windowMs)
  if (recent.length >= max) return { allowed: false, stamps: recent }
  return { allowed: true, stamps: [...recent, now] }
}
