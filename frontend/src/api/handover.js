// Overdrachtsrapport: US-22 en US-23.
// Backend (Emma): GET /api/handover-reports/active-shift en POST /api/handover-reports/{id}/items.
// Die vormen wijken nog af (geen shiftnaam, geen gekoppelde cases bij aanmaken), dus voorlopig mock.
import { emit, EVENTS } from './realtime'
import { getDb, mutate, nextId, delay, clone, ValidationError } from './mock/db'
import { assertEmployee } from './mock/scope'
import { currentShift } from '../lib/shifts'

function ensureCurrentReport(db) {
  const shift = currentShift()
  let report = db.handoverReports.find((r) => r.startsAt === shift.startsAt)
  if (!report) {
    report = { id: nextId('handoverReport'), shift: shift.name, startsAt: shift.startsAt, endsAt: shift.endsAt, items: [] }
    db.handoverReports.push(report)
  }
  return report
}

export async function getShiftOverview() {
  await delay()
  assertEmployee()
  const current = mutate(ensureCurrentReport)
  const db = getDb()
  const sorted = [...db.handoverReports].sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt))
  const previous = sorted.find((r) => new Date(r.startsAt) < new Date(current.startsAt)) ?? null
  // US-22 AC 3: open cases van de shift voorgesteld
  const suggestedOpenCases = db.cases
    .filter((c) => c.status !== 'Gesloten')
    .map((c) => ({ id: c.id, title: c.title, tenantName: db.tenants.find((t) => t.id === c.tenantId)?.name }))
  return clone({ current, previous, suggestedOpenCases, tenants: db.tenants.map((t) => ({ id: t.id, name: t.name })) })
}

export async function listReports() {
  await delay()
  assertEmployee()
  return clone([...getDb().handoverReports].sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt)))
}

export async function addHandoverItem(reportId, { category, text, clientId, linkedCaseIds }) {
  await delay()
  const user = assertEmployee()
  if (!text.trim()) throw new ValidationError('Beschrijf wat de volgende ploeg moet weten.')
  mutate((db) => {
    const report = db.handoverReports.find((r) => r.id === reportId)
    report.items.push({
      id: nextId('handoverItem'), category, text: text.trim(), author: user.name,
      createdAt: new Date().toISOString(), clientId: clientId || null, linkedCaseIds: linkedCaseIds || [],
    })
  })
  emit(EVENTS.HandoverUpdated, { reportId })
}
