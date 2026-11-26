// 24/7-rooster: dag 07–15, avond 15–23, nacht 23–07 (lokale tijd)
const SHIFTS = [
  { name: 'Dagdienst', start: 7, end: 15 },
  { name: 'Avonddienst', start: 15, end: 23 },
  { name: 'Nachtdienst', start: 23, end: 31 },
]

export function currentShift(date = new Date()) {
  const d = new Date(date)
  let h = d.getHours()
  const base = new Date(d)
  base.setMinutes(0, 0, 0)
  if (h < 7) {
    base.setDate(base.getDate() - 1)
    h += 24
  }
  const s = SHIFTS.find((x) => h >= x.start && h < x.end)
  const startsAt = new Date(base)
  startsAt.setHours(s.start)
  const endsAt = new Date(base)
  endsAt.setHours(s.end)
  return { name: s.name, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() }
}

export function previousShift(date = new Date()) {
  const cur = currentShift(date)
  return currentShift(new Date(new Date(cur.startsAt).getTime() - 60_000))
}
