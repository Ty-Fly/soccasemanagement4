// US-25 (voortgang), US-26 (bericht sturen), US-29 (eindrapport downloaden)
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getMyCase, getTimeline, sendMessage, downloadFile } from '../../api/cases'
import { useAuth } from '../../auth/AuthContext'
import { useQuery, useAction } from '../../lib/hooks'
import { NIST_STATUSES, formatDateTime, formatBytes } from '../../lib/format'
import { ErrorBox, Loading, Empty } from '../../components/ui'

export default function PortalCaseDetail() {
  const id = Number(useParams().id)
  const { user } = useAuth()
  const c = useQuery(() => getMyCase(id), [id])
  const tl = useQuery(() => getTimeline(id), [id])
  const [text, setText] = useState('')
  const action = useAction()
  const end = useRef(null)
  const messages = (tl.data || []).filter((e) => e.type === 'Message')
  const updates = (tl.data || []).filter((e) => e.type !== 'Message')
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' })
  }, [messages.length])

  // US-01 AC 1: case van een andere klant geeft 404, zonder te bevestigen dat die bestaat
  if (c.error?.status === 404) return <Empty title="Incident niet gevonden">Controleer de link, of ga terug naar <Link to="/portal">uw incidenten</Link>.</Empty>
  if (!c.data) return <Loading />
  const caseItem = c.data
  const idx = NIST_STATUSES.findIndex((s) => s.key === caseItem.status)

  return (
    <div className="stack">
      <p className="small"><Link to="/portal">Mijn incidenten</Link> / #{caseItem.id}</p>
      <div className="page-head">
        <div>
          <h1>{caseItem.title}</h1>
          <p>Gemeld op {formatDateTime(caseItem.createdAt)}{caseItem.closedAt ? `, afgerond op ${formatDateTime(caseItem.closedAt)}` : ''}</p>
        </div>
        {caseItem.finalReport && (
          <button className="btn primary" onClick={() => downloadFile(caseItem.id, caseItem.finalReport.id)}>
            Eindrapport downloaden (PDF, {formatBytes(caseItem.finalReport.size)})
          </button>
        )}
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Voortgang</h2></div>
        <div className="panel-body">
          <div className="progress-nist" aria-label={`Fase ${idx + 1} van 5: ${NIST_STATUSES[idx].label}`}>
            {NIST_STATUSES.map((s, i) => (
              <div key={s.key} className={i < idx ? 'done' : i === idx ? 'current' : ''} aria-current={i === idx ? 'step' : undefined}>{s.label}</div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head"><h2>Beoordeling door het SOC</h2></div>
          <div className="panel-body">
            <dl className="kv">
              <dt>Classificatie</dt><dd>{caseItem.classification || 'Wordt nog onderzocht'}</dd>
              <dt>Impact</dt><dd>{caseItem.impact || 'Wordt nog ingeschat'}</dd>
              <dt>Triage</dt><dd>{caseItem.triage || 'Het SOC onderzoekt de melding.'}</dd>
            </dl>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Updates</h2></div>
          <div className="panel-body">
            {updates.length === 0 ? <p className="muted">Nog geen updates.</p> : (
              <ol className="timeline">
                {updates.map((u) => (
                  <li key={u.id} className={`tl-item ${u.type}`}>
                    <span className="tl-icon" aria-hidden="true">{u.type === 'StatusChange' ? 'S' : '•'}</span>
                    <div><div className="tl-meta">{formatDateTime(u.createdAt)}</div><div>{u.content}</div></div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Berichten met het SOC</h2></div>
        <div className="panel-body stack">
          <div className="chat">
            {messages.length === 0 && <p className="bubble system">Nog geen berichten. Stel hier uw vraag over dit incident.</p>}
            {messages.map((m) => (
              <div key={m.id} className={`bubble ${m.direction === 'fromClient' ? 'mine' : 'theirs'}`}>
                <div className="who-line">{m.direction === 'fromClient' ? m.authorName : 'SOC'}, {formatDateTime(m.createdAt)}</div>
                {m.content}
              </div>
            ))}
            <div ref={end} />
          </div>
          <form
            className="composer"
            onSubmit={async (e) => {
              e.preventDefault()
              const res = await action.run(() => sendMessage(caseItem.id, text))
              if (res) setText('')
            }}
          >
            <label htmlFor="m" className="sr-only">Bericht aan het SOC</label>
            <textarea id="m" className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="Uw vraag of bericht over dit incident" />
            <ErrorBox error={action.error} />
            <div><button className="btn primary" disabled={action.pending || !text.trim() || !user}>Versturen</button></div>
          </form>
        </div>
      </section>
    </div>
  )
}
