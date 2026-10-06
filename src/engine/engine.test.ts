import { describe, expect, it } from 'vitest'
import { REPORTS } from '../data/reports'
import type { LabResult, Report } from '../data/reports'
import { allPass, runChecks } from './checks'
import { classifyReport, classifyResult } from './classify'
import { buildAuditExport } from './accountability'
import { RATE_MAX, RATE_WINDOW_MS, admit, rateCheck } from './capacity'
import { deferredMessage, explain, intakeMessage, notUnderstoodMessage, rateLimitMessage } from './explain'
import { MAX_UPLOAD_BYTES, validateUpload } from './intake'
import { classifyIntent } from './intent'
import type { Message } from './types'

const hb = (over: Partial<LabResult>): LabResult => ({
  code: 'HB', name: 'Hemoglobin', value: 14, unit: 'g/dL', low: 13, high: 17, ...over,
})
const report = (results: LabResult[]): Report => ({ ...REPORTS.normal, results })

describe('routing', () => {
  it('routes the three demo reports', () => {
    expect(classifyReport(REPORTS.normal).route).toBe('NORMAL')
    expect(classifyReport(REPORTS.abnormal).route).toBe('ABNORMAL')
    expect(classifyReport(REPORTS.critical).route).toBe('CRITICAL')
  })

  it('treats a value exactly on a boundary as in range', () => {
    expect(classifyResult(hb({ value: 13 }))).toBe('normal')
    expect(classifyResult(hb({ value: 17 }))).toBe('normal')
    expect(classifyResult(hb({ value: 17.01 }))).toBe('high')
    expect(classifyResult(hb({ value: 12.99 }))).toBe('low')
    expect(classifyResult(hb({ value: 20, critHigh: 20 }))).toBe('high')
  })

  it('lets a critical value outrank an abnormal one', () => {
    const r = report([hb({ value: 18 }), hb({ code: 'K', name: 'Potassium', value: 7, low: 3.5, high: 5.1, critHigh: 6.5 })])
    expect(classifyReport(r).route).toBe('CRITICAL')
  })

  it('always routes a sensitive category to a human', () => {
    const r = report([hb({}), hb({ code: 'HB', name: 'HIV screen', category: 'HIV' })])
    expect(classifyReport(r).route).toBe('HUMAN')
  })

  it('routes a missing range, unknown code or unreadable value to a human', () => {
    expect(classifyReport(REPORTS.incomplete).route).toBe('HUMAN')
    expect(classifyReport(report([hb({ low: undefined, high: undefined })])).route).toBe('HUMAN')
    expect(classifyReport(report([hb({ code: 'XYZ' })])).route).toBe('HUMAN')
    expect(classifyReport(report([hb({ value: null })])).route).toBe('HUMAN')
  })

  it('still escalates a critical value when other results are unclear', () => {
    const r = report([hb({ value: 1, critLow: 5 }), hb({ code: 'XYZ' })])
    expect(classifyReport(r).route).toBe('CRITICAL')
  })
})

describe('explanation messages pass their own checks', () => {
  for (const id of ['normal', 'abnormal', 'critical', 'incomplete'] as const) {
    it(`${id}`, () => {
      const rep = REPORTS[id]
      const route = classifyReport(rep).route
      for (const m of explain(rep, route)) expect(allPass(runChecks(m, rep, route))).toBe(true)
    })
  }

  it('sends no values in the critical message', () => {
    const [m] = explain(REPORTS.critical, 'CRITICAL')
    expect(m.text).not.toMatch(/6\.9|2\.9|potassium/i)
  })
})

describe('Hindi explanations', () => {
  for (const id of ['normal', 'abnormal'] as const) {
    it(`${id} passes the same checks`, () => {
      const rep = REPORTS[id]
      const route = classifyReport(rep).route
      for (const m of explain(rep, route, 'hi')) expect(allPass(runChecks(m, rep, route))).toBe(true)
    })
  }
})

describe('output checks', () => {
  const base = explain(REPORTS.normal, 'NORMAL')[0]
  const failing = (m: Message, route = 'NORMAL' as const, rep = REPORTS.normal) =>
    runChecks(m, rep, route).filter((c) => !c.pass).map((c) => c.id)

  it('rejects an invented number', () => {
    expect(failing({ ...base, text: base.text + '\n\nGlucose is 250 mg/dL.' })).toContain('numbers')
  })

  it('rejects banned wording', () => {
    expect(failing({ ...base, text: base.text + ' Take one tablet daily.' })).toContain('banned')
    expect(failing({ ...base, text: base.text + ' You have diabetes.' })).toContain('banned')
  })

  it('rejects a missing disclaimer on an explanation', () => {
    expect(failing({ ...base, text: 'All good.' })).toContain('disclaimer')
  })

  it('rejects any value in a critical message', () => {
    const [crit] = explain(REPORTS.critical, 'CRITICAL')
    expect(failing({ ...crit, text: crit.text + ' Your potassium is 4.', }, 'CRITICAL' as never, REPORTS.critical)).toContain('no-values')
    expect(failing({ ...crit, text: crit.text + ' Potassium 6.9.' }, 'CRITICAL' as never, REPORTS.critical)).toContain('no-values')
  })

  it('blocks a message with no registered template', () => {
    expect(failing({ ...base, templateId: 'MADE-UP-99' })).toContain('registered')
    expect(failing({ ...base, version: '9.9' })).toContain('registered')
  })
})

describe('intake gate (photo instead of PDF)', () => {
  const pdf = { name: 'r.pdf', mime: 'application/pdf', size: 1000 }
  it('accepts a PDF', () => expect(validateUpload(pdf).ok).toBe(true))
  it('rejects a photo', () => {
    const v = validateUpload({ name: 'a.jpg', mime: 'image/jpeg', size: 1000 })
    expect(v.ok).toBe(false)
    expect(!v.ok && v.code).toBe('IMAGE')
  })
  it('rejects wrong types, empty and oversized files', () => {
    expect(validateUpload({ ...pdf, mime: 'text/html' }).ok).toBe(false)
    expect(validateUpload({ ...pdf, name: 'r.exe' }).ok).toBe(false)
    expect(validateUpload({ ...pdf, size: 0 }).ok).toBe(false)
    expect(validateUpload({ ...pdf, size: MAX_UPLOAD_BYTES + 1 }).ok).toBe(false)
  })
  it('the handoff message passes the checks and carries no values', () => {
    const m = intakeMessage()
    expect(allPass(runChecks(m, REPORTS.normal, 'HUMAN'))).toBe(true)
    expect(m.text).toMatch(/112/)
  })
})

describe('free-text intent', () => {
  it('puts emergency wording first, even with a medical word in it', () => {
    expect(classifyIntent('I have chest pain and diabetes').intent).toBe('emergency')
    expect(classifyIntent('मुझे सीने में दर्द है').intent).toBe('emergency')
  })
  it('refuses diagnosis, medicine and general-health questions', () => {
    for (const q of ['Do I have diabetes?', 'Which tablet should I take?', 'is this dangerous', 'what diet should I follow'])
      expect(classifyIntent(q).intent).toBe('medical')
  })
  it('does not place nonsense, symbols or other scripts', () => {
    for (const q of ['asdf qwer', '???', '😀😀', 'मेरी रिपोर्ट कहाँ है'])
      expect(classifyIntent(q).intent).toBe('unknown')
  })
})

describe('load control', () => {
  it('never sheds the priority lane', () => {
    for (const l of ['normal', 'busy', 'overloaded'] as const) expect(admit(l, 'CRITICAL').admit).toBe(true)
  })
  it('defers standard explanations only when overloaded, and turns the model off when busy', () => {
    expect(admit('normal', 'NORMAL').modelAllowed).toBe(true)
    expect(admit('busy', 'ABNORMAL')).toMatchObject({ admit: true, modelAllowed: false })
    expect(admit('overloaded', 'NORMAL').admit).toBe(false)
    expect(admit('overloaded', 'HUMAN').admit).toBe(true)
  })
  it('rate limits a flood and recovers after the window', () => {
    let stamps: number[] = []
    for (let i = 0; i < RATE_MAX; i++) {
      const r = rateCheck(stamps, 1000 + i)
      expect(r.allowed).toBe(true)
      stamps = r.stamps
    }
    expect(rateCheck(stamps, 1100).allowed).toBe(false)
    expect(rateCheck(stamps, 1000 + RATE_WINDOW_MS + 10).allowed).toBe(true)
  })
  it('the deferral and rate-limit messages pass the checks', () => {
    expect(allPass(runChecks(deferredMessage(REPORTS.normal), REPORTS.normal, 'NORMAL'))).toBe(true)
    expect(allPass(runChecks(rateLimitMessage(), REPORTS.normal, 'NORMAL'))).toBe(true)
    expect(allPass(runChecks(notUnderstoodMessage(), REPORTS.normal, 'NORMAL'))).toBe(true)
  })
})

describe('accountability and grounding', () => {
  const base = explain(REPORTS.normal, 'NORMAL')[0]
  it('production mode blocks a template that is not approved', () => {
    const failed = runChecks(base, REPORTS.normal, 'NORMAL', 'production').filter((c) => !c.pass).map((c) => c.id)
    expect(failed).toEqual(['signoff'])
  })
  it('demo mode lets a demo-pending template through', () => {
    expect(allPass(runChecks(base, REPORTS.normal, 'NORMAL', 'demo'))).toBe(true)
  })
  it('rejects a message that mentions a test not in this patient’s report', () => {
    const failed = runChecks({ ...base, text: base.text + ' Potassium is also a mineral.' }, REPORTS.normal, 'NORMAL')
      .filter((c) => !c.pass).map((c) => c.id)
    expect(failed).toContain('grounded')
  })
  it('the audit export names owners and versions and is valid JSON', () => {
    const out = JSON.parse(JSON.stringify(buildAuditExport([{ ts: 0, action: 'x' }], 0)))
    expect(out.accountability.length).toBeGreaterThan(0)
    expect(out.templates.every((t: { owner: string; version: string }) => t.owner && t.version)).toBe(true)
    expect(out.entries[0].time).toBe('1970-01-01T00:00:00.000Z')
  })
})
