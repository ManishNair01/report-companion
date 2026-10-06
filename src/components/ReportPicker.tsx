import { DEMO_PHOTO as PHOTO, DEMO_REPORT_IDS, REPORTS } from '../data/reports'
import { useSnap, useStore } from '../state/AppContext'


export function ReportPicker() {
  const store = useStore()
  const { state } = useSnap()
  return (
    <section className="panel picker" aria-label="Demo reports">
      <h2>1. Pick a demo report</h2>
      <p className="muted">Tap a card to upload it in the chat. Keys 1, 2, 3.</p>
      {DEMO_REPORT_IDS.map((id, i) => {
        const r = REPORTS[id]
        return (
          <button
            key={id}
            className={`pdf-card ${state.activeReportId === id ? 'selected' : ''}`}
            onClick={() => store.pickReport(id)}
            disabled={state.stopped}
          >
            <span className="pdf-icon" aria-hidden>PDF</span>
            <span className="pdf-body">
              <span className="pdf-title">
                <span aria-hidden>{r.dot}</span> {r.label}
              </span>
              <span className="pdf-meta">{r.visitId} · {r.patient.first} {r.patient.last}, {r.patient.age} {r.patient.sex}</span>
              <span className="pdf-meta">{r.blurb}</span>
            </span>
            <kbd>{i + 1}</kbd>
          </button>
        )
      })}
      <button className="pdf-card photo" onClick={() => store.uploadFile(PHOTO)} disabled={state.stopped}>
        <span className="pdf-icon photo-icon" aria-hidden>JPG</span>
        <span className="pdf-body">
          <span className="pdf-title">Photo of a printed report</span>
          <span className="pdf-meta">Not a lab-issued PDF: goes to a person, nothing is read</span>
        </span>
        <kbd>4</kbd>
      </button>
      <label className="file-pick muted small">
        Or try any file (only its type and size are checked, it is never opened):{' '}
        <input
          type="file"
          disabled={state.stopped}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void store.uploadFile({ name: f.name, mime: f.type, size: f.size })
            e.target.value = ''
          }}
        />
      </label>
      <p className="muted small">
        Keys: <kbd>D</kbd> dashboard · <kbd>P</kbd> patient · <kbd>R</kbd> reset
      </p>
    </section>
  )
}
