// Cases: US-11 t/m US-21 en US-27.
// Nog geen GET-endpoints voor cases in de backend: lijst en detail komen uit de mock.
import { isLive } from '../config'
import { http } from './http'
import { emit, EVENTS } from './realtime'
import { getDb, mutate, nextId, delay, clone, ConflictError, ValidationError, NotFoundError } from './mock/db'
import { assertEmployee, assertVisible, currentUser, scoped } from './mock/scope'
import { PLAYBOOKS } from './mock/playbooks'
import { NIST_STATUSES, nistLabel } from '../lib/format'

const MAX_FILE = 25 * 1024 * 1024
const fileBlobs = new Map() // geüploade bestanden in deze tab

function enrich(db, c) {
  const tenant = db.tenants.find((t) => t.id === c.tenantId)
  const assignee = db.users.find((u) => u.id === c.assignedToUserId)
  return { ...c, tenantName: tenant?.name, tenant, assignedToName: assignee?.name ?? null, alertCount: db.alerts.filter((a) => a.caseId === c.id).length }
}

function addEntry(db, c, type, content, user, extra = {}) {
  const entry = {
    id: nextId('entry'), tenantId: c.tenantId, caseId: c.id, type, content,
    authorUserId: user?.userId ?? null, authorName: user?.name ?? 'Systeem',
    isInternal: true, direction: null, createdAt: new Date().toISOString(), ...extra,
  }
  db.timeline.push(entry)
  return entry
}

export async function listCases({ includeClosed = false } = {}) {
  await delay()
  assertEmployee()
  const db = getDb()
  return clone(
    db.cases
      .filter((c) => (includeClosed ? !c.historical : c.status !== 'Gesloten'))
      .map((c) => enrich(db, c)),
  )
}

export async function getCase(id) {
  await delay(80)
  const db = getDb()
  const c = assertVisible(db.cases.find((x) => x.id === id))
  const alerts = db.alerts.filter((a) => a.caseId === id)
  // US-12 AC 3: iedere unieke observable één keer
  const seen = new Map()
  for (const a of alerts) {
    for (const o of a.observables || []) {
      const key = `${o.type}|${o.value}`
      if (!seen.has(key)) seen.set(key, { ...o, alertIds: [a.id] })
      else seen.get(key).alertIds.push(a.id)
    }
  }
  return clone({ ...enrich(db, c), alerts, observables: [...seen.values()], playbookDef: PLAYBOOKS[c.playbook?.key] ?? PLAYBOOKS.overig })
}

export async function getTimeline(caseId) {
  await delay(60)
  const db = getDb()
  assertVisible(db.cases.find((x) => x.id === caseId))
  const client = currentUser().role === 'Client'
  return clone(
    db.timeline
      .filter((e) => e.caseId === caseId && (!client || !e.isInternal)) // US-18 AC 3
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
  )
}

export async function listColleagues() {
  await delay(40)
  return clone(getDb().users.filter((u) => u.role !== 'Client' && u.active))
}

// PATCH /api/cases/{id}/claim  (Filip, US-11)
export async function claimCase(id) {
  if (isLive) return http(`/api/cases/${id}/claim`, { method: 'PATCH' })
  await delay()
  const user = assertEmployee()
  mutate((db) => {
    const c = db.cases.find((x) => x.id === id)
    if (!c) throw new NotFoundError()
    if (c.status === 'Gesloten') throw new ConflictError('Gesloten case kan niet worden opgepakt.')
    if (c.assignedToUserId) throw new ConflictError('Case is al toegewezen aan een behandelaar.')
    c.assignedToUserId = user.userId
    addEntry(db, c, 'AssigneeChange', `Case opgepakt door ${user.name}.`, user)
  })
  emit(EVENTS.CaseAssigned, { caseId: id, assignedToUserId: user.userId })
}

// PATCH /api/cases/{id}/assign  (Filip, US-11)
export async function assignCase(id, userId) {
  if (isLive) return http(`/api/cases/${id}/assign`, { method: 'PATCH', body: { userId } })
  await delay()
  const user = assertEmployee()
  mutate((db) => {
    const c = db.cases.find((x) => x.id === id)
    const target = db.users.find((u) => u.id === userId)
    if (!c || !target) throw new NotFoundError()
    if (target.role === 'Client') throw new ValidationError('Een case kan niet aan een klant worden toegewezen.')
    c.assignedToUserId = target.id
    addEntry(db, c, 'AssigneeChange', `Case overgedragen aan ${target.name}.`, user)
  })
  emit(EVENTS.CaseAssigned, { caseId: id, assignedToUserId: userId })
}

// PATCH /api/cases/{id}/close-false-positive  (Filip, US-09 AC 3)
export async function closeCaseAsFalsePositive(id) {
  if (isLive) return http(`/api/cases/${id}/close-false-positive`, { method: 'PATCH' })
  await delay()
  const user = assertEmployee()
  mutate((db) => {
    const c = db.cases.find((x) => x.id === id)
    if (!c) throw new NotFoundError()
    const now = new Date().toISOString()
    c.status = 'Gesloten'
    c.isFalsePositive = true
    c.closedAt = now
    for (const a of db.alerts.filter((x) => x.caseId === id)) {
      a.status = 'FalsePositive'
      a.closedAt = now
    }
    addEntry(db, c, 'StatusChange', 'Case gesloten als false positive.', user)
  })
  emit(EVENTS.CaseClosed, { caseId: id, isFalsePositive: true })
}

// US-17: triage, classificatie en impact
export async function updateCaseDetails(id, { triage, classification, impact }) {
  await delay()
  const user = assertEmployee()
  mutate((db) => {
    const c = db.cases.find((x) => x.id === id)
    if (!c) throw new NotFoundError()
    const changes = []
    if (classification !== c.classification) changes.push(`classificatie: ${classification || '–'}`)
    if (impact !== c.impact) changes.push(`impact: ${impact || '–'}`)
    Object.assign(c, { triage, classification, impact })
    if (changes.length) addEntry(db, c, 'Other', `Triage bijgewerkt (${changes.join(', ')}).`, user, { isInternal: false })
  })
  emit(EVENTS.CaseUpdated, { caseId: id })
}

// US-17 AC 1–3: vaste volgorde, Containment vereist classificatie en impact
export async function changeStatus(id, status) {
  await delay()
  const user = assertEmployee()
  mutate((db) => {
    const c = db.cases.find((x) => x.id === id)
    if (!c) throw new NotFoundError()
    const from = NIST_STATUSES.findIndex((s) => s.key === c.status)
    const to = NIST_STATUSES.findIndex((s) => s.key === status)
    if (to !== from + 1) throw new ValidationError(`Vanaf "${nistLabel(c.status)}" kan de case alleen naar "${NIST_STATUSES[from + 1]?.label}".`)
    if (to >= 1) {
      const missing = [!c.classification && 'classificatie', !c.impact && 'businessimpact'].filter(Boolean)
      if (missing.length) throw new ValidationError(`Vul eerst ${missing.join(' en ')} in voordat de case naar ${nistLabel(status)} gaat.`)
    }
    c.status = status
    if (status === 'Gesloten') c.closedAt = new Date().toISOString()
    addEntry(db, c, 'StatusChange', `Status gewijzigd naar ${nistLabel(status)}.`, user, { isInternal: false })
  })
  emit(EVENTS.CaseUpdated, { caseId: id, status })
}

// US-18: notitie (intern, niet verwijderbaar)
export async function addNote(id, text) {
  await delay()
  const user = assertEmployee()
  if (!text.trim()) throw new ValidationError('Schrijf eerst een notitie.')
  mutate((db) => addEntry(db, db.cases.find((x) => x.id === id), 'Note', text.trim(), user))
  emit(EVENTS.CaseUpdated, { caseId: id })
}

// US-27 + US-16: bericht van het SOC aan de klant; het eerste stopt de SLA-timer
// US-26: bericht van de klant aan het SOC
export async function sendMessage(id, text) {
  await delay()
  const user = currentUser()
  if (!text.trim()) throw new ValidationError('Schrijf eerst een bericht.')
  const fromClient = user.role === 'Client'
  const db = getDb()
  assertVisible(db.cases.find((x) => x.id === id))
  const stoppedSla = mutate((db) => {
    const c = db.cases.find((x) => x.id === id)
    addEntry(db, c, 'Message', text.trim(), user, { isInternal: false, direction: fromClient ? 'fromClient' : 'toClient' })
    if (!fromClient && !c.firstResponseAt) {
      c.firstResponseAt = new Date().toISOString()
      c.slaMet = new Date(c.firstResponseAt) <= new Date(c.slaDeadlineAt)
      return true
    }
    return false
  })
  const c = db.cases.find((x) => x.id === id)
  emit(EVENTS.MessageReceived, { caseId: id, fromClient, assignedToUserId: c.assignedToUserId, tenantId: c.tenantId })
  return { stoppedSla }
}

// US-19: stap afvinken
export async function completeStep(id, stepId) {
  await delay()
  const user = assertEmployee()
  mutate((db) => {
    const c = db.cases.find((x) => x.id === id)
    const step = c.playbook.steps.find((s) => s.id === stepId)
    const def = (PLAYBOOKS[c.playbook.key] ?? PLAYBOOKS.overig).steps.find((s) => s.id === stepId)
    Object.assign(step, { status: 'done', by: user.name, at: new Date().toISOString() })
    addEntry(db, c, 'PlaybookStep', `Playbookstap afgerond: ${def.title}.`, user)
  })
  emit(EVENTS.CaseUpdated, { caseId: id })
}

// US-20: stap overslaan alleen met reden van minimaal 10 tekens
export async function skipStep(id, stepId, reason) {
  await delay()
  const user = assertEmployee()
  if (!reason || reason.trim().length < 10) throw new ValidationError('Geef een reden van minimaal 10 tekens om deze stap over te slaan.')
  mutate((db) => {
    const c = db.cases.find((x) => x.id === id)
    const step = c.playbook.steps.find((s) => s.id === stepId)
    const def = (PLAYBOOKS[c.playbook.key] ?? PLAYBOOKS.overig).steps.find((s) => s.id === stepId)
    Object.assign(step, { status: 'skipped', by: user.name, at: new Date().toISOString(), reason: reason.trim() })
    addEntry(db, c, 'PlaybookStep', `Playbookstap overgeslagen: ${def.title}. Reden: ${reason.trim()}`, user)
  })
  emit(EVENTS.CaseUpdated, { caseId: id })
}

// US-21: alleen PDF tot 25 MB
export async function uploadFile(id, file) {
  await delay(200)
  const user = assertEmployee()
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!isPdf) throw new ValidationError(`"${file.name}" is geen PDF. Alleen PDF-bestanden worden geaccepteerd.`)
  if (file.size > MAX_FILE) throw new ValidationError(`"${file.name}" is groter dan 25 MB.`)
  const fileId = mutate((db) => {
    const c = db.cases.find((x) => x.id === id)
    const f = { id: nextId('file'), name: file.name, size: file.size, isFinalReport: false, uploadedAt: new Date().toISOString(), uploadedBy: user.name }
    c.files.push(f) // krijgt automatisch de tenantId van de case (US-21 AC 3)
    addEntry(db, c, 'Other', `Bestand toegevoegd: ${file.name}.`, user)
    return f.id
  })
  fileBlobs.set(fileId, file)
  emit(EVENTS.CaseUpdated, { caseId: id })
}

export async function setFinalReport(id, fileId) {
  await delay()
  const user = assertEmployee()
  mutate((db) => {
    const c = db.cases.find((x) => x.id === id)
    for (const f of c.files) f.isFinalReport = f.id === fileId
    const f = c.files.find((x) => x.id === fileId)
    addEntry(db, c, 'Other', `Eindrapport gedeeld met de klant: ${f.name}.`, user, { isInternal: false })
  })
  emit(EVENTS.CaseUpdated, { caseId: id })
}

// Alleen voor de demo: zet een voorbeeld-eindrapport klaar en deel het met de klant (geen PDF van je laptop nodig)
export async function addDemoFinalReport(id) {
  await delay(200)
  const user = assertEmployee()
  mutate((db) => {
    const c = db.cases.find((x) => x.id === id)
    for (const f of c.files) f.isFinalReport = false
    const name = `Eindrapport-case-${c.id}.pdf`
    c.files.push({ id: nextId('file'), name, size: 186_000, isFinalReport: true, uploadedAt: new Date().toISOString(), uploadedBy: user.name })
    addEntry(db, c, 'Other', `Eindrapport gedeeld met de klant: ${name}.`, user, { isInternal: false })
  })
  emit(EVENTS.CaseUpdated, { caseId: id })
}

// Download: klant krijgt alleen het eindrapport van de eigen case (US-29), anders 404
export async function downloadFile(caseId, fileId) {
  const db = getDb()
  const c = assertVisible(db.cases.find((x) => x.id === caseId))
  const f = c.files.find((x) => x.id === fileId)
  if (!f || (currentUser().role === 'Client' && !f.isFinalReport)) throw new NotFoundError()
  const blob = fileBlobs.get(fileId) ?? demoPdf(c, f)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = f.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// Een minimale, geldige PDF zodat de download in de demo echt opent
function demoPdf(c, f) {
  const lines = [`Eindrapport case #${c.id}`, c.title, `Classificatie: ${c.classification || '-'}`, `Impact: ${c.impact || '-'}`, `Bestand: ${f.name}`]
  const esc = (s) => s.normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/([()\\])/g, '\\$1')
  const text = lines.map((l, i) => `BT /F1 ${i === 0 ? 18 : 12} Tf 72 ${740 - i * 24} Td (${esc(l)}) Tj ET`).join('\n')
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = []
  objs.forEach((o, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([pdf], { type: 'application/pdf' })
}

// US-24: cases van de eigen klant (klantportaal)
export async function listMyCases() {
  await delay()
  const db = getDb()
  return clone(
    scoped(db.cases)
      .filter((c) => !c.historical)
      .map((c) => ({ id: c.id, title: c.title, status: c.status, classification: c.classification, impact: c.impact, createdAt: c.createdAt, closedAt: c.closedAt, hasFinalReport: c.files.some((f) => f.isFinalReport) }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  )
}

// US-25: wat de klant van een case mag zien (geen observables, notities, keystore)
export async function getMyCase(id) {
  await delay(80)
  const db = getDb()
  const c = assertVisible(db.cases.find((x) => x.id === id))
  return clone({
    id: c.id, title: c.title, description: c.description, status: c.status, triage: c.triage,
    classification: c.classification, impact: c.impact, createdAt: c.createdAt, closedAt: c.closedAt,
    finalReport: c.files.find((f) => f.isFinalReport) ?? null,
  })
}
