// Dashboards: US-30 (security engineers) en US-31 (managers). Alleen mock, nog geen endpoints.
import { getDb, delay } from './mock/db'
import { assertEmployee } from './mock/scope'

const DAY = 86_400_000

// US-30: per alerttype aantal, TP (gepromoveerd/gekoppeld), FP en % FP; slechtste regels bovenaan
export async function engineerStats({ days = 30, tenantId = null } = {}) {
  await delay()
  assertEmployee()
  const db = getDb()
  const since = Date.now() - days * DAY
  const rows = new Map()
  for (const a of db.alerts) {
    if (new Date(a.createdAt).getTime() < since) continue
    if (tenantId && a.tenantId !== tenantId) continue
    const key = a.alertType || a.message
    if (!rows.has(key)) rows.set(key, { alertType: key, source: a.source, total: 0, truePositives: 0, falsePositives: 0, open: 0 })
    const r = rows.get(key)
    r.total++
    if (a.status === 'FalsePositive') r.falsePositives++
    else if (a.status === 'Open') r.open++
    else r.truePositives++
  }
  const list = [...rows.values()].map((r) => {
    const judged = r.truePositives + r.falsePositives
    return { ...r, fpPercentage: judged ? Math.round((r.falsePositives / judged) * 100) : 0 }
  })
  list.sort((a, b) => b.fpPercentage - a.fpPercentage)
  const totals = list.reduce((acc, r) => ({ total: acc.total + r.total, tp: acc.tp + r.truePositives, fp: acc.fp + r.falsePositives }), { total: 0, tp: 0, fp: 0 })
  return { rows: list, totals, tenants: db.tenants.map((t) => ({ id: t.id, name: t.name })) }
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d - yearStart) / DAY + 1) / 7)
}

// US-31: behandeltijd per week, SLA per klant, open cases per analist
export async function managerStats() {
  await delay()
  assertEmployee()
  const db = getDb()
  const now = Date.now()

  const closed = db.cases.filter((c) => c.closedAt && !c.isFalsePositive && now - new Date(c.closedAt) < 8 * 7 * DAY)
  const weeks = new Map()
  for (const c of closed) {
    const w = isoWeek(new Date(c.closedAt))
    if (!weeks.has(w)) weeks.set(w, { week: w, count: 0, hours: 0 })
    const row = weeks.get(w)
    row.count++
    row.hours += (new Date(c.closedAt) - new Date(c.createdAt)) / 3_600_000
  }
  const handlingPerWeek = [...weeks.values()]
    .map((w) => ({ week: `Wk ${w.week}`, weekNumber: w.week, avgHours: Math.round((w.hours / w.count) * 10) / 10, count: w.count }))
    .sort((a, b) => a.weekNumber - b.weekNumber)

  const slaPerTenant = db.tenants.map((t) => {
    const measured = db.cases.filter((c) => c.tenantId === t.id && c.firstResponseAt)
    const missed = measured.filter((c) => !c.slaMet)
    return {
      tenantId: t.id,
      tenantName: t.name,
      measured: measured.length,
      met: measured.length - missed.length,
      percentage: measured.length ? Math.round(((measured.length - missed.length) / measured.length) * 100) : 100,
      missedCases: missed.slice(-6).map((c) => ({ id: c.id, title: c.title, closedAt: c.closedAt })),
    }
  })

  const open = db.cases.filter((c) => c.status !== 'Gesloten')
  const analysts = db.users.filter((u) => ['Analyst', 'SecurityEngineer'].includes(u.role) && u.active)
  const openPerAnalyst = [
    ...analysts.map((u) => ({ userId: u.id, name: u.name, open: open.filter((c) => c.assignedToUserId === u.id).length })),
    { userId: null, name: 'Onverdeeld', open: open.filter((c) => !c.assignedToUserId).length },
  ]

  const incidentsPerTenant = db.tenants.map((t) => ({
    tenantName: t.name,
    last30: db.cases.filter((c) => c.tenantId === t.id && now - new Date(c.createdAt) < 30 * DAY && !c.isFalsePositive).length,
  }))

  const allHours = closed.reduce((s, c) => s + (new Date(c.closedAt) - new Date(c.createdAt)) / 3_600_000, 0)
  const allMeasured = slaPerTenant.reduce((s, t) => s + t.measured, 0)
  const allMet = slaPerTenant.reduce((s, t) => s + t.met, 0)

  return {
    kpis: {
      avgHandlingHours: closed.length ? Math.round((allHours / closed.length) * 10) / 10 : 0,
      slaPercentage: allMeasured ? Math.round((allMet / allMeasured) * 100) : 100,
      openCases: open.length,
      unassigned: open.filter((c) => !c.assignedToUserId).length,
    },
    handlingPerWeek,
    slaPerTenant,
    openPerAnalyst,
    incidentsPerTenant,
  }
}
