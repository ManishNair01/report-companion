// Registry of every outgoing assistant template. A message with no registered template cannot be sent.
export type SignOff = 'demo-pending' | 'approved'

// Who answers for the wording of a template. Used in the audit export and the release gate.
export type Owner = 'Lab medical director' | 'Clinical operations'

export interface Template {
  id: string
  version: string
  name: string
  signOff: SignOff
  owner: Owner
}

export const SIGNOFF_LABEL = 'Medical director sign-off: demo, pending'

// 'demo' lets demo-pending templates through. 'production' only sends templates the medical director has approved.
export type ReleaseMode = 'demo' | 'production'
export const RELEASE_MODE: ReleaseMode = 'demo'

const t = (id: string, name: string, owner: Owner = 'Lab medical director'): Template => ({
  id, version: '1.0', name, signOff: 'demo-pending', owner,
})

export const TEMPLATES: Template[] = [
  t('CONSENT-01', 'Consent line', 'Clinical operations'),
  t('VERIFY-01', 'Verification prompt', 'Clinical operations'),
  t('NORM-01', 'Normal report explanation'),
  t('OOR-01', 'Out-of-range summary'),
  t('OOR-02', 'Out-of-range details'),
  t('CRIT-01', 'Critical escalation'),
  t('CRIT-02', 'Critical status bubble'),
  t('CRIT-03', 'Critical closing message'),
  t('CRIT-04', 'Critical thread reply'),
  t('HUMAN-01', 'Unclear results handoff'),
  t('HANDOFF-01', 'Safe handoff (blocked or paused)', 'Clinical operations'),
  t('HANDOFF-02', 'Not understood twice, handoff', 'Clinical operations'),
  t('INTAKE-01', 'Photo or unsupported file handoff'),
  t('LOAD-01', 'High demand, explanation deferred', 'Clinical operations'),
  t('RATE-01', 'Too many messages, slow down', 'Clinical operations'),
  t('REFUSE-01', 'Diagnosis and medicine refusal'),
  t('URGENT-01', 'Emergency wording reply'),
  t('FALLBACK-01', 'Gentle fallback', 'Clinical operations'),
  t('ADV-01', 'Advisor callback confirmation', 'Clinical operations'),
  t('REM-01', 'Reminder: repeat test'),
  t('REM-02', 'Reminder: yearly check-up'),
  t('DOC-01', 'Signed report delivery', 'Clinical operations'),
  t('FB-01', 'Feedback thanks', 'Clinical operations'),
  t('FB-02', 'Not helpful, advisor will call', 'Clinical operations'),
  t('STOP-01', 'Opt-out confirmation', 'Clinical operations'),
  t('CORR-01', 'Report correction'),
]

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((x) => x.id === id)
}

// The dashboard switches act on these two. OOR-02 follows OOR-01.
export const EXPLANATION_TEMPLATE_IDS = ['NORM-01', 'OOR-01']
