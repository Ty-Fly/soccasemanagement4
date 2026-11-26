// Klantscheiding in de mock (spiegel van wat de backend afdwingt, US-01).
// Een klantviewer krijgt alleen records met de eigen tenantId; anders 404.
import { getSession } from '../../auth/session'
import { NotFoundError } from './db'

export function currentUser() {
  const s = getSession()
  if (!s) throw Object.assign(new Error('Niet ingelogd'), { status: 401 })
  return s
}

export function isClient() {
  return currentUser().role === 'Client'
}

export function scoped(records) {
  const user = currentUser()
  if (user.role !== 'Client') return records
  return records.filter((r) => r.tenantId === user.tenantId)
}

export function assertVisible(record) {
  if (!record) throw new NotFoundError()
  const user = currentUser()
  if (user.role === 'Client' && record.tenantId !== user.tenantId) throw new NotFoundError()
  return record
}

export function assertEmployee() {
  const user = currentUser()
  if (user.role === 'Client') throw Object.assign(new Error('Geen toegang'), { status: 403 })
  return user
}
