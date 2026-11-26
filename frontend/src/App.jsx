import { Routes, Route, Navigate } from 'react-router'
import { useAuth } from './auth/AuthContext'
import AppShell from './components/AppShell'
import RequireRole from './components/RequireRole'
import LoginPage from './pages/LoginPage'
import { homeFor } from './lib/routes'
import SetupTwoFactorPage from './pages/SetupTwoFactorPage'
import AlertsPage from './pages/AlertsPage'
import CasesPage from './pages/CasesPage'
import CaseDetailPage from './pages/CaseDetailPage'
import HandoverPage from './pages/HandoverPage'
import EngineeringPage from './pages/EngineeringPage'
import ManagementPage from './pages/ManagementPage'
import AccountsPage from './pages/AccountsPage'
import PortalShell from './pages/portal/PortalShell'
import PortalCasesPage from './pages/portal/PortalCasesPage'
import PortalCaseDetail from './pages/portal/PortalCaseDetail'
import NotificationsPage from './pages/portal/NotificationsPage'

function Home() {
  const { user } = useAuth()
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />
}

const guard = (permission, element) => <RequireRole permission={permission}>{element}</RequireRole>

function App() {
  const { user } = useAuth()
  const employee = user && user.role !== 'Client'

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={user ? <Home /> : <LoginPage />} />
      <Route path="/setup-2fa" element={<SetupTwoFactorPage />} />

      {/* SOC-medewerkers */}
      <Route element={employee ? <AppShell /> : <Home />}>
        <Route path="/alerts" element={guard('alerts', <AlertsPage />)} />
        <Route path="/cases" element={guard('cases', <CasesPage />)} />
        <Route path="/cases/:id" element={guard('cases', <CaseDetailPage />)} />
        <Route path="/overdracht" element={guard('handover', <HandoverPage />)} />
        <Route path="/engineering" element={guard('engineering', <EngineeringPage />)} />
        <Route path="/management" element={guard('management', <ManagementPage />)} />
        <Route path="/accounts" element={guard('accounts', <AccountsPage />)} />
      </Route>

      {/* Klantportaal */}
      <Route element={guard('portal', <PortalShell />)}>
        <Route path="/portal" element={<PortalCasesPage />} />
        <Route path="/portal/cases/:id" element={<PortalCaseDetail />} />
        <Route path="/portal/meldingen" element={<NotificationsPage />} />
      </Route>

      <Route path="*" element={<Home />} />
    </Routes>
  )
}

export default App
