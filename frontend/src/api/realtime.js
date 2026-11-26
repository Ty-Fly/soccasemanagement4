// Realtime-laag. Eventnamen zijn gelijk aan backend/Hubs/SocHubEvents.cs,
// zodat dit later 1-op-1 op SignalR (@microsoft/signalr, /hubs/soc) kan.
//
// In mock-modus gebruiken we een BroadcastChannel: wijzigingen in de ene tab
// (bijv. analist) komen binnen 5 sec in een andere tab (bijv. klantportaal).
export const EVENTS = {
  AlertReceived: 'AlertReceived',
  AlertClosed: 'AlertClosed',
  AlertPromoted: 'AlertPromoted',
  AlertLinked: 'AlertLinked',
  CaseCreated: 'CaseCreated',
  CaseClosed: 'CaseClosed',
  CaseAssigned: 'CaseAssigned',
  CaseUpdated: 'CaseUpdated',
  MessageReceived: 'MessageReceived',
  HandoverUpdated: 'HandoverUpdated',
  UsersChanged: 'UsersChanged',
}

const listeners = new Set()
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('soc-realtime') : null

channel?.addEventListener('message', (e) => {
  const { name, payload } = e.data || {}
  dispatch(name, payload, true)
})

function dispatch(name, payload, remote) {
  for (const listener of listeners) listener(name, payload, remote)
}

export function emit(name, payload = {}) {
  dispatch(name, payload, false)
  channel?.postMessage({ name, payload })
}

// Luister naar alle events. Geeft een unsubscribe-functie terug.
export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
