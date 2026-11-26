// De demo-store: één JSON-object in localStorage, gedeeld tussen tabs.
// Iedere mutatie slaat op en stuurt een realtime-event (zie realtime.js).
import { buildSeed } from './seed'
import { subscribe } from '../realtime'

const KEY = 'soc.mockdb'
let db = load()

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === 4) return parsed
    }
  } catch {
    /* corrupte store: opnieuw seeden */
  }
  const fresh = buildSeed()
  localStorage.setItem(KEY, JSON.stringify(fresh))
  return fresh
}

// Andere tab heeft iets gewijzigd: opnieuw inlezen
subscribe((_name, _payload, remote) => {
  if (remote) db = load()
})

export function getDb() {
  return db
}

export function mutate(fn) {
  const result = fn(db)
  localStorage.setItem(KEY, JSON.stringify(db))
  return result
}

export function nextId(counter) {
  const id = db.counters[counter]
  db.counters[counter] = id + 1
  return id
}

export function resetDb() {
  localStorage.removeItem(KEY)
  db = load()
}

// Een kleine vertraging maakt laadstatussen zichtbaar en voelt als een echte API
export const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms))

export function clone(v) {
  return structuredClone(v)
}

// Simuleert een 404 zoals de backend doet bij klantscheiding (US-01 AC 1)
export class NotFoundError extends Error {
  constructor() {
    super('Niet gevonden')
    this.status = 404
  }
}
export class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.status = 400
  }
}
export class ConflictError extends Error {
  constructor(message) {
    super(message)
    this.status = 409
  }
}
