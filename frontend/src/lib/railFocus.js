// Laat de zijbalk de SLA-timer van de geopende case tonen (US-14 AC 4:
// de timer staat links op een vaste positie en blijft zichtbaar op ieder case-scherm).
import { useSyncExternalStore } from 'react'

let focused = null
const listeners = new Set()

export function setRailFocus(caseItem) {
  focused = caseItem
  for (const l of listeners) l()
}

export function useRailFocus() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => focused,
  )
}
