// Who answers for what, and the audit export that proves it. No React imports.
import { RELEASE_MODE, TEMPLATES } from './templates'

export const ENGINE_VERSION = '0.2.0'

export const ACCOUNTABILITY = [
  { item: 'The results and ranges in the report', owner: 'Signing pathologist and the lab', note: 'The signed report is the record. The assistant never changes it.' },
  { item: 'Routing rules and critical limits', owner: 'Lab medical director', note: 'Fixed rules, versioned in code. A model never picks a route.' },
  { item: 'Wording of every template', owner: 'Template owner in the registry', note: 'No template is sent in production mode without medical-director approval.' },
  { item: 'Critical-value calls', owner: 'On-duty clinician', note: 'Human-owned. Each call attempt and outcome is in the audit log.' },
  { item: 'Running the assistant service', owner: 'The service provider, under the contract', note: 'Uptime, checks and the kill switch. Liability terms belong in the agreement, not in code.' },
] as const

export function buildAuditExport<T extends { ts: number }>(entries: T[], now = Date.now()) {
  return {
    meta: {
      exportedAt: new Date(now).toISOString(),
      engineVersion: ENGINE_VERSION,
      releaseMode: RELEASE_MODE,
      note: 'Fictional demo data. Names and phone numbers are never written to this log.',
    },
    accountability: ACCOUNTABILITY,
    templates: TEMPLATES.map(({ id, version, owner, signOff }) => ({ id, version, owner, signOff })),
    entries: entries.map((e) => ({ ...e, time: new Date(e.ts).toISOString() })),
  }
}
