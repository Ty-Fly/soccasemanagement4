// Alerts: US-05 t/m US-10.
// Functies met een "live"-tak roepen een endpoint aan dat al op een branch bestaat.
import { isLive } from '../config'
import { http } from './http'
import { emit, EVENTS } from './realtime'
import { getDb, mutate, nextId, delay, clone, ConflictError, ValidationError, NotFoundError } from './mock/db'
import { assertEmployee, scoped } from './mock/scope'
import { ALERT_TYPES, makeObservables, freshPlaybook } from './mock/seed'
import { severityRank } from '../lib/format'

const tenantName = (id) => getDb().tenants.find((t) => t.id === id)?.name ?? `Klant ${id}`

// GET /api/alerts?status=Open  (Cheryl, US-05/06)
export async function listAlerts({ status = 'Open' } = {}) {
  if (isLive) {
    const rows = await http(`/api/alerts${status ? `?status=${status}` : ''}`)
    return rows.map((a) => ({ ...a, tenantName: tenantName(a.tenantId), alertType: a.message, observables: [] }))
  }
  await delay()
  assertEmployee()
  return clone(
    scoped(getDb().alerts)
      .filter((a) => !status || a.status === status)
      .map((a) => ({ ...a, tenantName: tenantName(a.tenantId) }))
      .sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || new Date(b.createdAt) - new Date(a.createdAt)),
  )
}

// PATCH /api/alerts/{id}/close  (Filip, US-07)
export async function closeAlert(id) {
  if (isLive) return http(`/api/alerts/${id}/close`, { method: 'PATCH' })
  await delay()
  const user = assertEmployee()
  const result = mutate((db) => {
    const a = db.alerts.find((x) => x.id === id)
    if (!a) throw new NotFoundError()
    if (a.status !== 'Open') throw new ConflictError(`Alert ${id} heeft al status '${a.status}'.`)
    a.status = 'FalsePositive'
    a.closedAt = new Date().toISOString()
    a.closedByUserId = user.userId
    return { id: a.id, tenantId: a.tenantId, status: a.status, closedAt: a.closedAt, closedByUserId: a.closedByUserId }
  })
  emit(EVENTS.AlertClosed, { alertId: id, status: 'FalsePositive' })
  return result
}

function createCaseFromAlert(db, a, now) {
  const type = ALERT_TYPES.find((t) => t.type === a.alertType)
  const c = {
    id: nextId('case'),
    tenantId: a.tenantId, // TenantId komt altijd van de alert
    title: a.alertType || a.message,
    description: `${a.message}. Gedetecteerd door ${a.source}${a.className ? ` (${a.className})` : ''}.`,
    status: 'DetectieEnAnalyse',
    incidentType: type?.incidentType ?? 'overig',
    classification: '',
    impact: '',
    triage: '',
    isFalsePositive: false,
    createdAt: now,
    slaStartAt: a.createdAt,
    slaDeadlineAt: new Date(new Date(a.createdAt).getTime() + 60 * 60_000).toISOString(),
    firstResponseAt: null,
    slaMet: null,
    closedAt: null,
    assignedToUserId: null,
    playbook: freshPlaybook(type?.incidentType ?? 'overig'),
    files: [],
  }
  db.cases.push(c)
  a.status = 'Promoted'
  a.caseId = c.id
  db.timeline.push({
    id: nextId('entry'), tenantId: c.tenantId, caseId: c.id, type: 'AlertLinked',
    content: `Case aangemaakt vanuit alert #${a.id}.`, authorUserId: null, authorName: 'Systeem',
    isInternal: true, direction: null, createdAt: now,
  })
  return c
}

// POST /api/alerts/{id}/promote  (Filip, US-08)
export async function promoteAlert(id) {
  if (isLive) return http(`/api/alerts/${id}/promote`, { method: 'POST' })
  await delay()
  assertEmployee()
  const c = mutate((db) => {
    const a = db.alerts.find((x) => x.id === id)
    if (!a) throw new NotFoundError()
    if (a.status !== 'Open') throw new ConflictError(`Alert ${id} kan niet meer worden gepromoveerd.`)
    return createCaseFromAlert(db, a, new Date().toISOString())
  })
  emit(EVENTS.AlertPromoted, { alertId: id, caseId: c.id })
  emit(EVENTS.CaseCreated, { caseId: c.id })
  return { caseId: c.id, alertId: id, tenantId: c.tenantId, title: c.title, status: c.status, slaStartAt: c.slaStartAt, slaDeadlineAt: c.slaDeadlineAt }
}

// GET /api/alerts/{id}/matching-cases  (Filip, US-09 AC 1)
export async function matchingCases(alertId) {
  if (isLive) return http(`/api/alerts/${alertId}/matching-cases`)
  await delay()
  const db = getDb()
  const a = db.alerts.find((x) => x.id === alertId)
  if (!a) throw new NotFoundError()
  return db.cases
    .filter((c) => c.tenantId === a.tenantId && !c.closedAt && c.status !== 'Gesloten')
    .map((c) => ({ id: c.id, title: c.title, status: c.status, slaDeadlineAt: c.slaDeadlineAt }))
}

// POST /api/alerts/{id}/link  (Filip, US-09 AC 2)
export async function linkAlert(alertId, caseId) {
  if (isLive) return http(`/api/alerts/${alertId}/link`, { method: 'POST', body: { caseId } })
  await delay()
  const user = assertEmployee()
  mutate((db) => {
    const a = db.alerts.find((x) => x.id === alertId)
    const c = db.cases.find((x) => x.id === caseId)
    if (!a || !c) throw new NotFoundError()
    if (a.status !== 'Open') throw new ConflictError('Alert is niet meer open.')
    if (a.tenantId !== c.tenantId) throw new ValidationError('Andere klant is niet toegestaan.')
    if (c.closedAt) throw new ConflictError('Case is al gesloten.')
    a.caseId = c.id
    a.status = 'Linked'
    db.timeline.push({
      id: nextId('entry'), tenantId: c.tenantId, caseId: c.id, type: 'AlertLinked',
      content: `Alert #${a.id} (${a.alertType}) gekoppeld.`, authorUserId: user.userId, authorName: user.name,
      isInternal: true, direction: null, createdAt: new Date().toISOString(),
    })
  })
  emit(EVENTS.AlertLinked, { alertId, caseId })
}

// POST /api/cases/national-incident  (Nuseema, US-10) — één case per getroffen klant, in één transactie
export async function createNationalIncident(alertIds) {
  if (isLive) return http('/api/cases/national-incident', { method: 'POST', body: { alertIds } })
  await delay(250)
  assertEmployee()
  if (!alertIds.length) throw new ValidationError('Selecteer minimaal één alert.')
  const created = mutate((db) => {
    const alerts = alertIds.map((id) => db.alerts.find((a) => a.id === id))
    if (alerts.some((a) => !a || a.status !== 'Open')) throw new ConflictError('Een of meer alerts zijn niet meer open. Er is niets aangemaakt.')
    const now = new Date().toISOString()
    const byTenant = new Map()
    for (const a of alerts) {
      if (!byTenant.has(a.tenantId)) byTenant.set(a.tenantId, [])
      byTenant.get(a.tenantId).push(a)
    }
    const result = []
    for (const [, group] of byTenant) {
      const [first, ...rest] = group
      const c = createCaseFromAlert(db, first, now)
      for (const a of rest) {
        a.status = 'Linked'
        a.caseId = c.id
      }
      result.push({ caseId: c.id, tenantId: c.tenantId, alertIds: group.map((a) => a.id) })
    }
    return result
  })
  for (const c of created) emit(EVENTS.CaseCreated, { caseId: c.caseId })
  return { cases: created }
}

// Alleen voor de demo: bootst de alertsimulator na die naar POST /api/alerts/ingest stuurt (US-05)
export async function simulateAlert() {
  const a = mutate((db) => {
    const type = ALERT_TYPES[Math.floor(Math.random() * ALERT_TYPES.length)]
    const tenant = db.tenants[Math.floor(Math.random() * db.tenants.length)]
    const severities = ['Low', 'Medium', 'High', 'Critical']
    const now = Date.now()
    const alert = {
      id: nextId('alert'),
      tenantId: tenant.id,
      source: type.source,
      className: type.className,
      alertType: type.type,
      message: `${type.type} bij ${tenant.name}`,
      severity: severities[Math.floor(Math.random() * severities.length)],
      status: 'Open',
      createdAt: new Date(now).toISOString(),
      detectedAt: new Date(now - 30_000).toISOString(),
      caseId: null,
      closedAt: null,
      closedByUserId: null,
      observables: makeObservables(type, Math.random),
    }
    db.alerts.push(alert)
    return alert
  })
  emit(EVENTS.AlertReceived, { alertId: a.id, severity: a.severity, tenantId: a.tenantId })
  return a
}
