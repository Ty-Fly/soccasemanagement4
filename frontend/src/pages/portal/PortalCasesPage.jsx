// US-24: eigen incidentoverzicht
import { useNavigate, Link } from 'react-router'
import { listMyCases } from '../../api/cases'
import { useQuery } from '../../lib/hooks'
import { formatDateTime } from '../../lib/format'
import { NistBadge, Empty, ErrorBox, Loading } from '../../components/ui'

export default function PortalCasesPage() {
  const navigate = useNavigate()
  const { data, error } = useQuery(() => listMyCases(), [])
  const open = (data || []).filter((c) => c.status !== 'Gesloten')
  const closed = (data || []).filter((c) => c.status === 'Gesloten')

  const table = (rows, isClosed) => (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>Incident</th><th>Fase</th><th>Classificatie</th><th>Impact</th><th>{isClosed ? 'Gesloten' : 'Gemeld'}</th></tr></thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="clickable" onClick={() => navigate(`/portal/cases/${c.id}`)}>
              <td className="title-cell"><Link to={`/portal/cases/${c.id}`} onClick={(e) => e.stopPropagation()}>#{c.id} {c.title}</Link>{c.hasFinalReport && <span className="tag public">Eindrapport</span>}</td>
              <td><NistBadge status={c.status} /></td>
              <td>{c.classification || <span className="muted">Wordt onderzocht</span>}</td>
              <td>{c.impact || <span className="muted">Wordt ingeschat</span>}</td>
              <td className="num">{formatDateTime(isClosed ? c.closedAt : c.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Mijn incidenten</h1>
        </div>
      </div>
      <ErrorBox error={error} />
      {!data ? <Loading /> : (
        <>
          <section className="panel">
            <div className="panel-head"><h2>Lopend</h2><span className="small muted">{open.length}</span></div>
            {open.length ? table(open, false) : <Empty title="Geen lopende incidenten">Zodra het SOC een incident voor u opent, ziet u het hier.</Empty>}
          </section>
          <section className="panel">
            <div className="panel-head"><h2>Afgerond</h2><span className="small muted">{closed.length}</span></div>
            {closed.length ? table(closed, true) : <Empty title="Nog geen afgeronde incidenten" />}
          </section>
        </>
      )}
    </div>
  )
}
