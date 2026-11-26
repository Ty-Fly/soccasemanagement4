// Accountbeheer door manager (US-04)
import { useState } from 'react'
import { listUsers, listTenants, createUser, deactivateUser, reactivateUser } from '../api/users'
import { useAuth } from '../auth/AuthContext'
import { ROLE_LABELS } from '../config'
import { useQuery, useAction } from '../lib/hooks'
import { ErrorBox, Loading, Modal, Avatar } from '../components/ui'
import { useToast } from '../components/Toasts'

function NewAccountModal({ onClose, onCreated }) {
  const tenants = useQuery(() => listTenants(), [])
  const [form, setForm] = useState({ name: '', email: '', role: 'Analyst', tenantId: '' })
  const action = useAction()
  return (
    <Modal
      title="Account aanmaken"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Annuleren</button>
          <button className="btn primary" disabled={action.pending} onClick={async () => { const u = await action.run(() => createUser(form)); if (u) onCreated(u) }}>
            Account aanmaken
          </button>
        </>
      }
    >
      <div className="field"><label htmlFor="n">Naam</label><input id="n" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div className="field"><label htmlFor="e">E-mailadres</label><input id="e" type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
      <div className="field">
        <label htmlFor="r">Rol</label>
        <select id="r" className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {form.role === 'Client' && (
        <div className="field">
          <label htmlFor="t">Klant</label>
          <select id="t" className="select" value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })}>
            <option value="">Kies een klant</option>
            {tenants.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}
      <p className="small muted">De nieuwe gebruiker krijgt een e-mail met instructies om een wachtwoord en tweestapsverificatie in te stellen.</p>
      <ErrorBox error={action.error} />
    </Modal>
  )
}

export default function AccountsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const { data, error } = useQuery(() => listUsers(), [])
  const [creating, setCreating] = useState(false)
  const action = useAction()
  const [showInactive, setShowInactive] = useState(false)

  const rows = (data || []).filter((u) => showInactive || u.active)

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Accounts</h1>
        </div>
        <div className="row">
          <label className="row small"><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Gedeactiveerde tonen</label>
          <button className="btn primary" onClick={() => setCreating(true)}>Account aanmaken</button>
        </div>
      </div>
      <ErrorBox error={error || action.error} />
      {!data ? <Loading /> : (
        <section className="panel">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Naam</th><th>Rol</th><th>Klant</th><th>2FA</th><th>Status</th><th /></tr></thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td><div className="row" style={{ gap: 10 }}><Avatar name={u.name} /><div><div className="title-cell">{u.name}</div><div className="small muted">{u.email}</div></div></div></td>
                    <td>{ROLE_LABELS[u.role]}</td>
                    <td>{u.tenantName ?? <span className="muted">SOC</span>}</td>
                    <td>{u.twoFactorEnabled ? 'Ingesteld' : <span className="muted">Wacht op instellen</span>}</td>
                    <td>{u.active ? <span className="badge st-ok">Actief</span> : <span className="badge st-neutral">Gedeactiveerd</span>}</td>
                    <td>
                      <div className="actions">
                        {u.active && u.id !== user.userId && (
                          <button className="btn sm danger" disabled={action.pending} onClick={async () => {
                            const n = await action.run(() => deactivateUser(u.id))
                            if (n !== undefined) toast({ title: `${u.name} gedeactiveerd`, text: n ? `${n} case${n > 1 ? 's' : ''} terug naar onverdeeld.` : 'Er waren geen toegewezen cases.' })
                          }}>Deactiveren</button>
                        )}
                        {!u.active && <button className="btn sm" onClick={() => action.run(() => reactivateUser(u.id))}>Activeren</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {creating && <NewAccountModal onClose={() => setCreating(false)} onCreated={(u) => { setCreating(false); toast({ title: `Account aangemaakt voor ${u.name}`, text: `Instructies verstuurd naar ${u.email}.` }) }} />}
    </div>
  )
}
