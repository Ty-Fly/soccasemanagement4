// Overzicht van cases met SLA-status (US-15) en oppakken (US-11)
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { listCases, claimCase } from '../api/cases'
import { useAuth } from '../auth/AuthContext'
import { useQuery, useAction, useNow } from '../lib/hooks'
import { slaState } from '../lib/sla'
import { formatDateTime } from '../lib/format'
import { SlaChip, NistBadge, TenantLogo, Empty, ErrorBox, Loading } from '../components/ui'

const FILTERS = [
  { key: 'all', label: 'Alle open' },
  { key: 'mine', label: 'Mijn cases' },
  { key: 'unassigned', label: 'Onverdeeld' },
  { key: 'closed', label: 'Gesloten' },
]

export default function CasesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const { data, error, loading } = useQuery(() => listCases({ includeClosed: true }), [])
  const action = useAction()
  const now = useNow(5000)

  const rows = useMemo(() => {
    const list = (data || []).filter((c) => {
      if (filter === 'closed') return c.status === 'Gesloten'
      if (c.status === 'Gesloten') return false
      if (filter === 'mine') return c.assignedToUserId === user.userId
      if (filter === 'unassigned') return !c.assignedToUserId
      return true
    })
    // US-15 AC 1: kortste resterende tijd eerst; gestopte timers daarna
    return list.sort((a, b) => {
      if (filter === 'closed') return new Date(b.closedAt) - new Date(a.closedAt)
      return slaState(a, now).remainingMs - slaState(b, now).remainingMs || new Date(b.createdAt) - new Date(a.createdAt)
    })
  }, [data, filter, user.userId, now])

  const canClaim = user.role !== 'AccountManager'

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Cases</h1>
        </div>
        <div className="seg" role="group" aria-label="Filter cases">
          {FILTERS.map((f) => (
            <button key={f.key} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</button>
          ))}
        </div>
      </div>

      <section className="panel">
        <ErrorBox error={error || action.error} />
        {loading && !data ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty title={filter === 'mine' ? 'Je hebt geen open cases' : 'Geen cases in deze lijst'}>
            {filter === 'mine' ? 'Pak een onverdeelde case op of promoveer een alert.' : null}
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>SLA</th>
                  <th>Case</th>
                  <th>Klant</th>
                  <th>Status</th>
                  <th>Behandelaar</th>
                  <th>{filter === 'closed' ? 'Gesloten' : 'Aangemaakt'}</th>
                  <th><span className="sr-only">Acties</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="clickable" onClick={() => navigate(`/cases/${c.id}`)}>
                    <td><SlaChip caseItem={c} /></td>
                    <td className="title-cell">
                      <Link to={`/cases/${c.id}`} onClick={(e) => e.stopPropagation()}>#{c.id} {c.title}</Link>
                      <div className="small muted">{c.alertCount} {c.alertCount === 1 ? 'alert' : 'alerts'}{c.isFalsePositive ? ', false positive' : ''}</div>
                    </td>
                    <td><span className="tenant-cell"><TenantLogo tenant={c.tenant} size="sm" />{c.tenantName}</span></td>
                    <td><NistBadge status={c.status} /></td>
                    <td>{c.assignedToName ?? <span className="muted">Onverdeeld</span>}</td>
                    <td className="num">{formatDateTime(filter === 'closed' ? c.closedAt : c.createdAt)}</td>
                    <td>
                      <div className="actions">
                        {!c.assignedToUserId && c.status !== 'Gesloten' && canClaim && (
                          <button className="btn sm primary" disabled={action.pending} onClick={(e) => { e.stopPropagation(); action.run(() => claimCase(c.id)) }}>
                            Oppakken
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
