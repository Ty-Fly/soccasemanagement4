import { NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../../auth/AuthContext'
import { getDb } from '../../api/mock/db'
import { TenantLogo } from '../../components/ui'

export default function PortalShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  // Alleen de eigen klant; nergens andere klantnamen (US-01 AC 3)
  const tenant = getDb().tenants.find((t) => t.id === user.tenantId)
  return (
    <div className="portal-shell">
      <header className="portal-top">
        <div className="portal-top-inner">
          <div className="row" style={{ gap: 10, color: '#fff' }}>
            <TenantLogo tenant={tenant} size="sm" />
            <div style={{ lineHeight: 1.2 }}>
              <b>{tenant?.name ?? 'Klantportaal'}</b>
              <div className="small" style={{ color: 'var(--ink-text)' }}>Klantportaal security-incidenten</div>
            </div>
          </div>
          <nav aria-label="Portaalmenu">
            <NavLink to="/portal" end>Mijn incidenten</NavLink>
            <NavLink to="/portal/meldingen">Meldingen</NavLink>
          </nav>
          <div className="row" style={{ marginLeft: 'auto' }}>
            <span className="small">{user.name}</span>
            <button className="rail-button" onClick={() => { signOut(); navigate('/login') }}>Uitloggen</button>
          </div>
        </div>
      </header>
      <main className="portal-main" id="main">
        <Outlet />
      </main>
    </div>
  )
}
