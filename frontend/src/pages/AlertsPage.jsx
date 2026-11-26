// Hoofddashboard analist: US-06 (realtime overzicht), US-07, US-08, US-09, US-10, US-23
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { listAlerts, closeAlert, promoteAlert, matchingCases, linkAlert, createNationalIncident } from '../api/alerts'
import { engineerStats } from '../api/stats'
import { getShiftOverview } from '../api/handover'
import { EVENTS } from '../api/realtime'
import { getDb } from '../api/mock/db'
import { useQuery, useAction, useNow } from '../lib/hooks'
import { timeAgo, formatTime, SEVERITIES, SEVERITY_LABELS, HANDOVER_CATEGORIES, nistLabel } from '../lib/format'
import { SeverityBadge, TenantLogo, Empty, ErrorBox, Loading, Modal, Donut } from '../components/ui'
import { useToast } from '../components/Toasts'

const ALERT_EVENTS = [EVENTS.AlertReceived, EVENTS.AlertClosed, EVENTS.AlertPromoted, EVENTS.AlertLinked, EVENTS.CaseCreated]

function HandoverBanner() {
  const { data } = useQuery(() => getShiftOverview(), [], { events: [EVENTS.HandoverUpdated] })
  const prev = data?.previous
  if (!prev) return null
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Overdracht van de {prev.shift.toLowerCase()}</h2>
          <p className="small muted">{formatTime(prev.startsAt)}–{formatTime(prev.endsAt)}, {prev.items.length} {prev.items.length === 1 ? 'punt' : 'punten'}</p>
        </div>
        <Link className="btn sm" to="/overdracht">Volledig rapport</Link>
      </div>
      <div className="panel-body">
        {prev.items.length === 0 ? (
          <p className="muted">De vorige ploeg heeft geen bijzonderheden doorgegeven.</p>
        ) : (
          <ul className="stack" style={{ margin: 0, paddingLeft: 18, gap: 6 }}>
            {prev.items.slice(0, 3).map((i) => (
              <li key={i.id}><b>{HANDOVER_CATEGORIES[i.category]}:</b> {i.text}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function RatioPanel() {
  const { data } = useQuery(() => engineerStats({ days: 7 }), [], { events: [EVENTS.AlertClosed, EVENTS.AlertPromoted] })
  if (!data) return <section className="panel"><Loading /></section>
  const { tp, fp } = data.totals
  return (
    <section className="panel">
      <div className="panel-head"><h2>Laatste 7 dagen</h2></div>
      <div className="panel-body donut-wrap">
        <Donut label={`True positives ${tp}, false positives ${fp}`} parts={[{ name: 'true positive', value: tp, color: 'var(--action)' }, { name: 'false positive', value: fp, color: '#c9d2dd' }]} />
        <div className="stack" style={{ gap: 6 }}>
          <div className="legend"><span><i style={{ background: 'var(--action)' }} />True positive: {tp}</span></div>
          <div className="legend"><span><i style={{ background: '#c9d2dd' }} />False positive: {fp}</span></div>
        </div>
      </div>
    </section>
  )
}

function LinkModal({ alert, onClose, onDone }) {
  const { data, error, loading } = useQuery(() => matchingCases(alert.id), [alert.id])
  const [caseId, setCaseId] = useState('')
  const action = useAction()
  return (
    <Modal
      title={`Alert #${alert.id} koppelen aan een case`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Annuleren</button>
          <button className="btn primary" disabled={!caseId || action.pending} onClick={() => action.run(async () => { await linkAlert(alert.id, Number(caseId)); onDone(Number(caseId)) })}>
            Koppelen
          </button>
        </>
      }
    >
      <p className="muted">Alleen open cases van {alert.tenantName} worden getoond.</p>
      {loading && <Loading />}
      <ErrorBox error={error || action.error} />
      {data && data.length === 0 && <div className="alert-box info">Deze klant heeft geen open cases. Promoveer de alert tot een nieuwe case.</div>}
      {data?.length > 0 && (
        <div className="field">
          <label htmlFor="case">Case</label>
          <select id="case" className="select" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
            <option value="">Kies een case</option>
            {data.map((c) => <option key={c.id} value={c.id}>#{c.id} {c.title} ({nistLabel(c.status)})</option>)}
          </select>
        </div>
      )}
    </Modal>
  )
}

function NationalModal({ alerts, onClose, onDone }) {
  const action = useAction()
  const tenants = [...new Set(alerts.map((a) => a.tenantName))]
  return (
    <Modal
      title="Landelijk incident aanmaken"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Annuleren</button>
          <button className="btn primary" disabled={action.pending} onClick={() => action.run(async () => onDone(await createNationalIncident(alerts.map((a) => a.id))))}>
            {tenants.length} {tenants.length === 1 ? 'case' : 'aparte cases'} aanmaken
          </button>
        </>
      }
    >
      <p>Voor iedere getroffen klant komt er een eigen case met een eigen SLA-timer. Klanten zien niet dat anderen ook getroffen zijn.</p>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {tenants.map((t) => <li key={t}>{t} ({alerts.filter((a) => a.tenantName === t).length} alert{alerts.filter((a) => a.tenantName === t).length > 1 ? 's' : ''})</li>)}
      </ul>
      <p className="small muted">Lukt het aanmaken voor één klant niet, dan wordt er niets aangemaakt.</p>
      <ErrorBox error={action.error} />
    </Modal>
  )
}

export default function AlertsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { data, error, loading } = useQuery(() => listAlerts({ status: 'Open' }), [], { events: ALERT_EVENTS })
  const [tenant, setTenant] = useState('')
  const [severity, setSeverity] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [linking, setLinking] = useState(null)
  const [national, setNational] = useState(false)
  const action = useAction()

  const tenants = getDb().tenants
  const rows = useMemo(
    () => (data || []).filter((a) => (!tenant || a.tenantId === Number(tenant)) && (!severity || a.severity === severity)),
    [data, tenant, severity],
  )

  // Nieuw binnengekomen alerts (< 20 sec oud) even oplichten
  const now = useNow(5000)
  const isFresh = (a) => now - new Date(a.createdAt).getTime() < 20_000

  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectedAlerts = rows.filter((a) => selected.has(a.id))

  async function onPromote(a) {
    const res = await action.run(() => promoteAlert(a.id))
    if (res) toast({ title: `Case #${res.caseId} aangemaakt`, text: 'De SLA-timer loopt vanaf het ontvangsttijdstip van de alert.', to: `/cases/${res.caseId}` })
  }
  async function onClose(a) {
    const res = await action.run(() => closeAlert(a.id))
    if (res) toast({ title: `Alert #${a.id} gesloten als false positive` })
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Alerts</h1>
        </div>
      </div>

      <div className="grid-2">
        <HandoverBanner />
        <RatioPanel />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div className="filters">
            <select className="select" value={tenant} onChange={(e) => setTenant(e.target.value)} aria-label="Filter op klant">
              <option value="">Alle klanten</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select className="select" value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Filter op ernst">
              <option value="">Alle ernst</option>
              {SEVERITIES.map((s) => <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>)}
            </select>
            <span className="small muted">{rows.length} open</span>
          </div>
          <div className="row">
            {selected.size > 0 && <span className="small muted">{selectedAlerts.length} geselecteerd</span>}
            <button className="btn" disabled={selectedAlerts.length < 2} onClick={() => setNational(true)} title="Selecteer alerts van meerdere klanten">
              Landelijk incident
            </button>
          </div>
        </div>
        <ErrorBox error={error || action.error} />
        {loading && !data ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty title="Geen open alerts">Nieuwe meldingen verschijnen hier automatisch.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th><span className="sr-only">Selecteren</span></th>
                  <th>Ernst</th>
                  <th>Klant</th>
                  <th>Melding</th>
                  <th>Bron</th>
                  <th>Ontvangen</th>
                  <th><span className="sr-only">Acties</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const t = tenants.find((x) => x.id === a.tenantId)
                  return (
                    <tr key={a.id} className={`${selected.has(a.id) ? 'selected' : ''} ${isFresh(a) ? 'fresh' : ''}`}>
                      <td><input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} aria-label={`Selecteer alert ${a.id}`} /></td>
                      <td><SeverityBadge severity={a.severity} /></td>
                      <td><span className="tenant-cell"><TenantLogo tenant={t} size="sm" />{a.tenantName}</span></td>
                      <td>
                        <div className="title-cell">{a.alertType}</div>
                        <div className="small muted">#{a.id} {a.className}, {a.observables?.slice(0, 2).map((o) => o.value).join(', ')}</div>
                      </td>
                      <td>{a.source}</td>
                      <td className="num" title={new Date(a.createdAt).toLocaleString('nl-NL')}>{timeAgo(a.createdAt)}</td>
                      <td>
                        <div className="actions">
                          <button className="btn sm" disabled={action.pending} onClick={() => onClose(a)}>False positive</button>
                          <button className="btn sm" disabled={action.pending} onClick={() => setLinking(a)}>Koppelen</button>
                          <button className="btn sm primary" disabled={action.pending} onClick={() => onPromote(a)}>Promoveren tot case</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {linking && (
        <LinkModal alert={linking} onClose={() => setLinking(null)} onDone={(caseId) => { setLinking(null); toast({ title: `Alert gekoppeld aan case #${caseId}`, to: `/cases/${caseId}` }) }} />
      )}
      {national && (
        <NationalModal
          alerts={selectedAlerts}
          onClose={() => setNational(false)}
          onDone={(res) => {
            setNational(false)
            setSelected(new Set())
            toast({ title: `${res.cases.length} aparte cases aangemaakt`, text: 'Eén per getroffen klant.' })
            navigate('/cases')
          }}
        />
      )}
    </div>
  )
}
