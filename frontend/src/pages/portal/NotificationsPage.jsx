// US-28: notificatievoorkeuren
import { useState } from 'react'
import { getNotificationPrefs, saveNotificationPrefs } from '../../api/users'
import { useAuth } from '../../auth/AuthContext'
import { useQuery, useAction } from '../../lib/hooks'
import { ErrorBox, Loading } from '../../components/ui'

const EVENT_TYPES = [
  { key: 'StatusChange', label: 'Een incident gaat naar een nieuwe fase' },
  { key: 'Message', label: 'Het SOC stuurt een bericht' },
  { key: 'FinalReport', label: 'Het eindrapport staat klaar' },
]
const CHANNELS = [
  { key: 'portal', label: 'Portaal' },
  { key: 'email', label: 'E-mail' },
  { key: 'webhook', label: 'Eigen applicatie' },
]

export default function NotificationsPage() {
  const { user } = useAuth()
  const { data } = useQuery(() => getNotificationPrefs(user.tenantId), [user.tenantId], { events: ['__none__'] })
  if (!data) return <Loading />
  return <PrefsForm initial={data} tenantId={user.tenantId} />
}

function PrefsForm({ initial, tenantId }) {
  const [prefs, setPrefs] = useState(initial)
  const action = useAction()
  const [saved, setSaved] = useState(false)

  const toggle = (ev, ch) => setPrefs((p) => ({ ...p, [ev]: { ...p[ev], [ch]: !p[ev][ch] } }))

  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <div className="page-head">
        <div>
          <h1>Meldingen</h1>
        </div>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table className="table prefs-table">
            <thead><tr><th>Gebeurtenis</th>{CHANNELS.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>
              {EVENT_TYPES.map((ev) => (
                <tr key={ev.key}>
                  <td>{ev.label}</td>
                  {CHANNELS.map((ch) => (
                    <td key={ch.key}><input type="checkbox" checked={prefs[ev.key][ch.key]} onChange={() => toggle(ev.key, ch.key)} aria-label={`${ev.label} via ${ch.label}`} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel-body stack" style={{ gap: 12 }}>
          <p className="small muted">E-mails bevatten alleen een melding en een link naar het portaal, nooit details van het incident.</p>
          <div className="field">
            <label htmlFor="wh">Webhook-URL van uw eigen applicatie</label>
            <input id="wh" className="input" placeholder="https://" value={prefs.webhookUrl} onChange={(e) => setPrefs({ ...prefs, webhookUrl: e.target.value })} />
            <span className="hint">Het platform stuurt binnen 5 seconden een JSON-bericht naar dit adres. Alleen https-adressen.</span>
          </div>
          <ErrorBox error={action.error} />
          <div className="row">
            <button className="btn primary" disabled={action.pending} onClick={async () => {
              const ok = await action.run(async () => { await saveNotificationPrefs(tenantId, prefs); return true })
              if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
            }}>Voorkeuren opslaan</button>
            {saved && <span className="small muted">Opgeslagen</span>}
          </div>
        </div>
      </section>
    </div>
  )
}
