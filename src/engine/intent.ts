// Free-text intent. Deliberately small and rule-based: it only decides which scripted reply applies.
// Anything it cannot place is 'unknown', and the caller counts repeated misses and hands over to a person.
export type Intent = 'emergency' | 'stop' | 'advisor' | 'medical' | 'unknown'

export interface IntentResult {
  intent: Intent
  reason: string
}

// Hindi emergency phrases (chest pain, breathing trouble, fainted) NEED NATIVE-SPEAKER REVIEW.
const EMERGENCY = /(chest\s+pain|can'?t\s+breathe|cannot\s+breathe|can not breathe|short(ness)? of breath|difficulty breathing|faint(ing|ed)?|severe bleeding|bleeding (a lot|heavily)|unconscious|seizure|heart attack|stroke|in distress|emergency|सीने में दर्द|सांस नहीं|साँस नहीं|बेहोश)/i

// Diagnosis, medicine and general-health questions. The assistant answers from the signed report only.
const MEDICAL = /(do i have|diabet|cancer|disease|diagnos|tablet|pill|medicine|medication|\bdose\b|\bdrug|prescri|treat|cure|insulin|what should i take|which .*(take|use)|\bdiet\b|home remed|side effect|symptom|dangerous|serious|life expectancy|how long (will|do) i)/i

export const MAX_TEXT_LENGTH = 300

export function classifyIntent(text: string): IntentResult {
  const t = text.trim()
  if (EMERGENCY.test(t)) return { intent: 'emergency', reason: 'Emergency wording matched' }
  if (/^\s*stop\s*[.!]?\s*$/i.test(t)) return { intent: 'stop', reason: 'Opt-out keyword' }
  if (/\badvisor\b/i.test(t)) return { intent: 'advisor', reason: 'Advisor keyword' }
  if (MEDICAL.test(t)) return { intent: 'medical', reason: 'Diagnosis / medicine / general-health pattern matched' }
  if (t.length > MAX_TEXT_LENGTH) return { intent: 'unknown', reason: 'Message too long to place' }
  if (!/[A-Za-z]{2}/.test(t)) return { intent: 'unknown', reason: 'No readable English words' }
  return { intent: 'unknown', reason: 'No pattern matched' }
}

// After this many unplaced messages in a row the assistant stops guessing and hands over to a person.
export const MAX_MISSES = 2
