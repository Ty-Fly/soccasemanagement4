// Layout voor medewerkers: links een vaste balk met navigatie, statistieken en de
// SLA-timer van de meest urgente case (schermontwerpen: links altijd in beeld).
import { NavLink, Link, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { can, ROLE_LABELS } from '../config'
import { listAlerts } from '../api/alerts'
import { listCases } from '../api/cases'
import { useNow, useQuery } from '../lib/hooks'
import { slaState } from '../lib/sla'
import { Avatar } from './ui'
import { useRailFocus } from '../lib/railFocus'
import DemoPanel from './DemoPanel'
import Logo from './Logo'

function RailSla({ cases }) {
  const now = useNow()
  const focused = useRailFocus()
  if (focused) return <RailCaseSla caseItem={focused} now={now} />
  const running = (cases || [])
    .filter((c) => !c.firstResponseAt && c.status !== 'Gesloten')
    .sort((a, b) => new Date(a.slaDeadlineAt) - new Date(b.slaDeadlineAt))
  const next = running[0]
  if (!next) {
    return (
      <div className="sla-rail none">
        <div className="sla-rail-label">Eerstvolgende SLA</div>
        <div className="sla-rail-state" style={{ marginTop: 6 }}>Geen lopende timers</div>
        <div className="sla-rail-case">Alle open cases hebben al een eerste klantreactie.</div>
      </div>
    )
  }
  const s = slaState(next, now)
  const pct = Math.max(0, Math.min(100, (s.remainingMs / 3_600_000) * 100))
  return (
    <Link to={`/cases/${next.id}`} className={`sla-rail ${s.level}`} aria-label={`Eerstvolgende SLA: case ${next.id}, ${s.label}, ${s.clock}`}>
      <div className="sla-rail-label">Eerstvolgende SLA{running.length > 1 ? ` (nog ${running.length - 1} lopend)` : ''}</div>
      <div className="sla-rail-clock">{s.clock}</div>
      <div className="sla-rail-state">{s.label}</div>
      <div className="sla-rail-case">#{next.id} {next.title}<br />{next.tenantName}</div>
      <div className="sla-rail-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
    </Link>
  )
}

function RailCaseSla({ caseItem, now }) {
  const s = slaState(caseItem, now)
  const pct = s.stopped ? 100 : Math.max(0, Math.min(100, (s.remainingMs / 3_600_000) * 100))
  return (
    <div className={`sla-rail ${s.stopped ? 'none' : s.level}`} role="timer" aria-label={`SLA van deze case: ${s.label}, ${s.clock}`}>
      <div className="sla-rail-label">SLA van deze case</div>
      <div className="sla-rail-clock">{s.clock}</div>
      <div className="sla-rail-state">{s.label}</div>
      <div className="sla-rail-case">{s.detail}</div>
      <div className="sla-rail-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

export default function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const alerts = useQuery(() => (can(user.role, 'alerts') ? listAlerts({ status: 'Open' }) : Promise.resolve([])), [user.role])
  const cases = useQuery(() => listCases(), [])
  const openAlerts = alerts.data?.length ?? 0
  const openCases = cases.data?.length ?? 0
  const mine = cases.data?.filter((c) => c.assignedToUserId === user.userId).length ?? 0

  const links = [
    can(user.role, 'alerts') && { to: '/alerts', label: 'Alerts', count: openAlerts },
    can(user.role, 'cases') && { to: '/cases', label: 'Cases', count: openCases },
    can(user.role, 'handover') && { to: '/overdracht', label: 'Overdracht' },
    can(user.role, 'engineering') && { to: '/engineering', label: 'Detectieregels' },
    can(user.role, 'management') && { to: '/management', label: 'Management' },
    can(user.role, 'accounts') && { to: '/accounts', label: 'Accounts' },
  ].filter(Boolean)

  return (
    <div className="shell">
      <aside className="rail">
        <Link to="/" className="brand">
          <Logo />
        </Link>

        <nav aria-label="Hoofdmenu">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to}>
              <span>{l.label}</span>
              {l.count !== undefined && <span className="count">{l.count}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="rail-section">
          <RailSla cases={cases.data} />
          <div className="rail-stats">
            <div className="rail-stat"><b>{openAlerts}</b><span>open alerts</span></div>
            <div className="rail-stat"><b>{mine}</b><span>mijn cases</span></div>
          </div>
        </div>

        <div className="rail-footer">
          <div className="who">
            <Avatar name={user.name} />
            <div>
              <div className="who-name">{user.name}</div>
              <div className="who-role">{ROLE_LABELS[user.role] ?? user.role}</div>
            </div>
          </div>
          <div className="rail-buttons">
            <button className="rail-button" onClick={() => { signOut(); navigate('/login') }}>Uitloggen</button>
          </div>
        </div>
      </aside>
      <DemoPanel />
      <main className="main" id="main">
        <Outlet />
      </main>
    </div>
  )
}
