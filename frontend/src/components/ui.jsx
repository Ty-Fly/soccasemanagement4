// Kleine herbruikbare onderdelen
import { useEffect, useRef } from 'react'
import { SEVERITY_LABELS, ALERT_STATUS_LABELS, nistLabel } from '../lib/format'
import { slaState } from '../lib/sla'
import { useNow } from '../lib/hooks'

export function SeverityBadge({ severity }) {
  return <span className={`badge sev-${severity}`}>{SEVERITY_LABELS[severity] ?? severity}</span>
}

export function AlertStatusBadge({ status }) {
  const tone = status === 'Open' ? 'st-action' : status === 'FalsePositive' ? 'st-neutral' : 'st-ok'
  return <span className={`badge ${tone}`}>{ALERT_STATUS_LABELS[status] ?? status}</span>
}

export function NistBadge({ status }) {
  const tone = status === 'Gesloten' ? 'st-neutral' : status === 'DetectieEnAnalyse' ? 'st-action' : 'st-ok'
  return <span className={`badge plain ${tone}`}>{nistLabel(status)}</span>
}

// SLA-indicator met kleur, cijfers én tekstlabel (NFR-04 / WCAG 1.4.1)
export function SlaChip({ caseItem }) {
  const now = useNow()
  if (caseItem.status === 'Gesloten' && !caseItem.firstResponseAt) return <span className="muted">–</span>
  const s = slaState(caseItem, now)
  return (
    <span className={`sla ${s.level}`} title={s.detail}>
      <span className="sla-dot" aria-hidden="true" />
      <span className="sla-clock">{s.clock}</span>
      <span className="sla-label">{s.label}</span>
    </span>
  )
}

export function TenantLogo({ tenant, size }) {
  if (!tenant) return null
  return (
    <span className={`tenant-logo ${size === 'sm' ? 'sm' : ''}`} style={{ background: tenant.color }} aria-hidden="true">
      {tenant.initials}
    </span>
  )
}

export function Avatar({ name }) {
  const initials = (name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  return <span className="avatar" aria-hidden="true">{initials}</span>
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  )
}

export function ErrorBox({ error }) {
  if (!error) return null
  return <div className="alert-box error" role="alert">{typeof error === 'string' ? error : error.message}</div>
}

export function Loading() {
  return <div className="empty">Laden…</div>
}

export function Modal({ title, onClose, children, footer }) {
  const ref = useRef(null)
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    ref.current?.querySelector('input, select, textarea, button')?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-head"><h2>{title}</h2></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

// Ringdiagram, bijv. true vs false positives
export function Donut({ parts, size = 120, label }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1
  const r = 46
  const c = 2 * Math.PI * r
  const segments = parts.reduce((acc, p) => {
    const start = acc.length ? acc[acc.length - 1].end : 0
    const len = (p.value / total) * c
    return [...acc, { ...p, len, start, end: start + len }]
  }, [])
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={label}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--line-soft)" strokeWidth="16" />
      {segments.map((p) => (
        <circle key={p.name} cx="60" cy="60" r={r} fill="none" stroke={p.color} strokeWidth="16"
          strokeDasharray={`${p.len} ${c - p.len}`} strokeDashoffset={-p.start} transform="rotate(-90 60 60)" />
      ))}
      <text x="60" y="58" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--text)">{Math.round((parts[0].value / total) * 100)}%</text>
      <text x="60" y="76" textAnchor="middle" fontSize="10" fill="var(--muted)">{parts[0].name}</text>
    </svg>
  )
}
