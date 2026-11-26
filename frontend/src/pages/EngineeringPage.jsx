// Dashboard security engineers (US-30)
import { useState } from 'react'
import { engineerStats } from '../api/stats'
import { useQuery } from '../lib/hooks'
import { ErrorBox, Loading, Donut } from '../components/ui'

export default function EngineeringPage() {
  const [days, setDays] = useState(30)
  const [tenantId, setTenantId] = useState('')
  const { data, error } = useQuery(() => engineerStats({ days, tenantId: tenantId ? Number(tenantId) : null }), [days, tenantId])

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Detectieregels</h1>
        </div>
        <div className="filters">
          <div className="seg" role="group" aria-label="Periode">
            {[7, 30, 90].map((d) => <button key={d} aria-pressed={days === d} onClick={() => setDays(d)}>{d} dagen</button>)}
          </div>
          <select className="select" value={tenantId} onChange={(e) => setTenantId(e.target.value)} aria-label="Klant">
            <option value="">Alle klanten</option>
            {data?.tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>
      <ErrorBox error={error} />
      {!data ? <Loading /> : (
        <>
          <div className="grid-4">
            <div className="panel kpi"><b>{data.totals.total}</b><span>alerts in {days} dagen</span></div>
            <div className="panel kpi"><b>{data.totals.tp}</b><span>true positives</span></div>
            <div className="panel kpi"><b>{data.totals.fp}</b><span>false positives</span></div>
            <div className="panel kpi donut-wrap" style={{ gap: 10 }}>
              <Donut size={84} label="Aandeel false positives" parts={[{ name: 'ruis', value: data.totals.fp, color: '#9aa8b8' }, { name: 'echt', value: data.totals.tp, color: 'var(--action)' }]} />
              <span>aandeel ruis</span>
            </div>
          </div>
          <section className="panel">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Alerttype</th><th>Bron</th><th className="num">Aantal</th><th className="num">True positive</th><th className="num">False positive</th><th>Aandeel false positive</th></tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.alertType}>
                      <td className="title-cell">{r.alertType}</td>
                      <td>{r.source}</td>
                      <td className="num">{r.total}</td>
                      <td className="num">{r.truePositives}</td>
                      <td className="num">{r.falsePositives}</td>
                      <td>
                        <div className="fp-meter">
                          <div className="bar-track"><div className={`bar-fill ${r.fpPercentage >= 70 ? 'crit' : r.fpPercentage >= 45 ? 'warn' : 'ok'}`} style={{ width: `${r.fpPercentage}%` }} /></div>
                          <b className="num">{r.fpPercentage}%</b>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
