import { useSnap } from '../state/AppContext'
import type { StepStatus } from '../state/types'

const ICON: Record<StepStatus, string> = { idle: '○', running: '◔', ok: '✓', fail: '✗', warn: '!' }

export function SafetyTrace() {
  const { state } = useSnap()
  const t = state.trace
  const anyPaused = state.paused.all || Object.values(state.paused.templates).some(Boolean)
  return (
    <section className="panel trace" aria-label="Safety trace">
      <h2>3. Safety trace: what the system did</h2>
      <p className="muted">Rules decide the route. The model only explains, after routing. Internal view, never shown to the patient.</p>
      <div className="flags">
        {anyPaused && <span className="pill amber">AI explanations paused by clinical team</span>}
        {state.load !== 'normal' && <span className="pill amber">Load: {state.load}</span>}
        {state.devInject && <span className="pill red">Dev: unsafe message armed</span>}
      </div>
      {!t ? (
        <div className="empty">Pick a report to watch the checks run.</div>
      ) : (
        <>
          <div className="trace-title">{t.title}</div>
          <ol className="steps">
            {t.steps.map((s) => (
              <li key={s.id} className={`step ${s.status}`}>
                <span className="step-icon" aria-hidden>{ICON[s.status]}</span>
                <div className="step-body">
                  <div className="step-label">{s.label}</div>
                  <div className="step-lines">
                    {s.lines.map((l, i) => {
                      const route = l.text.match(/^Route: (NORMAL|ABNORMAL|CRITICAL|HUMAN)$/)
                      return (
                        <div key={i} className={`line ${l.tone ?? ''}`}>
                          {route ? <span className={`tier t-${route[1]}`}>{route[1]}</span> : l.text}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  )
}
