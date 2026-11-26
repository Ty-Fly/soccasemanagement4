// SLA-regels uit US-14: groen > 30 min, oranje 30–10, rood < 10, daarna "Verlopen".
// De timer rekent altijd vanaf slaDeadlineAt uit de backend, nooit vanaf de browserklok-start.
export function slaState(caseItem, now = Date.now()) {
  const deadline = new Date(caseItem.slaDeadlineAt).getTime()

  if (caseItem.firstResponseAt) {
    const responded = new Date(caseItem.firstResponseAt).getTime()
    const met = caseItem.slaMet ?? responded <= deadline
    const usedMs = responded - new Date(caseItem.slaStartAt).getTime()
    return {
      level: met ? 'met' : 'missed',
      label: met ? 'SLA gehaald' : 'SLA niet gehaald',
      clock: formatClock(usedMs),
      detail: `Eerste reactie na ${Math.round(usedMs / 60_000)} min`,
      remainingMs: Infinity,
      stopped: true,
    }
  }

  const remainingMs = deadline - now
  if (remainingMs <= 0) {
    const over = Math.floor(-remainingMs / 60_000)
    return { level: 'expired', label: 'Verlopen', clock: `+${formatClock(-remainingMs)}`, detail: `${over} min over de deadline`, remainingMs, stopped: false }
  }
  const min = remainingMs / 60_000
  if (min > 30) return { level: 'ok', label: 'Op schema', clock: formatClock(remainingMs), detail: 'Resterend tot eerste klantcontact', remainingMs, stopped: false }
  if (min > 10) return { level: 'warn', label: 'Let op', clock: formatClock(remainingMs), detail: 'Resterend tot eerste klantcontact', remainingMs, stopped: false }
  return { level: 'critical', label: 'Kritiek', clock: formatClock(remainingMs), detail: 'Resterend tot eerste klantcontact', remainingMs, stopped: false }
}

export function formatClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
