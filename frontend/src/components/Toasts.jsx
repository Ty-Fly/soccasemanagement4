import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { subscribe, EVENTS } from '../api/realtime'
import { useAuth } from '../auth/AuthContext'
import { SEVERITY_LABELS } from '../lib/format'

const ToastContext = createContext(() => {})

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const { user } = useAuth()

  const push = useCallback((toast) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t.slice(-3), { id, ...toast }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), toast.duration ?? 6000)
  }, [])

  // Realtime meldingen
  useEffect(
    () =>
      subscribe((name, p, remote) => {
        if (!user || !remote) return
        const employee = user.role !== 'Client'
        if (name === EVENTS.AlertReceived && employee && ['Critical', 'High'].includes(p.severity)) {
          push({ title: `Nieuwe alert: ${SEVERITY_LABELS[p.severity]}`, text: 'Er staat een nieuwe melding bovenaan de wachtrij.', to: '/alerts', crit: p.severity === 'Critical' })
        }
        // US-26 AC 2: nieuw klantbericht geeft een melding bij de behandelaar
        if (name === EVENTS.MessageReceived && p.fromClient && employee && (p.assignedToUserId === user.userId || !p.assignedToUserId)) {
          push({ title: `Nieuw bericht van de klant in case #${p.caseId}`, to: `/cases/${p.caseId}?tab=chat` })
        }
        if (name === EVENTS.MessageReceived && !p.fromClient && !employee && p.tenantId === user.tenantId) {
          push({ title: `Nieuw bericht van het SOC in case #${p.caseId}`, to: `/portal/cases/${p.caseId}` })
        }
        if (name === EVENTS.CaseUpdated && p.status && !employee) {
          push({ title: `Case #${p.caseId} heeft een nieuwe status`, to: `/portal/cases/${p.caseId}` })
        }
      }),
    [user, push],
  )

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.crit ? 'crit' : ''}`}>
            <div className="toast-text">
              <b>{t.title}</b>
              {t.text && <span>{t.text} </span>}
              {t.to && <Link to={t.to} onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>Bekijken</Link>}
            </div>
            <button aria-label="Melding sluiten" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
