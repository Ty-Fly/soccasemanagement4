// Overdrachtsrapport: US-22 (opstellen) en US-23 (inzien bij start dienst)
import { useState } from 'react'
import { Link } from 'react-router'
import { getShiftOverview, addHandoverItem, listReports } from '../api/handover'
import { EVENTS } from '../api/realtime'
import { useQuery, useAction } from '../lib/hooks'
import { HANDOVER_CATEGORIES, formatDate, formatTime, formatDateTime } from '../lib/format'
import { ErrorBox, Loading, Empty } from '../components/ui'

function ReportItems({ report, tenants }) {
  if (!report.items.length) return <Empty title="Nog geen punten">Voeg toe wat de volgende ploeg moet weten.</Empty>
  return (
    <ul className="timeline">
      {report.items.map((i) => (
        <li key={i.id} className="tl-item">
          <span className="tl-icon" aria-hidden="true">{HANDOVER_CATEGORIES[i.category][0]}</span>
          <div>
            <div className="tl-meta">
              <b style={{ color: 'var(--text)' }}>{HANDOVER_CATEGORIES[i.category]}</b> door {i.author}, {formatDateTime(i.createdAt)}
              {i.clientId && <span className="tag">{tenants.find((t) => t.id === i.clientId)?.name}</span>}
            </div>
            <div className="tl-content">{i.text}</div>
            {i.linkedCaseIds.length > 0 && (
              <div className="row small" style={{ marginTop: 4 }}>
                Cases: {i.linkedCaseIds.map((id) => <Link key={id} to={`/cases/${id}`}>#{id}</Link>)}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

function AddItemForm({ report, overview }) {
  const empty = { category: 'Other', text: '', clientId: '', linkedCaseIds: [] }
  const [form, setForm] = useState(empty)
  const action = useAction()
  const toggleCase = (id) => setForm((f) => ({ ...f, linkedCaseIds: f.linkedCaseIds.includes(id) ? f.linkedCaseIds.filter((x) => x !== id) : [...f.linkedCaseIds, id] }))
  return (
    <form
      className="stack"
      style={{ gap: 12 }}
      onSubmit={async (e) => {
        e.preventDefault()
        const ok = await action.run(async () => { await addHandoverItem(report.id, { ...form, clientId: form.clientId ? Number(form.clientId) : null }); return true })
        if (ok) setForm(empty)
      }}
    >
      <div className="grid-2">
        <div className="field">
          <label htmlFor="cat">Categorie</label>
          <select id="cat" className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {Object.entries(HANDOVER_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="client">Klant (optioneel)</label>
          <select id="client" className="select" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
            <option value="">Geen specifieke klant</option>
            {overview.tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="text">Wat moet de volgende ploeg weten?</label>
        <textarea id="text" className="textarea" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
      </div>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 500, fontSize: '0.9rem', marginBottom: 6 }}>Open cases van deze shift koppelen</legend>
        <div className="stack" style={{ gap: 4, maxHeight: 160, overflowY: 'auto' }}>
          {overview.suggestedOpenCases.map((c) => (
            <label key={c.id} className="row small" style={{ gap: 8 }}>
              <input type="checkbox" checked={form.linkedCaseIds.includes(c.id)} onChange={() => toggleCase(c.id)} />
              #{c.id} {c.title} <span className="muted">({c.tenantName})</span>
            </label>
          ))}
        </div>
      </fieldset>
      <ErrorBox error={action.error} />
      <div><button className="btn primary" disabled={action.pending || !form.text.trim()}>Toevoegen aan rapport</button></div>
    </form>
  )
}

export default function HandoverPage() {
  const overview = useQuery(() => getShiftOverview(), [], { events: [EVENTS.HandoverUpdated] })
  const all = useQuery(() => listReports(), [], { events: [EVENTS.HandoverUpdated] })
  const [date, setDate] = useState('')

  const others = (all.data || []).filter((r) => r.id !== overview.data?.current.id && r.id !== overview.data?.previous?.id)
  const archive = date ? others.filter((r) => r.startsAt.slice(0, 10) === date || r.endsAt.slice(0, 10) === date) : others

  if (!overview.data) return overview.error ? <ErrorBox error={overview.error} /> : <Loading />
  const { current, previous, tenants } = overview.data

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Overdracht</h1>
        </div>
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Jouw dienst: {current.shift.toLowerCase()}</h2>
              <p className="small muted">{formatDate(current.startsAt)}, {formatTime(current.startsAt)}–{formatTime(current.endsAt)}</p>
            </div>
          </div>
          <div className="panel-body stack">
            <AddItemForm report={current} overview={overview.data} />
            <ReportItems report={current} tenants={tenants} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Vorige dienst{previous ? `: ${previous.shift.toLowerCase()}` : ''}</h2>
              {previous && <p className="small muted">{formatDate(previous.startsAt)}, {formatTime(previous.startsAt)}–{formatTime(previous.endsAt)}</p>}
            </div>
          </div>
          <div className="panel-body">{previous ? <ReportItems report={previous} tenants={tenants} /> : <Empty title="Geen vorig rapport" />}</div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Oudere rapporten</h2>
          <div className="row">
            <label htmlFor="date" className="small">Zoek op datum</label>
            <input id="date" type="date" className="input" style={{ width: 'auto' }} value={date} onChange={(e) => setDate(e.target.value)} />
            {date && <button className="btn sm ghost" onClick={() => setDate('')}>Wissen</button>}
          </div>
        </div>
        <div className="panel-body stack">
          {archive.length === 0 ? <p className="muted">Geen rapporten gevonden{date ? ' op deze datum' : ''}.</p> : archive.map((r) => (
            <div key={r.id}>
              <h3 style={{ marginBottom: 4 }}>{r.shift}, {formatDate(r.startsAt)}</h3>
              <ReportItems report={r} tenants={tenants} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
