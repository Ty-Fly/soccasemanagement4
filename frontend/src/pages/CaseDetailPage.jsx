// Case-detail: US-11 t/m US-21 en US-27
import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import * as api from '../api/cases'
import { useAuth } from '../auth/AuthContext'
import { useQuery, useAction, useNow } from '../lib/hooks'
import { setRailFocus } from '../lib/railFocus'
import { slaState } from '../lib/sla'
import { NIST_STATUSES, nistLabel, formatDateTime, formatBytes, CLASSIFICATIONS, IMPACTS, timeAgo } from '../lib/format'
import { NistBadge, TenantLogo, ErrorBox, Loading, Empty, SeverityBadge, AlertStatusBadge } from '../components/ui'
import { useToast } from '../components/Toasts'
import { isLive } from '../config'

const TL_ICONS = { Note: 'N', StatusChange: 'S', AssigneeChange: 'B', PlaybookStep: 'P', Message: 'M', AlertLinked: 'A', Other: '•' }
const TL_LABELS = { Note: 'Notitie', StatusChange: 'Statuswijziging', AssigneeChange: 'Behandelaar', PlaybookStep: 'Playbook', Message: 'Bericht', AlertLinked: 'Alert', Other: 'Wijziging' }

function NistStepper({ status }) {
  const idx = NIST_STATUSES.findIndex((s) => s.key === status)
  return (
    <div className="nist" aria-label={`NIST-status: ${nistLabel(status)}`}>
      {NIST_STATUSES.map((s, i) => (
        <div key={s.key} className={`nist-step ${i < idx ? 'done' : i === idx ? 'current' : ''}`} aria-current={i === idx ? 'step' : undefined}>
          {s.label}
          <small>{i < idx ? 'Afgerond' : i === idx ? 'Huidige fase' : ''}</small>
        </div>
      ))}
    </div>
  )
}

function Timeline({ caseId, entries }) {
  const [text, setText] = useState('')
  const action = useAction()
  return (
    <div className="stack">
      <ol className="timeline">
        {entries.map((e) => (
          <li key={e.id} className={`tl-item ${e.type}`}>
            <span className="tl-icon" aria-hidden="true">{TL_ICONS[e.type]}</span>
            <div>
              <div className="tl-meta">
                {TL_LABELS[e.type]} door {e.authorName}, {formatDateTime(e.createdAt)}
                {e.isInternal ? <span className="tag">Intern</span> : <span className="tag public">Zichtbaar voor klant</span>}
              </div>
              <div className="tl-content">{e.type === 'Message' ? `${e.direction === 'fromClient' ? 'Klant' : 'Aan klant'}: ${e.content}` : e.content}</div>
            </div>
          </li>
        ))}
      </ol>
      <form
        className="composer internal"
        onSubmit={async (e) => {
          e.preventDefault()
          await action.run(async () => { await api.addNote(caseId, text); setText('') })
        }}
      >
        <label htmlFor="note"><b>Interne notitie</b> <span className="small muted">Alleen zichtbaar voor het SOC. Notities kunnen niet worden verwijderd.</span></label>
        <textarea id="note" className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="Wat heb je gevonden of gedaan?" />
        <ErrorBox error={action.error} />
        <div><button className="btn" disabled={action.pending || !text.trim()}>Notitie toevoegen</button></div>
      </form>
    </div>
  )
}

function Chat({ caseItem, entries, userId }) {
  const [text, setText] = useState('')
  const action = useAction()
  const toast = useToast()
  const end = useRef(null)
  const messages = entries.filter((e) => e.type === 'Message')
  const slaRunning = !caseItem.firstResponseAt
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' })
  }, [messages.length])
  return (
    <div className="stack">
      <div className="chat">
        {messages.length === 0 && <p className="bubble system">Nog geen berichten met de klant.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.direction === 'toClient' ? 'mine' : 'theirs'}`}>
            <div className="who-line">{m.direction === 'toClient' ? `${m.authorName} (SOC)` : `${m.authorName} (klant)`}, {formatDateTime(m.createdAt)}</div>
            {m.content}
          </div>
        ))}
        <div ref={end} />
      </div>
      <form
        className="composer to-client"
        onSubmit={async (e) => {
          e.preventDefault()
          const res = await action.run(() => api.sendMessage(caseItem.id, text))
          if (res) {
            setText('')
            if (res.stoppedSla) toast({ title: 'SLA-timer gestopt', text: 'De eerste klantcommunicatie is vastgelegd.' })
          }
        }}
      >
        <label htmlFor="msg"><b>Bericht aan de klant</b> <span className="small muted">De klant ziet dit bericht in het portaal.</span></label>
        {slaRunning && <div className="alert-box warn small">Dit is het eerste bericht aan de klant. Versturen stopt de SLA-timer.</div>}
        <textarea id="msg" className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="Schrijf de klant wat er speelt en wat ze moeten doen." />
        <ErrorBox error={action.error} />
        <div><button className="btn primary" disabled={action.pending || !text.trim() || !userId}>Versturen naar klant</button></div>
      </form>
    </div>
  )
}

function Playbook({ caseItem, readOnly }) {
  const def = caseItem.playbookDef
  const steps = caseItem.playbook.steps
  const [skipping, setSkipping] = useState(null)
  const [reason, setReason] = useState('')
  const action = useAction()
  const finished = steps.filter((s) => s.status !== 'open').length
  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h3>Playbook: {def.name}</h3>
          <p className="small muted">{finished} van {steps.length} stappen afgerond of overgeslagen.</p>
        </div>
      </div>
      <div className="pb-progress" aria-hidden="true"><span style={{ width: `${(finished / steps.length) * 100}%` }} /></div>
      <ErrorBox error={action.error} />
      <ol className="pb-list">
        {def.steps.map((d, i) => {
          const s = steps.find((x) => x.id === d.id)
          return (
            <li key={d.id} className={`pb-step ${s.status}`}>
              <span className="pb-num">{s.status === 'done' ? '✓' : s.status === 'skipped' ? '–' : i + 1}</span>
              <div>
                <div style={{ fontWeight: 600 }}>{d.title}</div>
                <div className="small muted">{d.hint}</div>
                {s.status === 'done' && <div className="small" style={{ marginTop: 4 }}>Afgerond door {s.by}, {formatDateTime(s.at)}</div>}
                {s.status === 'skipped' && <div className="small" style={{ marginTop: 4 }}>Overgeslagen door {s.by}: “{s.reason}”</div>}
                {skipping === d.id && (
                  <form
                    className="stack"
                    style={{ marginTop: 10, gap: 8 }}
                    onSubmit={async (e) => {
                      e.preventDefault()
                      const ok = await action.run(async () => { await api.skipStep(caseItem.id, d.id, reason); return true })
                      if (ok) { setSkipping(null); setReason('') }
                    }}
                  >
                    <label htmlFor={`r-${d.id}`} className="small"><b>Waarom sla je deze stap over?</b> Minimaal 10 tekens; de reden komt in de tijdlijn.</label>
                    <textarea id={`r-${d.id}`} className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} />
                    <div className="row">
                      <button className="btn sm primary" disabled={action.pending}>Stap overslaan</button>
                      <button type="button" className="btn sm" onClick={() => { setSkipping(null); action.setError(null) }}>Annuleren</button>
                      <span className="small muted num">{reason.trim().length}/10</span>
                    </div>
                  </form>
                )}
              </div>
              {s.status === 'open' && !readOnly && skipping !== d.id && (
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn sm" onClick={() => { setSkipping(d.id); setReason(''); action.setError(null) }}>Overslaan</button>
                  <button className="btn sm primary" disabled={action.pending} onClick={() => action.run(() => api.completeStep(caseItem.id, d.id))}>Afvinken</button>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Observables({ observables }) {
  const [copied, setCopied] = useState(null)
  if (!observables.length) return <Empty title="Geen observables">Deze alerts bevatten geen technische indicatoren.</Empty>
  const groups = observables.reduce((acc, o) => ((acc[o.type] ||= []).push(o), acc), {})
  return (
    <div>
      {Object.entries(groups).map(([type, list]) => (
        <div key={type} className="obs-group">
          <h3>{type} <span className="tag">{list.length}</span></h3>
          {list.map((o) => (
            <div key={o.value} className="obs-row">
              <span className="mono">{o.value}</span>
              <span className="small muted">{o.role}</span>
              <button
                className="btn sm"
                onClick={() => { navigator.clipboard?.writeText(o.value); setCopied(o.value); setTimeout(() => setCopied(null), 1500) }}
                aria-label={`Kopieer ${o.value}`}
              >
                {copied === o.value ? 'Gekopieerd' : 'Kopiëren'}
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function Files({ caseItem, readOnly }) {
  const action = useAction()
  const [over, setOver] = useState(false)
  const input = useRef(null)
  const upload = (files) => [...files].forEach((f) => action.run(() => api.uploadFile(caseItem.id, f)))
  return (
    <div className="stack">
      {!readOnly && (
        <div
          className={`dropzone ${over ? 'over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files) }}
        >
          <p>Sleep PDF-bestanden hierheen of</p>
          <button className="btn sm" style={{ marginTop: 8 }} onClick={() => input.current.click()}>Bestand kiezen</button>
          <input ref={input} type="file" accept="application/pdf,.pdf" hidden multiple onChange={(e) => { upload(e.target.files); e.target.value = '' }} />
          <p className="small" style={{ marginTop: 8 }}>Alleen PDF, maximaal 25 MB.</p>
        </div>
      )}
      {!readOnly && !isLive && !caseItem.files.some((f) => f.isFinalReport) && (
        <div>
          <button className="btn sm" disabled={action.pending} onClick={() => action.run(() => api.addDemoFinalReport(caseItem.id))}>
            Eindrapport genereren
          </button>
        </div>
      )}
      <ErrorBox error={action.error} />
      {caseItem.files.length === 0 ? (
        <Empty title="Nog geen bestanden">Voeg bewijsmateriaal of het eindrapport toe.</Empty>
      ) : (
        <table className="table">
          <thead><tr><th>Bestand</th><th>Grootte</th><th>Toegevoegd</th><th>Klant ziet</th><th /></tr></thead>
          <tbody>
            {caseItem.files.map((f) => (
              <tr key={f.id}>
                <td className="title-cell">{f.name}</td>
                <td className="num">{formatBytes(f.size)}</td>
                <td>{f.uploadedBy}, {formatDateTime(f.uploadedAt)}</td>
                <td>{f.isFinalReport ? <span className="badge st-ok">Eindrapport</span> : <span className="muted">Nee</span>}</td>
                <td>
                  <div className="actions">
                    <button className="btn sm" onClick={() => api.downloadFile(caseItem.id, f.id)}>Downloaden</button>
                    {!f.isFinalReport && !readOnly && <button className="btn sm" onClick={() => action.run(() => api.setFinalReport(caseItem.id, f.id))}>Delen als eindrapport</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Linked({ alerts }) {
  return (
    <table className="table">
      <thead><tr><th>Alert</th><th>Ernst</th><th>Bron</th><th>Ontvangen</th><th>Status</th></tr></thead>
      <tbody>
        {alerts.map((a) => (
          <tr key={a.id}>
            <td className="title-cell">#{a.id} {a.alertType}<div className="small muted">{a.className}</div></td>
            <td><SeverityBadge severity={a.severity} /></td>
            <td>{a.source}</td>
            <td>{formatDateTime(a.createdAt)}</td>
            <td><AlertStatusBadge status={a.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TriageForm({ caseItem, readOnly }) {
  const [form, setForm] = useState({ triage: caseItem.triage, classification: caseItem.classification, impact: caseItem.impact })
  const save = useAction()
  const move = useAction()
  const [saved, setSaved] = useState(false)
  const idx = NIST_STATUSES.findIndex((s) => s.key === caseItem.status)
  const next = NIST_STATUSES[idx + 1]
  const dirty = form.triage !== caseItem.triage || form.classification !== caseItem.classification || form.impact !== caseItem.impact
  return (
    <section className="panel">
      <div className="panel-head"><h2>Triage en status</h2></div>
      <div className="panel-body stack" style={{ gap: 12 }}>
        <div className="field">
          <label htmlFor="cls">Classificatie</label>
          <select id="cls" className="select" disabled={readOnly} value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })}>
            <option value="">Nog niet bepaald</option>
            {CLASSIFICATIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="imp">Businessimpact</label>
          <select id="imp" className="select" disabled={readOnly} value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })}>
            <option value="">Nog niet ingeschat</option>
            {IMPACTS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="tri">Uitgevoerde triage</label>
          <textarea id="tri" className="textarea" disabled={readOnly} value={form.triage} onChange={(e) => setForm({ ...form, triage: e.target.value })} placeholder="Wat is gecontroleerd en wat was de uitkomst?" />
          <span className="hint">De klant ziet triage, classificatie en impact in het portaal.</span>
        </div>
        <ErrorBox error={save.error} />
        {!readOnly && (
          <div className="row">
            <button className="btn" disabled={!dirty || save.pending} onClick={async () => { await save.run(() => api.updateCaseDetails(caseItem.id, form)); setSaved(true); setTimeout(() => setSaved(false), 2000) }}>
              Triage opslaan
            </button>
            {saved && <span className="small muted">Opgeslagen</span>}
          </div>
        )}
        {next && !readOnly && (
          <div className="stack" style={{ gap: 8, borderTop: '1px solid var(--line-soft)', paddingTop: 12 }}>
            <ErrorBox error={move.error} />
            <button className="btn primary" disabled={move.pending || dirty} onClick={() => move.run(() => api.changeStatus(caseItem.id, next.key))}>
              Naar {next.label}
            </button>
            {dirty && <span className="hint">Sla de triage eerst op.</span>}
          </div>
        )}
      </div>
    </section>
  )
}

function ClientContext({ tenant }) {
  return (
    <section className="panel">
      <div className="panel-head"><h2>Klantomgeving</h2></div>
      <div className="panel-body">
        <dl className="kv">
          <dt>Omgevingen</dt>
          <dd className="link-list">
            {tenant.urls.map((u) => <a key={u.url} href={u.url} target="_blank" rel="noreferrer">{u.label}</a>)}
          </dd>
          <dt>Keystore</dt>
          <dd className="mono">{tenant.keystoreRef}</dd>
          <dt>Contact</dt>
          <dd>{tenant.contact}</dd>
        </dl>
      </div>
    </section>
  )
}

export default function CaseDetailPage() {
  const id = Number(useParams().id)
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'timeline'
  const caseQ = useQuery(() => api.getCase(id), [id])
  const tl = useQuery(() => api.getTimeline(id), [id])
  const colleagues = useQuery(() => api.listColleagues(), [])
  const action = useAction()
  const now = useNow()
  const c = caseQ.data

  useEffect(() => {
    if (c) setRailFocus(c)
    return () => setRailFocus(null)
  }, [c])

  if (caseQ.error?.status === 404) return <Empty title="Case niet gevonden">Deze case bestaat niet of je hebt er geen toegang toe. <Link to="/cases">Terug naar cases</Link></Empty>
  if (!c) return <Loading />

  const closed = c.status === 'Gesloten'
  const readOnly = closed || user.role === 'AccountManager'
  const entries = tl.data || []
  const sla = slaState(c, now)
  const messages = entries.filter((e) => e.type === 'Message').length
  const tabs = [
    { key: 'timeline', label: 'Tijdlijn', count: entries.length },
    { key: 'chat', label: 'Klantcontact', count: messages },
    { key: 'playbook', label: 'Playbook' },
    { key: 'observables', label: 'Observables', count: c.observables.length },
    { key: 'files', label: 'Bestanden', count: c.files.length },
    { key: 'alerts', label: 'Alerts', count: c.alerts.length },
  ]

  return (
    <div className="stack">
      <p className="small"><Link to="/cases">Cases</Link> / #{c.id}</p>
      <section className="panel case-head">
        <TenantLogo tenant={c.tenant} />
        <div>
          <div className="small muted">{c.tenant.name}</div>
          <h1>{c.title}</h1>
          <div className="case-meta">
            <span>Case #{c.id}</span>
            <span>Aangemaakt {timeAgo(c.createdAt)}</span>
            <span>Behandelaar: {c.assignedToName ?? 'onverdeeld'}</span>
            <NistBadge status={c.status} />
            <span className={`sla ${sla.level}`}><span className="sla-dot" aria-hidden="true" />{sla.label}</span>
          </div>
        </div>
        <div className="stack" style={{ gap: 8, alignItems: 'flex-end' }}>
          {!readOnly && (
            <div className="row">
              {!c.assignedToUserId && <button className="btn primary" disabled={action.pending} onClick={() => action.run(() => api.claimCase(c.id))}>Oppakken</button>}
              <select
                className="select"
                style={{ width: 'auto' }}
                aria-label="Overdragen aan collega"
                value=""
                onChange={(e) => e.target.value && action.run(() => api.assignCase(c.id, Number(e.target.value)))}
              >
                <option value="">Overdragen aan…</option>
                {colleagues.data?.filter((u) => u.id !== c.assignedToUserId && u.role !== 'AccountManager').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <button className="btn danger" disabled={action.pending} onClick={() => action.run(() => api.closeCaseAsFalsePositive(c.id))}>Sluiten als false positive</button>
            </div>
          )}
          {closed && <span className="small muted">Gesloten op {formatDateTime(c.closedAt)}{c.isFalsePositive ? ' als false positive' : ''}</span>}
          <ErrorBox error={action.error} />
        </div>
      </section>

      <div className="case-layout">
        <div className="stack">
          <section className="panel">
            <div className="panel-body"><NistStepper status={c.status} /></div>
          </section>
          <section className="panel">
            <div className="tabs" role="tablist">
              {tabs.map((t) => (
                <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setParams({ tab: t.key }, { replace: true })}>
                  {t.label}{t.count !== undefined && <span className="count">{t.count}</span>}
                </button>
              ))}
            </div>
            <div className="panel-body" role="tabpanel">
              {tab === 'timeline' && <Timeline caseId={c.id} entries={entries} />}
              {tab === 'chat' && <Chat caseItem={c} entries={entries} userId={user.userId} />}
              {tab === 'playbook' && <Playbook caseItem={c} readOnly={readOnly} />}
              {tab === 'observables' && <Observables observables={c.observables} />}
              {tab === 'files' && <Files caseItem={c} readOnly={readOnly} />}
              {tab === 'alerts' && <Linked alerts={c.alerts} />}
            </div>
          </section>
        </div>
        <aside className="case-side">
          <ClientContext tenant={c.tenant} />
          <TriageForm key={`${c.triage}|${c.classification}|${c.impact}`} caseItem={c} readOnly={readOnly} />
          <section className="panel">
            <div className="panel-body small">
              <dl className="kv">
                <dt>SLA gestart</dt><dd>{formatDateTime(c.slaStartAt)}</dd>
                <dt>Deadline</dt><dd>{formatDateTime(c.slaDeadlineAt)}</dd>
                <dt>Eerste reactie</dt><dd>{c.firstResponseAt ? formatDateTime(c.firstResponseAt) : 'Nog niet'}</dd>
              </dl>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
