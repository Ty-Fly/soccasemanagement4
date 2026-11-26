// Accountbeheer door de manager (US-04). Nog geen endpoint; mock.
// Kuray's flow sluit hierop aan: een account wordt vooraf aangemaakt,
// daarna stelt de medewerker zelf wachtwoord en 2FA in via /setup-2fa.
import { emit, EVENTS } from './realtime'
import { getDb, mutate, nextId, delay, clone, ValidationError, ConflictError } from './mock/db'
import { assertEmployee } from './mock/scope'

export async function listUsers() {
  await delay()
  assertEmployee()
  const db = getDb()
  return clone(db.users.map((u) => ({ ...u, tenantName: db.tenants.find((t) => t.id === u.tenantId)?.name ?? null })))
}

export async function listTenants() {
  await delay(40)
  return clone(getDb().tenants.map((t) => ({ id: t.id, name: t.name })))
}

export async function createUser({ name, email, role, tenantId }) {
  await delay()
  assertEmployee()
  if (!name.trim() || !email.trim()) throw new ValidationError('Vul naam en e-mailadres in.')
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ValidationError('Dit is geen geldig e-mailadres.')
  if (role === 'Client' && !tenantId) throw new ValidationError('Kies bij welke klant deze klantviewer hoort.')
  const user = mutate((db) => {
    if (db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) throw new ConflictError('Er bestaat al een account met dit e-mailadres.')
    const u = { id: nextId('user'), tenantId: role === 'Client' ? Number(tenantId) : 0, name: name.trim(), email: email.trim().toLowerCase(), role, active: true, twoFactorEnabled: false }
    db.users.push(u)
    return u
  })
  emit(EVENTS.UsersChanged, {})
  return clone(user)
}

// US-04 AC 3: toegewezen cases gaan terug naar de onverdeelde lijst
export async function deactivateUser(id) {
  await delay()
  assertEmployee()
  const released = mutate((db) => {
    const u = db.users.find((x) => x.id === id)
    u.active = false
    const cases = db.cases.filter((c) => c.assignedToUserId === id && c.status !== 'Gesloten')
    for (const c of cases) {
      c.assignedToUserId = null
      db.timeline.push({
        id: nextId('entry'), tenantId: c.tenantId, caseId: c.id, type: 'AssigneeChange',
        content: `${u.name} is gedeactiveerd. Case staat weer bij onverdeeld.`, authorUserId: null, authorName: 'Systeem',
        isInternal: true, direction: null, createdAt: new Date().toISOString(),
      })
    }
    return cases.length
  })
  emit(EVENTS.UsersChanged, {})
  emit(EVENTS.CaseAssigned, {})
  return released
}

export async function reactivateUser(id) {
  await delay()
  mutate((db) => {
    db.users.find((x) => x.id === id).active = true
  })
  emit(EVENTS.UsersChanged, {})
}

// US-28: notificatievoorkeuren van de eigen klant
export async function getNotificationPrefs(tenantId) {
  await delay()
  return clone(getDb().notificationPrefs[tenantId])
}

export async function saveNotificationPrefs(tenantId, prefs) {
  await delay()
  const anyWebhook = ['StatusChange', 'Message', 'FinalReport'].some((k) => prefs[k].webhook)
  if (anyWebhook && !prefs.webhookUrl) throw new ValidationError('Vul een webhook-URL in, of zet webhookmeldingen uit.')
  if (prefs.webhookUrl && !/^https:\/\/\S+$/.test(prefs.webhookUrl)) throw new ValidationError('De webhook-URL moet met https:// beginnen.')
  mutate((db) => {
    db.notificationPrefs[tenantId] = prefs
  })
}
