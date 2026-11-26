// Dashboard managers (US-31)
import { Link } from 'react-router'
import { managerStats } from '../api/stats'
import { useQuery } from '../lib/hooks'
import { ErrorBox, Loading } from '../components/ui'
import { formatDate } from '../lib/format'

const nl = (n) => n.toLocaleString('nl-NL')

export default function ManagementPage() {
  const { data, error } = useQuery(() => managerStats(), [])
  if (error) return <ErrorBox error={error} />
  if (!data) return <Loading />
  const maxHours = Math.max(1, ...data.handlingPerWeek.map((w) => w.avgHours))
  const maxOpen = Math.max(1, ...data.openPerAnalyst.map((a) => a.open))

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Management</h1>
        </div>
      </div>

      <div className="grid-4">
        <div className="panel kpi"><b>{nl(data.kpis.avgHandlingHours)} uur</b><span>gemiddelde behandeltijd, 8 weken</span></div>
        <div className="panel kpi"><b>{data.kpis.slaPercentage}%</b><span>SLA's gehaald</span></div>
        <div className="panel kpi"><b>{data.kpis.openCases}</b><span>open cases</span></div>
        <div className="panel kpi"><b>{data.kpis.unassigned}</b><span>nog niet opgepakt</span></div>
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head"><h2>Gemiddelde behandeltijd per week</h2><span className="small muted">openen tot sluiten, in uren</span></div>
          <div className="panel-body">
            <div className="colchart" role="img" aria-label="Behandeltijd per week">
              {data.handlingPerWeek.map((w) => (
                <div key={w.week} className="col" title={`${w.count} cases`}>
                  <span className="col-val">{nl(w.avgHours)}</span>
                  <div className="col-bar" style={{ height: `${(w.avgHours / maxHours) * 130}px` }} />
                  <span className="muted">{w.week}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Open cases per analist</h2></div>
          <div className="panel-body bars">
            {data.openPerAnalyst.map((a) => (
              <div key={a.name} className="bar-row">
                <span>{a.name}</span>
                <div className="bar-track"><div className={`bar-fill ${a.userId === null ? 'warn' : ''}`} style={{ width: `${(a.open / maxOpen) * 100}%` }} /></div>
                <b className="num">{a.open}</b>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>SLA per klant</h2><span className="small muted">eerste klantcontact binnen 60 minuten</span></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Klant</th><th>Gehaald</th><th className="num">Gemeten</th><th>Incidenten, 30 dagen</th><th>Overschreden cases</th></tr></thead>
            <tbody>
              {data.slaPerTenant.map((t) => (
                <tr key={t.tenantId}>
                  <td className="title-cell">{t.tenantName}</td>
                  <td>
                    <div className="fp-meter">
                      <div className="bar-track"><div className={`bar-fill ${t.percentage >= 90 ? 'ok' : t.percentage >= 75 ? 'warn' : 'crit'}`} style={{ width: `${t.percentage}%` }} /></div>
                      <b className="num">{t.percentage}%</b>
                    </div>
                  </td>
                  <td className="num">{t.measured}</td>
                  <td className="num">{data.incidentsPerTenant.find((i) => i.tenantName === t.tenantName)?.last30}</td>
                  <td>
                    {t.missedCases.length === 0 ? <span className="muted">Geen</span> : (
                      <div className="row small">
                        {t.missedCases.map((c) => <Link key={c.id} to={`/cases/${c.id}`} title={`${c.title}, ${formatDate(c.closedAt)}`}>#{c.id}</Link>)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
